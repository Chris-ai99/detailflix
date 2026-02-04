"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { DocumentStatus } from "@prisma/client";

/* -----------------------------------------
 * Kunden
 * ----------------------------------------- */

// ✅ Kunden suchen (einfach & schnell)
export async function searchCustomers(query: string) {
  const q = (query ?? "").trim();

  if (!q) {
    return prisma.customer.findMany({
      take: 20,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        isBusiness: true,
        email: true,
        phone: true,
        street: true,
        zip: true,
        city: true,
        vatId: true,
      },
    });
  }

  return prisma.customer.findMany({
    take: 20,
    where: {
      OR: [
        { name: { contains: q } },
        { email: { contains: q } },
        { phone: { contains: q } },
        { city: { contains: q } },
      ],
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      isBusiness: true,
      email: true,
      phone: true,
      street: true,
      zip: true,
      city: true,
      vatId: true,
    },
  });
}

// ✅ Kunden anlegen
export async function createCustomer(input: {
  name: string;
  isBusiness?: boolean;
  email?: string | null;
  phone?: string | null;
  vatId?: string | null;
  street?: string | null;
  zip?: string | null;
  city?: string | null;
  notes?: string | null;
}) {
  const isBusiness = !!input.isBusiness;
  const nameRaw = (input.name ?? "").trim();
  if (!nameRaw && !isBusiness) throw new Error("Name ist Pflicht");
  const name = nameRaw || null;

  const customer = await prisma.customer.create({
    data: {
      name,
      isBusiness,
      email: input.email?.trim() || null,
      phone: input.phone?.trim() || null,
      vatId: input.vatId?.trim() || null,
      street: input.street?.trim() || null,
      zip: input.zip?.trim() || null,
      city: input.city?.trim() || null,
      notes: input.notes?.trim() || null,
    },
    select: { id: true },
  });

  return customer.id;
}

// ✅ Kunde ins Dokument setzen
export async function setDocumentCustomer(documentId: string, customerId: string | null) {
  await prisma.document.update({
    where: { id: documentId },
    data: { customerId: customerId || null, vehicleId: null },
  });

  revalidatePath(`/documents/${documentId}/edit`);
  revalidatePath("/invoices");
  revalidatePath("/offers");
}

/* -----------------------------------------
 * Fahrzeuge
 * ----------------------------------------- */

export async function searchVehicles(query: string, customerId?: string | null) {
  const q = (query ?? "").trim();
  const baseWhere: any = {
    isStock: false,
    isSold: false,
    ...(customerId ? { customerId } : {}),
  };

  if (!q) {
    return prisma.vehicle.findMany({
      take: 20,
      where: baseWhere,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        make: true,
        model: true,
        vin: true,
        year: true,
        mileage: true,
      },
    });
  }

  return prisma.vehicle.findMany({
    take: 20,
    where: {
      ...baseWhere,
      OR: [{ make: { contains: q } }, { model: { contains: q } }, { vin: { contains: q } }],
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      make: true,
      model: true,
      vin: true,
      year: true,
      mileage: true,
    },
  });
}

export async function createVehicle(input: {
  make?: string | null;
  model?: string | null;
  vin?: string | null;
  year?: number | null;
  mileage?: number | null;
  notes?: string | null;
  customerId?: string | null;
}) {
  const vehicle = await prisma.vehicle.create({
    data: {
      make: input.make?.trim() || null,
      model: input.model?.trim() || null,
      vin: input.vin?.trim() || null,
      year: input.year ?? null,
      mileage: input.mileage ?? null,
      notes: input.notes?.trim() || null,
      customerId: input.customerId || null,
      isStock: false,
    },
    select: { id: true },
  });

  return vehicle.id;
}

export async function setDocumentVehicle(documentId: string, vehicleId: string | null) {
  await prisma.document.update({
    where: { id: documentId },
    data: { vehicleId: vehicleId || null },
  });

  revalidatePath(`/documents/${documentId}/edit`);
  revalidatePath("/invoices");
  revalidatePath("/offers");
}

/* -----------------------------------------
 * Dokumente (Draft → Update → Final / Toggle)
 * ----------------------------------------- */

