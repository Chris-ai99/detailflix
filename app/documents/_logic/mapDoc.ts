// app/documents/_logic/mapDoc.ts
import { fromCents } from "@/lib/money";
import type { Document, DocumentLine } from "@prisma/client";

export type EditorLineVM = {
  id: string;
  position: number;
  title: string;
  description: string | null;

  // UI-Felder
  quantity: number;     // = qty
  unitPrice: number;    // = unitNetCents / 100
  discount: number;     // = discountPct
  vatRate: number;

  // Read-only Anzeige
  lineNet: number;      // /100
  lineVat: number;      // /100
  lineGross: number;    // /100
};

export type EditorDocVM = {
  id: string;
  docType: Document["docType"];
  docNumber: string;
  isFinal: boolean;
  status: Document["status"];
  issueDate: Date;
  dueDate: Date | null;
  paidAt: Date | null;
  notesPublic: string | null;
  notesInternal: string | null;
  customer: any | null;
  vehicle: any | null;
  totals: { net: number; vat: number; gross: number; };
  lines: EditorLineVM[];
};

export function mapLineToView(l: DocumentLine): EditorLineVM {
  return {
    id: l.id,
    position: l.position,
    title: l.title,
    description: l.description ?? null,

    quantity: Number(l.qty ?? 0),
    unitPrice: fromCents(l.unitNetCents ?? 0),
    discount: Number(l.discountPct ?? 0),
    vatRate: Number(l.vatRate ?? 19),

    lineNet: fromCents(l.lineNetCents ?? 0),
    lineVat: fromCents(l.lineVatCents ?? 0),
    lineGross: fromCents(l.lineGrossCents ?? 0),
  };
}

export function mapDocumentToView(doc: any): EditorDocVM {
  return {
    id: doc.id,
    docType: doc.docType,
    docNumber: doc.docNumber,
    isFinal: !!doc.isFinal,
    status: doc.status,
    issueDate: doc.issueDate,
    dueDate: doc.dueDate ?? null,
    paidAt: doc.paidAt ?? null,
    notesPublic: doc.notesPublic ?? null,
    notesInternal: doc.notesInternal ?? null,
    customer: doc.customer ?? null,
    vehicle: doc.vehicle ?? null,
    totals: {
      net: fromCents(doc.netTotalCents ?? 0),
      vat: fromCents(doc.vatTotalCents ?? 0),
      gross: fromCents(doc.grossTotalCents ?? 0),
    },
    lines: (doc.lines ?? [])
      .sort((a: any, b: any) => (a.position ?? 0) - (b.position ?? 0))
      .map(mapLineToView),
  };
}
