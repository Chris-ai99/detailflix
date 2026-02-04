import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { renderToBuffer } from "@react-pdf/renderer";
import QRCode from "qrcode";
import { buildEpcQrPayload, buildPdfDocument } from "./PdfTemplate";

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

  let qrDataUrl: string | undefined;
  try {
    const qrText = buildEpcQrPayload(doc.grossTotalCents ?? 0, doc.docNumber);
    qrDataUrl = await QRCode.toDataURL(qrText, { margin: 1, width: 140 });
  } catch {
    qrDataUrl = undefined;
  }

  const pdfBuffer = await renderToBuffer(buildPdfDocument(doc, qrDataUrl));
  const body = new Uint8Array(pdfBuffer);

  return new NextResponse(body, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${doc.docNumber}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