function formatDocNumber(
  docType: "OFFER" | "INVOICE" | "PURCHASE_CONTRACT" | "CREDIT_NOTE",
  year: number,
  seq: number
) {
  const prefix =
    docType === "OFFER"
      ? "ANG"
      : docType === "INVOICE"
        ? "RE"
        : docType === "CREDIT_NOTE"
          ? "GS"
          : "KV";
  const padded = String(seq).padStart(5, "0"); // z.B. 00001
  return `${prefix}-${year}-${padded}`;
}

// 1) Draft erstellen
export async function createDraftDocument(
  docType: "OFFER" | "INVOICE" | "PURCHASE_CONTRACT" | "CREDIT_NOTE"
) {
  const year = new Date().getFullYear();
  const draftCounter = await prisma.documentDraftCounter.upsert({
    where: { docType_year: { docType, year } },
    update: { lastSeq: { increment: 1 } },
    create: { docType, year, lastSeq: 1 },
    select: { lastSeq: true },
  });
  const draftNumber = `DR-${draftCounter.lastSeq}`;

  const doc = await prisma.document.create({
    data: {
      docType,
      docNumber: draftNumber,
      draftNumber,
      status: DocumentStatus.DRAFT,
      isFinal: false,
    },
    select: { id: true },
  });

  return doc.id;
}

// 2) Draft updaten (Allgemeine Daten)
export async function updateDocumentBasics(input: {
  id: string;
  issueDate?: Date | string;
  dueDate?: Date | string | null;
  validUntil?: Date | string | null;
  taxMode?: any; // TODO: typisieren
  depositCents?: number | null;
  notesPublic?: string | null;
  notesInternal?: string | null;
}) {
  const { id, issueDate, dueDate, validUntil, ...rest } = input;

  const parseDate = (value: Date | string | null | undefined) => {
    if (value === undefined) return undefined;
    if (value === null) return null;
    if (value instanceof Date) return value;
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  };

  await prisma.document.update({
    where: { id },
    data: {
      ...rest,
      issueDate: parseDate(issueDate),
      dueDate: parseDate(dueDate),
      validUntil: parseDate(validUntil),
    },
  });

  revalidatePath(`/documents/${id}/edit`);
  revalidatePath("/invoices");
  revalidatePath("/offers");
}

/**
 * 3a) Finalisieren (einmalig) – bleibt drin, falls du es irgendwo verwendest
 */
export async function finalizeDocument(id: string) {
  const doc = await prisma.document.findUnique({
    where: { id },
    select: { docType: true, isFinal: true, docNumber: true, draftNumber: true },
  });

  if (!doc) throw new Error("Dokument nicht gefunden");
  if (doc.isFinal) return;

  const year = new Date().getFullYear();

  await prisma.$transaction(async (tx) => {
    const hasRealNumber =
      doc.docNumber && doc.docNumber !== "DRAFT" && !doc.docNumber.startsWith("DR-");
    let number = doc.docNumber ?? "DRAFT";

    if (!hasRealNumber) {
      const counter = await tx.documentCounter.upsert({
        where: { docType_year: { docType: doc.docType, year } },
        update: { lastSeq: { increment: 1 } },
        create: { docType: doc.docType, year, lastSeq: 1 },
        select: { lastSeq: true },
      });

      number = formatDocNumber(doc.docType, year, counter.lastSeq);
    }

    await tx.document.update({
      where: { id },
      data: {
        docNumber: number,
        isFinal: true,
      },
    });
  });

  revalidatePath(`/documents/${id}/edit`);
  revalidatePath("/invoices");
  revalidatePath("/offers");
}

/**
 * 3b) 🔥 Toggle Entwurf ⇄ Final (wie du es willst)
 * - Entwurf -> Final: zieht Nummer, falls noch keine echte vorhanden
 * - Final -> Entwurf: macht isFinal=false, Nummer bleibt reserviert (kein Counter zurück!)
 */
