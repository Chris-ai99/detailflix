"use server";

import { CustomerAttachmentKind } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSessionFromCookies } from "@/lib/auth";
import { storeCustomerAttachmentFile } from "@/lib/customer-attachments";

function sanitize(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function todayTag() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}${m}${d}`;
}

function buildSignedAgreementHtml(input: {
  company: {
    name: string;
    ownerName: string;
    street: string;
    zip: string;
    city: string;
    phone: string;
    email: string;
    logoDataUrl: string;
  };
  customer: {
    firstName: string;
    lastName: string;
    company: string;
    street: string;
    zipCity: string;
    email: string;
    phone: string;
    vehicle: string;
    plate: string;
  };
  placeDate: string;
  signatureDataUrl: string;
}): string {
  const c = input.company;
  const p = input.customer;
  const nowIso = new Date().toISOString();

  return `<!doctype html>
<html lang="de">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Datenschutzvereinbarung (signiert)</title>
    <style>
      body { font-family: Arial, sans-serif; margin: 24px; color: #111; line-height: 1.4; }
      .head { display: flex; justify-content: space-between; gap: 24px; margin-bottom: 24px; }
      .logo { max-width: 220px; max-height: 100px; object-fit: contain; }
      h1 { font-size: 32px; margin: 0 0 8px 0; }
      h2 { font-size: 20px; margin: 14px 0 8px; text-decoration: underline; }
      .red { color: #c10000; font-size: 20px; font-weight: 700; margin: 8px 0 18px; }
      .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px 20px; margin: 12px 0 18px; }
      .line { border-bottom: 1px solid #444; min-height: 28px; padding-top: 6px; }
      .label { font-weight: 700; margin-bottom: 4px; }
      .small { font-size: 12px; }
      .center { text-align: center; }
      .signature { margin-top: 36px; border-top: 1px solid #333; padding-top: 8px; max-width: 360px; }
      .signature img { max-width: 100%; max-height: 140px; }
      .muted { color: #555; font-size: 12px; margin-top: 20px; }
    </style>
  </head>
  <body>
    <div class="head">
      <div>
        <div><strong>${sanitize(c.name)}</strong></div>
        <div>${sanitize(c.street)}</div>
        <div>${sanitize(`${c.zip} ${c.city}`.trim())}</div>
        <div>${sanitize(c.phone)}</div>
        <div>${sanitize(c.email)}</div>
      </div>
      <div class="center">
        ${
          c.logoDataUrl
            ? `<img src="${sanitize(c.logoDataUrl)}" alt="Firmenlogo" class="logo" />`
            : ""
        }
        <div style="margin-top: 6px; font-size: 18px; letter-spacing: 1px;">${sanitize(c.name)}</div>
      </div>
    </div>

    <h2>Datenschutzerklaerung / Einverstaendniserklaerung Nutzung von Fotos</h2>
    <div class="red">Bitte leserlich und in Druckschrift schreiben</div>

    <div class="label">Persoenliche Informationen:</div>
    <div class="grid">
      <div><div class="small">Vorname</div><div class="line">${sanitize(p.firstName)}</div></div>
      <div><div class="small">Nachname</div><div class="line">${sanitize(p.lastName)}</div></div>
      <div style="grid-column: 1 / -1;"><div class="small">Unternehmen</div><div class="line">${sanitize(p.company)}</div></div>
      <div><div class="small">Strasse, Nr.</div><div class="line">${sanitize(p.street)}</div></div>
      <div><div class="small">PLZ, Ort</div><div class="line">${sanitize(p.zipCity)}</div></div>
      <div><div class="small">E-Mail</div><div class="line">${sanitize(p.email)}</div></div>
      <div><div class="small">Telefon</div><div class="line">${sanitize(p.phone)}</div></div>
      <div><div class="small">Fahrzeug</div><div class="line">${sanitize(p.vehicle)}</div></div>
      <div><div class="small">Kennzeichen</div><div class="line">${sanitize(p.plate)}</div></div>
    </div>

    <div class="center"><strong>Einverstaendniserklaerung zur Nutzung von Fotos des Fahrzeugs</strong></div>
    <p class="small">
      Ich gewaehre hiermit dem auf diesem Dokument genannten Unternehmen das uneingeschraenkte und
      unwiderrufliche Recht und die Erlaubnis, Fotos zu machen und diese fuer Dokumentation, Werbung,
      Veroeffentlichung und Praesentation zu verwenden.
    </p>

    <div class="center"><strong>Datenschutzerklaerung</strong></div>
    <p class="small">
      Personenbezogene Daten werden ausschliesslich zur Vertragserfuellung, Kundenkommunikation, Terminplanung,
      Rechnungsstellung und gesetzlicher Pflichten verarbeitet. Es gelten die Regelungen der DSGVO.
    </p>

    <div style="margin-top: 24px;"><strong>Akzeptiert am:</strong> ${sanitize(input.placeDate)}</div>
    <div class="signature">
      <div><strong>Digitale Unterschrift Kunde</strong></div>
      <img src="${sanitize(input.signatureDataUrl)}" alt="Unterschrift" />
    </div>
    <div class="muted">Digital signiert und gespeichert am ${sanitize(nowIso)}</div>
  </body>
</html>`;
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
  const zipCity = String(formData.get("zipCity") || "").trim();
  const email = String(formData.get("email") || "").trim();
  const phone = String(formData.get("phone") || "").trim();
  const vehicle = String(formData.get("vehicle") || "").trim();
  const plate = String(formData.get("plate") || "").trim();
  const placeDate = String(formData.get("placeDate") || "").trim();

  const html = buildSignedAgreementHtml({
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
      zipCity,
      email,
      phone,
      vehicle,
      plate,
    },
    placeDate,
    signatureDataUrl,
  });

  const fileDate = todayTag();
  const title = `Datenschutzvereinbarung signiert ${fileDate}`;
  const fileBuffer = Buffer.from(html, "utf8");
  const { storagePath } = await storeCustomerAttachmentFile({
    workspaceId: session.workspaceId,
    customerId,
    originalName: `datenschutz-signiert-${fileDate}.html`,
    content: fileBuffer,
  });

  await prisma.customerAttachment.create({
    data: {
      customerId,
      kind: CustomerAttachmentKind.PRIVACY_AGREEMENT_SIGNED,
      title,
      mimeType: "text/html; charset=utf-8",
      sizeBytes: fileBuffer.length,
      storagePath,
    },
  });

  revalidatePath(`/customers/${customerId}`);
  redirect(`/customers/${customerId}?saved=privacy`);
}
