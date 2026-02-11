"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eurosToCents } from "@/lib/money";

export async function updateCompanySettings(formData: FormData) {
  const companyName = String(formData.get("companyName") ?? "").trim();
  if (!companyName) throw new Error("Firmenname ist Pflicht");

  const ownerName = String(formData.get("ownerName") ?? "").trim() || null;
  const street = String(formData.get("street") ?? "").trim() || null;
  const zip = String(formData.get("zip") ?? "").trim() || null;
  const city = String(formData.get("city") ?? "").trim() || null;
  const phone = String(formData.get("phone") ?? "").trim() || null;
  const email = String(formData.get("email") ?? "").trim() || null;
  const website = String(formData.get("website") ?? "").trim() || null;
  const bankName = String(formData.get("bankName") ?? "").trim() || null;
  const iban = String(formData.get("iban") ?? "").trim() || null;
  const bic = String(formData.get("bic") ?? "").trim() || null;
  const vatId = String(formData.get("vatId") ?? "").trim() || null;
  const noticeRed = String(formData.get("noticeRed") ?? "").trim() || null;
  const workCardAwMinutesRaw = String(formData.get("workCardAwMinutes") ?? "").trim();
  const workCardHourlyRateRaw = String(formData.get("workCardHourlyRate") ?? "").trim();

  const workCardAwMinutesParsed = Number(workCardAwMinutesRaw || "10");
  const workCardAwMinutes =
    Number.isFinite(workCardAwMinutesParsed) && workCardAwMinutesParsed > 0
      ? Math.min(120, Math.max(1, Math.trunc(workCardAwMinutesParsed)))
      : 10;

  const workCardHourlyRateCents = Math.max(0, eurosToCents(workCardHourlyRateRaw || "60"));
  if (workCardHourlyRateCents <= 0) {
    throw new Error("Stundensatz muss groesser als 0 sein");
  }

  const nextInvoiceSeqRaw = String(formData.get("nextInvoiceSeq") ?? "").trim();
  const nextInvoiceSeq = nextInvoiceSeqRaw ? Number(nextInvoiceSeqRaw) : null;

  const clearLogo = formData.get("clearLogo") === "on";
  const logoFile = formData.get("logo") as File | null;

  let logoDataUrl: string | null | undefined = undefined;

  if (clearLogo) {
    logoDataUrl = null;
  } else if (logoFile && typeof logoFile === "object" && "arrayBuffer" in logoFile && logoFile.size > 0) {
    // Basic size guard (2MB)
    if (logoFile.size > 2 * 1024 * 1024) {
      throw new Error("Logo ist zu groß (max. 2MB)");
    }
    const buf = Buffer.from(await logoFile.arrayBuffer());
    const mime = logoFile.type || "image/png";
    logoDataUrl = `data:${mime};base64,${buf.toString("base64")}`;
  }

  await prisma.companySettings.upsert({
    where: { id: "default" },
    update: {
      companyName,
      ownerName,
      street,
      zip,
      city,
      phone,
      email,
      website,
      bankName,
      iban,
      bic,
      vatId,
      noticeRed,
      workCardAwMinutes,
      workCardHourlyRateCents,
      ...(logoDataUrl === undefined ? {} : { logoDataUrl }),
    },
    create: {
      id: "default",
      companyName,
      ownerName,
      street,
      zip,
      city,
      phone,
      email,
      website,
      bankName,
      iban,
      bic,
      vatId,
      noticeRed,
      workCardAwMinutes,
      workCardHourlyRateCents,
      logoDataUrl: logoDataUrl ?? null,
    },
  });

  // Optional: Rechnungsnummernkreis anpassen (für aktuelles Jahr)
  if (nextInvoiceSeq != null) {
    if (!Number.isFinite(nextInvoiceSeq) || nextInvoiceSeq < 1) {
      throw new Error("Nächste Rechnungsnummer ist ungültig");
    }

    const year = new Date().getFullYear();
    const existing = await prisma.documentCounter.findUnique({
      where: { docType_year: { docType: "INVOICE", year } },
      select: { lastSeq: true },
    });
    const currentNext = (existing?.lastSeq ?? 0) + 1;

    if (nextInvoiceSeq < currentNext) {
      throw new Error(
        `Nächste Rechnungsnummer darf nicht kleiner als ${currentNext} sein (aktuell)`
      );
    }

    await prisma.documentCounter.upsert({
      where: { docType_year: { docType: "INVOICE", year } },
      update: { lastSeq: Math.floor(nextInvoiceSeq) - 1 },
      create: {
        docType: "INVOICE",
        year,
        lastSeq: Math.floor(nextInvoiceSeq) - 1,
      },
    });
  }

  revalidatePath("/settings");
  // PDFs verwenden die Settings -> invalidate
  revalidatePath("/dashboard");
  revalidatePath("/invoices");

  // Force a fresh server render (also resets file input / checkbox state)
  redirect("/settings");
}
