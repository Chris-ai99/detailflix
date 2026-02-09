import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { prisma } from "@/lib/prisma";
import { buildPrivacyAgreementPdfDocument } from "./PdfTemplate";

export const runtime = "nodejs";

function splitName(fullName?: string | null): { firstName: string; lastName: string } {
  const name = (fullName || "").trim();
  if (!name) return { firstName: "", lastName: "" };
  const parts = name.split(/\s+/);
  if (parts.length === 1) return { firstName: parts[0], lastName: "" };
  return { firstName: parts[0], lastName: parts.slice(1).join(" ") };
}

function combineVehicleLabel(make?: string | null, model?: string | null): string {
  return [make, model].map((v) => (v || "").trim()).filter(Boolean).join(" ");
}

function defaultPlaceDate(city?: string | null): string {
  const date = new Date().toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
  const place = (city || "").trim();
  return place ? `${place}, ${date}` : date;
}

function safeFilePart(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+/, "")
    .replace(/-+$/, "")
    .slice(0, 40);
}

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (!id) return new NextResponse("Missing customer id", { status: 400 });

  const [customer, settings, latestVehicle] = await Promise.all([
    prisma.customer.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        isBusiness: true,
        companyName: true,
        contactFirstName: true,
        contactLastName: true,
        contactUseZh: true,
        street: true,
        zip: true,
        city: true,
        email: true,
        phone: true,
      },
    }),
    prisma.companySettings.findUnique({ where: { id: "default" } }),
    prisma.vehicle.findFirst({
      where: { customerId: id },
      orderBy: { updatedAt: "desc" },
      select: {
        make: true,
        model: true,
        vin: true,
      },
    }),
  ]);

  if (!customer) return new NextResponse("Customer not found", { status: 404 });

  const split = splitName(customer.name);
  const customerCompany = (customer.companyName || (customer.isBusiness ? customer.name : "") || "").trim();
  const firstName = (customer.contactFirstName || (!customer.isBusiness ? split.firstName : "")).trim();
  const lastName = (customer.contactLastName || (!customer.isBusiness ? split.lastName : "")).trim();
  const contactPrefix =
    customer.contactUseZh && (firstName || lastName) ? "z. H. " : "";
  const contactCombined = [firstName, lastName].filter(Boolean).join(" ").trim();
  const vehicleName = combineVehicleLabel(latestVehicle?.make, latestVehicle?.model);

  const company = {
    name: (settings?.companyName || "Unternehmen").trim(),
    ownerName: (settings?.ownerName || "").trim(),
    street: (settings?.street || "").trim(),
    zip: (settings?.zip || "").trim(),
    city: (settings?.city || "").trim(),
    phone: (settings?.phone || "").trim(),
    email: (settings?.email || "").trim(),
    logoDataUrl: (settings?.logoDataUrl || "").trim(),
  };

  const pdfBuffer = await renderToBuffer(
    buildPrivacyAgreementPdfDocument({
      company,
      customer: {
        firstName,
        lastName,
        company: [customerCompany, contactPrefix ? `${contactPrefix}${contactCombined}` : ""]
          .filter(Boolean)
          .join(", "),
        street: (customer.street || "").trim(),
        postalCode: (customer.zip || "").trim(),
        city: (customer.city || "").trim(),
        email: (customer.email || "").trim(),
        phone: (customer.phone || "").trim(),
        vehicle: vehicleName,
        plate: (latestVehicle?.vin || "").trim(),
      },
      placeDate: defaultPlaceDate(company.city || customer.city),
      accepted: false,
    })
  );

  const search = new URL(req.url).searchParams;
  const disposition = search.get("download") === "1" ? "attachment" : "inline";
  const baseFilePart = safeFilePart(customer.name || customer.id) || customer.id;
  const fileName = `datenschutzvereinbarung-${baseFilePart}.pdf`;

  return new NextResponse(new Uint8Array(pdfBuffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${disposition}; filename="${fileName}"`,
      "Cache-Control": "no-store",
    },
  });
}
