import fs from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionFromCookies } from "@/lib/auth";
import { resolveAttachmentAbsolutePath } from "@/lib/customer-attachments";

export async function GET(
  _req: Request,
  context: { params: Promise<{ id: string; attachmentId: string }> }
) {
  const session = await getSessionFromCookies();
  if (!session) {
    return new NextResponse("Nicht angemeldet", { status: 401 });
  }

  const { id, attachmentId } = await context.params;
  const item = await prisma.customerAttachment.findFirst({
    where: { id: attachmentId, customerId: id },
    select: {
      title: true,
      mimeType: true,
      storagePath: true,
    },
  });
  if (!item) {
    return new NextResponse("Dokument nicht gefunden", { status: 404 });
  }

  try {
    const absolutePath = resolveAttachmentAbsolutePath(item.storagePath);
    const content = await fs.readFile(absolutePath);
    const fileName = path.basename(item.title).replace(/"/g, "");
    return new NextResponse(content, {
      status: 200,
      headers: {
        "Content-Type": item.mimeType || "application/octet-stream",
        "Content-Disposition": `inline; filename="${fileName}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch {
    return new NextResponse("Datei nicht lesbar", { status: 404 });
  }
}
