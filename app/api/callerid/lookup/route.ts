import { NextRequest, NextResponse } from "next/server";
import { verifyAuthSession } from "@/lib/auth-session";
import { getPublicBaseUrl } from "@/lib/public-base-url";
import { getWorkspacePrismaClient } from "@/lib/workspace-prisma";

export const runtime = "nodejs";

type CustomerLookupRecord = {
  id: string;
  name: string | null;
  companyName: string | null;
  contactFirstName: string | null;
  contactLastName: string | null;
  isBusiness: boolean;
  notes: string | null;
  phone: string | null;
};

function extractBearerToken(value: string | null): string | null {
  if (!value) return null;
  const normalized = value.trim();
  if (!normalized.toLowerCase().startsWith("bearer ")) return null;
  const token = normalized.slice(7).trim();
  return token || null;
}

function digitsOnly(value: string): string {
  return value.replace(/\D+/g, "");
}

function normalizePhoneBestEffort(raw: string | null, defaultCountryCode: string): string | null {
  const source = String(raw ?? "").trim();
  if (!source) return null;

  const hasLeadingPlus = source.startsWith("+");
  const digits = digitsOnly(source);
  if (!digits) return null;

  const countryDigits = digitsOnly(defaultCountryCode || "+49");
  const normalized = (() => {
    if (hasLeadingPlus) return `+${digits}`;
    if (source.startsWith("00")) return `+${digits.slice(2)}`;
    if (source.startsWith("0")) {
      if (!countryDigits) return null;
      return `+${countryDigits}${digits.slice(1)}`;
    }
    if (!countryDigits) return null;
    return `+${countryDigits}${digits}`;
  })();

  if (!normalized || normalized.length < 7) return null;
  return normalized;
}

function isLikelyE164(value: string): boolean {
  return /^\+[1-9]\d{6,14}$/.test(value);
}

function pickDisplayName(customer: CustomerLookupRecord): string {
  const company = customer.companyName?.trim();
  if (company) return company;

  const first = customer.contactFirstName?.trim() || "";
  const last = customer.contactLastName?.trim() || "";
  const contactName = `${first} ${last}`.trim();
  if (contactName) return contactName;

  const legacyName = customer.name?.trim();
  if (legacyName) return legacyName;

  return "Unbekannt";
}

function sanitizeNote(value: string | null): string | null {
  const note = String(value ?? "").trim();
  if (!note) return null;
  return note.length > 240 ? `${note.slice(0, 237)}...` : note;
}

export async function GET(req: NextRequest) {
  const token = extractBearerToken(req.headers.get("authorization"));
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const session = await verifyAuthSession(token);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const e164Raw = req.nextUrl.searchParams.get("e164");
  const defaultCountryCode = req.nextUrl.searchParams.get("defaultCountryCode")?.trim() || "+49";
  const normalizedE164 = normalizePhoneBestEffort(e164Raw, defaultCountryCode);

  if (!normalizedE164 || !isLikelyE164(normalizedE164)) {
    return NextResponse.json(
      { error: "Invalid query parameter 'e164'" },
      { status: 400 }
    );
  }

  const prisma = getWorkspacePrismaClient(session.workspaceId);
  const digits = digitsOnly(normalizedE164);
  const tail = digits.slice(-7);

  const candidates = await prisma.customer.findMany({
    where: {
      phone: tail ? { contains: tail } : { not: null },
    },
    select: {
      id: true,
      name: true,
      companyName: true,
      contactFirstName: true,
      contactLastName: true,
      isBusiness: true,
      notes: true,
      phone: true,
    },
    take: 300,
  });

  const match = candidates.find((customer) => {
    return normalizePhoneBestEffort(customer.phone, defaultCountryCode) === normalizedE164;
  });

  if (!match) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const baseUrl = getPublicBaseUrl(req);
  const customerId = encodeURIComponent(match.id);
  const displayName = pickDisplayName(match);

  return NextResponse.json({
    customer_id: match.id,
    display_name: displayName,
    company: match.companyName?.trim() || null,
    tags: match.isBusiness ? ["B2B"] : [],
    last_note: sanitizeNote(match.notes),
    deep_links: {
      customer: `${baseUrl}/customers/${customerId}`,
      new_order: `${baseUrl}/orders/new?customerId=${customerId}`,
    },
  });
}