export async function toggleFinalizeDocument(id: string) {
  const doc = await prisma.document.findUnique({
    where: { id },
    select: { docType: true, isFinal: true, docNumber: true, status: true, draftNumber: true },
  });

  if (!doc) throw new Error("Dokument nicht gefunden");

  // FINAL -> ENTWURF
  if (doc.isFinal) {
    if (doc.status === DocumentStatus.PAID || doc.status === DocumentStatus.CANCELLED) {
      throw new Error("Bezahlte oder stornierte Dokumente können nicht zurückgesetzt werden.");
    }
    let fallbackDraft = doc.draftNumber;
    if (!fallbackDraft) {
      const year = new Date().getFullYear();
      const counter = await prisma.documentDraftCounter.upsert({
        where: { docType_year: { docType: doc.docType, year } },
        update: { lastSeq: { increment: 1 } },
        create: { docType: doc.docType, year, lastSeq: 1 },
        select: { lastSeq: true },
      });
      fallbackDraft = `DR-${counter.lastSeq}`;
    }
    await prisma.document.update({
      where: { id },
      data: {
        isFinal: false,
        status: DocumentStatus.DRAFT,
        docNumber: fallbackDraft,
        draftNumber: fallbackDraft,
      },
    });

    revalidatePath(`/documents/${id}/edit`);
    revalidatePath("/invoices");
    revalidatePath("/offers");
    return;
  }

  // ENTWURF -> FINAL
  const year = new Date().getFullYear();

  await prisma.$transaction(async (tx) => {
    const hasRealNumber =
      doc.docNumber && doc.docNumber !== "DRAFT" && !doc.docNumber.startsWith("DR-");
    let number = doc.docNumber ?? "DRAFT";

    if (!hasRealNumber) {
      const counter = await tx.documentCounter.upsert({
        where: { docType_year: { docType: doc.docType, year } },
        update: { lastSeq: { increment: 1 } },
        create: { docType: doc.docType, year, lastSeq: 1 },
        select: { lastSeq: true },
      });

      number = formatDocNumber(doc.docType, year, counter.lastSeq);
    }

    const nextStatus =
      doc.docType === "INVOICE" || doc.docType === "CREDIT_NOTE"
        ? DocumentStatus.SENT
        : doc.status;

    await tx.document.update({
      where: { id },
      data: {
        docNumber: number,
        isFinal: true,
        status: nextStatus,
      },
    });
  });

  revalidatePath(`/documents/${id}/edit`);
  revalidatePath("/invoices");
  revalidatePath("/offers");
}

/* -----------------------------------------
 * Dokument-Verwaltung (Löschen / Storno)
 * ----------------------------------------- */

/**
 * ✅ Löschen: Draft UND Final (so wie du es willst)
 * Achtung: Nummernkreis wird NICHT zurückgesetzt -> Lücken sind normal.
 */
export async function deleteDocument(id: string) {
  const exists = await prisma.document.findUnique({
    where: { id },
    select: { id: true, isFinal: true },
  });

  if (!exists) return;
  if (exists.isFinal) throw new Error("Finale Dokumente dürfen nicht gelöscht werden.");

  await prisma.$transaction(async (tx) => {
    // Lines löschen (falls du DocumentLine hast)
    await tx.documentLine.deleteMany({ where: { documentId: id } });
    await tx.document.delete({ where: { id } });
  });

  revalidatePath("/invoices");
  revalidatePath("/offers");
}

/**
 * Optional: Storno für Final (wenn du es später doch brauchst)
 */
export async function cancelFinalDocument(id: string) {
  const doc = await prisma.document.findUnique({
    where: { id },
    select: { isFinal: true, status: true },
  });

  if (!doc) throw new Error("Dokument nicht gefunden");
  if (!doc.isFinal) throw new Error("Nur finale Dokumente werden storniert.");
  if (doc.status === DocumentStatus.CANCELLED) return;

  await prisma.document.update({
    where: { id },
    data: { status: DocumentStatus.CANCELLED, cancelledAt: new Date() },
  });

  revalidatePath("/invoices");
  revalidatePath(`/documents/${id}/edit`);
}

