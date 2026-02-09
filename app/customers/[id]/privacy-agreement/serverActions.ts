"use server";

import { CustomerAttachmentKind } from "@prisma/client";
import { renderToBuffer } from "@react-pdf/renderer";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSessionFromCookies } from "@/lib/auth";
import { storeCustomerAttachmentFile } from "@/lib/customer-attachments";
import { buildPrivacyAgreementPdfDocument } from "../../../api/customers/[id]/privacy-agreement/pdf/PdfTemplate";

function todayTag() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}${m}${d}`;
}

export async function saveSignedPrivacyAgreement(formData: FormData) {
  const customerId = String(formData.get("customerId") || "").trim();
  if (!customerId) throw new Error("Kunde fehlt");

  const accepted = String(formData.get("accepted") || "") === "on";
  if (!accepted) throw new Error("Bitte Zustimmung aktivieren");

  const signatureDataUrl = String(formData.get("signatureDataUrl") || "").trim();
  if (!signatureDataUrl.startsWith("data:image/png;base64,")) {
    throw new Error("Unterschrift fehlt");
  }

  const session = await getSessionFromCookies();
  if (!session) throw new Error("Nicht angemeldet");

  const customer = await prisma.customer.findUnique({
    where: { id: customerId },
    select: { id: true },
  });
  if (!customer) throw new Error("Kunde nicht gefunden");

  const companyName = String(formData.get("companyName") || "").trim() || "Unternehmen";
  const companyOwner = String(formData.get("companyOwner") || "").trim();
  const companyStreet = String(formData.get("companyStreet") || "").trim();
  const companyZip = String(formData.get("companyZip") || "").trim();
  const companyCity = String(formData.get("companyCity") || "").trim();
  const companyPhone = String(formData.get("companyPhone") || "").trim();
  const companyEmail = String(formData.get("companyEmail") || "").trim();
  const companyLogoDataUrl = String(formData.get("companyLogoDataUrl") || "").trim();

  const firstName = String(formData.get("firstName") || "").trim();
  const lastName = String(formData.get("lastName") || "").trim();
  const customerCompany = String(formData.get("customerCompany") || "").trim();
  const street = String(formData.get("street") || "").trim();
  const postalCode = String(formData.get("postalCode") || "").trim();
  const city = String(formData.get("city") || "").trim();
  const email = String(formData.get("email") || "").trim();
  const phone = String(formData.get("phone") || "").trim();
  const vehicle = String(formData.get("vehicle") || "").trim();
  const plate = String(formData.get("plate") || "").trim();
  const placeDate = String(formData.get("placeDate") || "").trim();

  const pdfBuffer = await renderToBuffer(
    buildPrivacyAgreementPdfDocument({
      company: {
        name: companyName,
        ownerName: companyOwner,
        street: companyStreet,
        zip: companyZip,
        city: companyCity,
        phone: companyPhone,
        email: companyEmail,
        logoDataUrl: companyLogoDataUrl,
      },
      customer: {
        firstName,
        lastName,
        company: customerCompany,
        street,
        postalCode,
        city,
        email,
        phone,
        vehicle,
        plate,
      },
      placeDate,
      accepted: true,
      signatureDataUrl,
      signedAtIso: new Date().toISOString(),
    })
  );

  const fileDate = todayTag();
  const title = `Datenschutzvereinbarung signiert ${fileDate}`;
  const { storagePath } = await storeCustomerAttachmentFile({
    workspaceId: session.workspaceId,
    customerId,
    originalName: `datenschutz-signiert-${fileDate}.pdf`,
    content: pdfBuffer,
  });

  await prisma.customerAttachment.create({
    data: {
      customerId,
      kind: CustomerAttachmentKind.PRIVACY_AGREEMENT_SIGNED,
      title,
      mimeType: "application/pdf",
      sizeBytes: pdfBuffer.length,
      storagePath,
    },
  });

  revalidatePath(`/customers/${customerId}`);
  redirect(`/customers/${customerId}?saved=privacy`);
}
