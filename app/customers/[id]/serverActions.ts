"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { CustomerAttachmentKind } from "@prisma/client";
import { getSessionFromCookies } from "@/lib/auth";
import {
  deleteAttachmentFile,
  storeCustomerAttachmentFile,
} from "@/lib/customer-attachments";

const MAX_ATTACHMENT_SIZE_BYTES = 10 * 1024 * 1024;
const ALLOWED_ATTACHMENT_KINDS = new Set([
  "GENERAL",
  "VEHICLE_REGISTRATION",
  "PRIVACY_AGREEMENT_UNSIGNED",
  "PRIVACY_AGREEMENT_SIGNED",
]);

function assertAttachmentKind(kind: string): CustomerAttachmentKind {
  if (!ALLOWED_ATTACHMENT_KINDS.has(kind)) {
    return "GENERAL";
  }
  return kind as CustomerAttachmentKind;
}

export async function deleteCustomer(formData: FormData) {
  const id = String(formData.get("id") || "").trim();
  if (!id) redirect("/customers");

  const attachments = await prisma.customerAttachment.findMany({
    where: { customerId: id },
    select: { storagePath: true },
  });

  await prisma.customer.delete({ where: { id } });

  await Promise.all(attachments.map((item) => deleteAttachmentFile(item.storagePath)));
  redirect("/customers");
}

export async function uploadCustomerAttachment(formData: FormData) {
  const customerId = String(formData.get("customerId") || "").trim();
  if (!customerId) throw new Error("Kunde fehlt");

  const session = await getSessionFromCookies();
  if (!session) throw new Error("Nicht angemeldet");

  const file = formData.get("file") as File | null;
  if (!file || typeof file !== "object" || !("arrayBuffer" in file)) {
    throw new Error("Datei fehlt");
  }
  if (file.size <= 0) {
    throw new Error("Datei ist leer");
  }
  if (file.size > MAX_ATTACHMENT_SIZE_BYTES) {
    throw new Error("Datei ist zu gross (max. 10 MB)");
  }

  const customer = await prisma.customer.findUnique({
    where: { id: customerId },
    select: { id: true },
  });
  if (!customer) throw new Error("Kunde nicht gefunden");

  const kind = assertAttachmentKind(String(formData.get("kind") || "GENERAL").trim());
  const titleRaw = String(formData.get("title") || "").trim();
  const content = Buffer.from(await file.arrayBuffer());
  const { storagePath, fileName } = await storeCustomerAttachmentFile({
    workspaceId: session.workspaceId,
    customerId,
    originalName: file.name || "dokument",
    content,
  });

  await prisma.customerAttachment.create({
    data: {
      customerId,
      kind,
      title: titleRaw || fileName,
      mimeType: file.type || "application/octet-stream",
      sizeBytes: file.size,
      storagePath,
    },
  });

  revalidatePath(`/customers/${customerId}`);
  redirect(`/customers/${customerId}`);
}

export async function deleteCustomerAttachment(formData: FormData) {
  const customerId = String(formData.get("customerId") || "").trim();
  const attachmentId = String(formData.get("attachmentId") || "").trim();
  if (!customerId || !attachmentId) {
    redirect(customerId ? `/customers/${customerId}` : "/customers");
  }

  const item = await prisma.customerAttachment.findFirst({
    where: { id: attachmentId, customerId },
    select: { id: true, storagePath: true },
  });
  if (!item) {
    redirect(`/customers/${customerId}`);
  }

  await prisma.customerAttachment.delete({ where: { id: attachmentId } });
  await deleteAttachmentFile(item.storagePath);

  revalidatePath(`/customers/${customerId}`);
  redirect(`/customers/${customerId}`);
}