export async function setDocumentPaid(id: string, paidAt: Date | string | null) {
  const doc = await prisma.document.findUnique({
    where: { id },
    select: { docType: true, isFinal: true, status: true },
  });

  if (!doc) throw new Error("Dokument nicht gefunden");
  if (doc.docType !== "INVOICE") throw new Error("Nur Rechnungen können bezahlt werden.");
  if (!doc.isFinal) throw new Error("Nur finale Rechnungen können bezahlt werden.");
  if (doc.status === DocumentStatus.CANCELLED) {
    throw new Error("Stornierte Rechnungen können nicht bezahlt werden.");
  }

  const parseDate = (value: Date | string | null) => {
    if (value === null) return null;
    if (value instanceof Date) return value;
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  };

  const paidDate = parseDate(paidAt);

  await prisma.document.update({
    where: { id },
    data: {
      status: paidDate ? DocumentStatus.PAID : DocumentStatus.SENT,
      paidAt: paidDate,
    },
  });

  revalidatePath("/invoices");
  revalidatePath(`/documents/${id}/edit`);
}

export async function createCreditNoteFromInvoice(input: {
  invoiceId: string;
  lines: { lineId: string; qty: number }[];
}) {
  const { invoiceId, lines } = input;
  if (!lines || lines.length === 0) throw new Error("Keine Positionen ausgewählt.");

  const invoice = await prisma.document.findUnique({
    where: { id: invoiceId },
    include: { lines: true },
  });

  if (!invoice) throw new Error("Rechnung nicht gefunden");
  if (invoice.docType !== "INVOICE") throw new Error("Nur Rechnungen können gutgeschrieben werden.");
  if (!invoice.isFinal) throw new Error("Nur finale Rechnungen können gutgeschrieben werden.");

  const lineMap = new Map(invoice.lines.map((l) => [l.id, l]));
  const selected = lines
    .map((l) => {
      const source = lineMap.get(l.lineId);
      if (!source) return null;
      const qty = Math.max(0, Math.min(Number(l.qty ?? 0), Number(source.qty ?? 0)));
      if (!qty) return null;
      return { source, qty };
    })
    .filter(Boolean) as { source: any; qty: number }[];

  if (selected.length === 0) throw new Error("Keine gültigen Positionen ausgewählt.");

  const year = new Date().getFullYear();
  const draftCounter = await prisma.documentDraftCounter.upsert({
    where: { docType_year: { docType: "CREDIT_NOTE", year } },
    update: { lastSeq: { increment: 1 } },
    create: { docType: "CREDIT_NOTE", year, lastSeq: 1 },
    select: { lastSeq: true },
  });
  const draftNumber = `DR-${draftCounter.lastSeq}`;

  const creditDoc = await prisma.document.create({
    data: {
      docType: "CREDIT_NOTE",
      docNumber: draftNumber,
      draftNumber,
      status: DocumentStatus.DRAFT,
      isFinal: false,
      issueDate: new Date(),
      customerId: invoice.customerId,
      vehicleId: invoice.vehicleId,
      creditForId: invoice.id,
    },
    select: { id: true },
  });

  await prisma.$transaction(async (tx) => {
    let position = 1;
    for (const { source, qty } of selected) {
      const unitNetCents = -Math.abs(source.unitNetCents ?? 0);
      const vatRate = source.vatRate ?? 19;
      const discountPct = source.discountPct ?? 0;

      const { net, vat, gross } = calcLineCents({
        qty,
        unitNetCents,
        vatRate,
        discountPct,
      });

      await tx.documentLine.create({
        data: {
          documentId: creditDoc.id,
          position,
          title: source.title,
          description: source.description ?? null,
          qty,
          unitNetCents,
          vatRate,
          discountPct,
          lineNetCents: net,
          lineVatCents: vat,
          lineGrossCents: gross,
        },
      });

      position += 1;
    }

    await recalcDocumentTotalsTx(tx, creditDoc.id);
  });

  revalidatePath("/invoices");
  revalidatePath(`/documents/${creditDoc.id}/edit`);

  return creditDoc.id;
}
// ==========================
// STEP 3: DIENSTLEISTUNGEN / LINES
// ==========================

