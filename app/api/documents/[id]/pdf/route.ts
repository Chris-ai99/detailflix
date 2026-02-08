import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { renderToBuffer } from "@react-pdf/renderer";
import QRCode from "qrcode";
import { buildEpcQrPayload, buildPdfDocument, companyFromSettings } from "./PdfTemplate";

export const runtime = "nodejs";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;

  // ✅ Safety: falls id fehlt
  if (!id || typeof id !== "string") {
    return new NextResponse("Missing id", { status: 400 });
  }

  const doc = await prisma.document.findUnique({
    where: { id },
    include: {
      customer: true,
      vehicle: true,
      creditFor: { select: { docNumber: true } },
      lines: { orderBy: { position: "asc" } },
    },
  });

  if (!doc) return new NextResponse("Not found", { status: 404 });

  const settings = await prisma.companySettings.findUnique({ where: { id: "default" } });
  const company = companyFromSettings(settings);

  let qrDataUrl: string | undefined;
  try {
    // BIC ist im EPC-QR inzwischen optional; IBAN + Name sind das Minimum.
    if (doc.docType === "INVOICE" && (doc.grossTotalCents ?? 0) > 0 && company.iban && company.name) {
      const qrText = buildEpcQrPayload(doc.grossTotalCents ?? 0, doc.docNumber, company);
      qrDataUrl = await QRCode.toDataURL(qrText, { margin: 1, width: 140 });
    } else {
      qrDataUrl = undefined;
    }
  } catch {
    qrDataUrl = undefined;
  }

  const pdfBuffer = await renderToBuffer(buildPdfDocument(doc, company, qrDataUrl));
  const body = new Uint8Array(pdfBuffer);

  return new NextResponse(body, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${doc.docNumber}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