// Helper: berechnet lineNet/lineVat/lineGross aus qty, unitNet, vat und rabatt%
function calcLineCents(params: {
  qty: number;
  unitNetCents: number;
  vatRate: number;       // z.B. 19
  discountPct?: number;  // 0..100
}) {
  const qty = params.qty ?? 1;
  const discountPct = params.discountPct ?? 0;

  const baseNet = Math.round(qty * params.unitNetCents);
  const net = Math.round(baseNet * (1 - discountPct / 100));
  const vat = Math.round(net * (params.vatRate / 100));
  const gross = net + vat;

  return { net, vat, gross };
}

// Helper: Summe am Document aus allen Lines aktualisieren
async function recalcDocumentTotalsTx(tx: any, documentId: string) {
  const lines = await tx.documentLine.findMany({
    where: { documentId },
    select: { lineNetCents: true, lineVatCents: true, lineGrossCents: true },
  });

  type Totals = { net: number; vat: number; gross: number };

  const totals = lines.reduce(
    (acc: Totals, l: { lineNetCents: number; lineVatCents: number; lineGrossCents: number }) => {
      acc.net += l.lineNetCents ?? 0;
      acc.vat += l.lineVatCents ?? 0;
      acc.gross += l.lineGrossCents ?? 0;
      return acc;
    },
    { net: 0, vat: 0, gross: 0 } as Totals
  );

  await tx.document.update({
    where: { id: documentId },
    data: {
      netTotalCents: totals.net,
      vatTotalCents: totals.vat,
      grossTotalCents: totals.gross,
    },
  });
}

/**
 * Services suchen für Autocomplete
 */
export async function searchServices(query: string) {
  const q = query.trim();
  if (!q) {
    return prisma.serviceItem.findMany({
      where: { active: true },
      take: 5,
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        pricingType: true,
        awUnitPriceCents: true,
        awDefaultQty: true,
        hourlyRateCents: true,
        defaultMinutes: true,
        vatRate: true,
        shortText: true,
      },
    });
  }

  return prisma.serviceItem.findMany({
    where: {
      active: true,
      name: { contains: q },
    },
    take: 10,
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      pricingType: true,
      awUnitPriceCents: true,
      awDefaultQty: true,
      hourlyRateCents: true,
      defaultMinutes: true,
      vatRate: true,
      shortText: true,
    },
  });
}

export async function searchStockVehicles(query: string) {
  const q = (query ?? "").trim();
  if (!q) {
    return prisma.vehicle.findMany({
      where: { isStock: true, isForSale: true, isSold: false },
      take: 5,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        make: true,
        model: true,
        vin: true,
        purchaseCents: true,
      },
    });
  }

  return prisma.vehicle.findMany({
    where: {
      isStock: true,
      isForSale: true,
      isSold: false,
      OR: [{ make: { contains: q } }, { model: { contains: q } }, { vin: { contains: q } }],
    },
    take: 10,
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      make: true,
      model: true,
      vin: true,
      purchaseCents: true,
    },
  });
}

export async function addCustomLine(input: {
  documentId: string;
  title: string;
  description?: string | null;
  qty?: number;
  unitPrice?: number;
  discount?: number;
  vatRate?: number;
}) {
  const {
    documentId,
    title,
    description,
    qty = 1,
    unitPrice = 0,
    discount = 0,
    vatRate = 19,
  } = input;

  await prisma.$transaction(async (tx) => {
    const doc = await tx.document.findUnique({
      where: { id: documentId },
      select: { isFinal: true },
    });
    if (!doc) throw new Error("Document not found");
    if (doc.isFinal) throw new Error("Final document cannot be edited");

    const last = await tx.documentLine.aggregate({
      where: { documentId },
      _max: { position: true },
    });
    const position = (last._max.position ?? 0) + 1;

    const unitNetCents = Math.round(Number(unitPrice) * 100);
    const discountPct = Number(discount) || 0;

    const { net, vat, gross } = calcLineCents({
      qty: Number(qty) || 1,
      unitNetCents,
      vatRate: Number(vatRate) || 19,
      discountPct,
    });

    await tx.documentLine.create({
      data: {
        documentId,
        position,
        title: title.trim() || "Freitext",
        description: description ?? null,
        qty: Number(qty) || 1,
        unitNetCents,
        vatRate: Number(vatRate) || 19,
        discountPct,
        lineNetCents: net,
        lineVatCents: vat,
        lineGrossCents: gross,
      },
    });

    await recalcDocumentTotalsTx(tx, documentId);
  });

  revalidatePath(`/documents/${documentId}/edit`);
}

/**
 * ServiceItem -> DocumentLine Snapshot + line totals berechnen
 */
export async function addLineFromService(documentId: string, serviceId: string) {
  await prisma.$transaction(async (tx) => {
    const doc = await tx.document.findUnique({
      where: { id: documentId },
      select: { isFinal: true },
    });
    if (!doc) throw new Error("Document not found");
    if (doc.isFinal) throw new Error("Final document cannot be edited");

    const service = await tx.serviceItem.findUnique({
      where: { id: serviceId },
      select: {
        name: true,
        pricingType: true,
        awUnitPriceCents: true,
        awDefaultQty: true,
        hourlyRateCents: true,
        defaultMinutes: true,
        vatRate: true,
        shortText: true,
      },
    });
    if (!service) throw new Error("Service not found");

    // nächste Position
    const last = await tx.documentLine.aggregate({
      where: { documentId },
      _max: { position: true },
    });
    const position = (last._max.position ?? 0) + 1;

    // Pricing Snapshot
    let qty = 1;
    let unitNetCents = 0;

    if (service.pricingType === "AW") {
      unitNetCents = service.awUnitPriceCents ?? 0;
      qty = service.awDefaultQty ?? 1;
    } else {
      unitNetCents = service.hourlyRateCents ?? 0;
      const minutes = service.defaultMinutes ?? 60;
      qty = minutes / 60;
    }

    const vatRate = service.vatRate ?? 19;
    const discountPct = 0;

    const { net, vat, gross } = calcLineCents({ qty, unitNetCents, vatRate, discountPct });

    await tx.documentLine.create({
      data: {
        documentId,
        position,
        title: service.name,
        description: service.shortText ?? null,
        qty,
        unitNetCents,
        vatRate,
        discountPct,
        lineNetCents: net,
        lineVatCents: vat,
        lineGrossCents: gross,
      },
    });

    await recalcDocumentTotalsTx(tx, documentId);
  });

  revalidatePath(`/documents/${documentId}/edit`);
}

export async function addLineFromStockVehicle(documentId: string, vehicleId: string) {
  await prisma.$transaction(async (tx) => {
    const doc = await tx.document.findUnique({
      where: { id: documentId },
      select: { isFinal: true },
    });
    if (!doc) throw new Error("Document not found");
    if (doc.isFinal) throw new Error("Final document cannot be edited");

    const vehicle = await tx.vehicle.findUnique({
      where: { id: vehicleId },
      select: {
        make: true,
        model: true,
        vin: true,
        purchaseCents: true,
      },
    });
    if (!vehicle) throw new Error("Vehicle not found");

    const last = await tx.documentLine.aggregate({
      where: { documentId },
      _max: { position: true },
    });
    const position = (last._max.position ?? 0) + 1;

    const title = `Fahrzeugbestand: ${vehicle.make ?? "-"} ${vehicle.model ?? ""}`.trim();
    const description = vehicle.vin ? `VIN: ${vehicle.vin}` : null;
    const qty = 1;
    const unitNetCents = vehicle.purchaseCents ?? 0;
    const vatRate = 19;
    const discountPct = 0;

    const { net, vat, gross } = calcLineCents({ qty, unitNetCents, vatRate, discountPct });

    await tx.documentLine.create({
      data: {
        documentId,
        position,
        title,
        description,
        qty,
        unitNetCents,
        vatRate,
        discountPct,
        lineNetCents: net,
        lineVatCents: vat,
        lineGrossCents: gross,
      },
    });

    await recalcDocumentTotalsTx(tx, documentId);
  });

  revalidatePath(`/documents/${documentId}/edit`);
}

export async function moveDocumentLine(input: {
  documentId: string;
  lineId: string;
  direction: "up" | "down";
}) {
  const { documentId, lineId, direction } = input;

  await prisma.$transaction(async (tx) => {
    const doc = await tx.document.findUnique({
      where: { id: documentId },
      select: { isFinal: true },
    });
    if (!doc) throw new Error("Document not found");
    if (doc.isFinal) throw new Error("Final document cannot be edited");

    const current = await tx.documentLine.findUnique({
      where: { id: lineId },
      select: { id: true, position: true },
    });
    if (!current) throw new Error("Line not found");

    const neighbor = await tx.documentLine.findFirst({
      where: {
        documentId,
        position: direction === "up" ? { lt: current.position } : { gt: current.position },
      },
      orderBy: { position: direction === "up" ? "desc" : "asc" },
      select: { id: true, position: true },
    });
    if (!neighbor) return;

    await tx.documentLine.update({
      where: { id: current.id },
      data: { position: neighbor.position },
    });

    await tx.documentLine.update({
      where: { id: neighbor.id },
      data: { position: current.position },
    });
  });

  revalidatePath(`/documents/${documentId}/edit`);
}

/**
 * Line bearbeiten (Titel, qty, Preis, MwSt, Rabatt, Beschreibung)
 */
export async function updateDocumentLine(
  lineId: string,
  patch: {
    // ===== UI-Felder =====
    title?: string;              // optional
    description?: string | null; // optional
    quantity?: number;           // UI -> qty
    unitPrice?: number;          // €    -> unitNetCents
    discount?: number;           // %    -> discountPct
    vatRate?: number;            // %
  }
) {
  const line = await prisma.documentLine.findUnique({
    where: { id: lineId },
    select: { documentId: true },
  });
  if (!line) throw new Error("Line not found");

  await prisma.$transaction(async (tx) => {
    const doc = await tx.document.findUnique({
      where: { id: line.documentId },
      select: { isFinal: true },
    });
    if (!doc) throw new Error("Document not found");
    if (doc.isFinal) throw new Error("Final document cannot be edited");

    const current = await tx.documentLine.findUnique({
      where: { id: lineId },
      select: {
        qty: true,
        unitNetCents: true,
        vatRate: true,
        discountPct: true,
        title: true,
        description: true,
      },
    });
    if (!current) throw new Error("Line not found");

    const qty = patch.quantity != null ? Number(patch.quantity) : current.qty;
    const unitNetCents =
      patch.unitPrice != null
        ? Math.round(Number(patch.unitPrice) * 100)
        : current.unitNetCents;

    const discountPct =
      patch.discount != null ? Number(patch.discount) : (current.discountPct ?? 0);

    const vatRate = patch.vatRate != null ? Number(patch.vatRate) : current.vatRate;

    const title =
      patch.title !== undefined ? (patch.title ?? "") : current.title;

    const description =
      patch.description !== undefined ? (patch.description || null) : current.description;

    const { net, vat, gross } = calcLineCents({
      qty,
      unitNetCents,
      vatRate,
      discountPct,
    });

    await tx.documentLine.update({
      where: { id: lineId },
      data: {
        qty,
        unitNetCents,
        vatRate,
        discountPct,
        title,
        description,
        lineNetCents: net,
        lineVatCents: vat,
        lineGrossCents: gross,
      },
    });

    await recalcDocumentTotalsTx(tx, line.documentId);
  });

  revalidatePath(`/documents/${line.documentId}/edit`);
}

/**
 * Line löschen
 */
export async function deleteDocumentLine(lineId: string) {
  const line = await prisma.documentLine.findUnique({
    where: { id: lineId },
    select: { documentId: true },
  });
  if (!line) return;

  await prisma.$transaction(async (tx) => {
    const doc = await tx.document.findUnique({
      where: { id: line.documentId },
      select: { isFinal: true },
    });
    if (!doc) throw new Error("Document not found");
    if (doc.isFinal) throw new Error("Final document cannot be edited");

    await tx.documentLine.delete({ where: { id: lineId } });
    await recalcDocumentTotalsTx(tx, line.documentId);
  });

  revalidatePath(`/documents/${line.documentId}/edit`);
}
