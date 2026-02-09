"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { deleteAttachmentFile } from "@/lib/customer-attachments";

export async function deleteCustomer(id: string) {
  if (!id) return;

  const attachments = await prisma.customerAttachment.findMany({
    where: { customerId: id },
    select: { storagePath: true },
  });

  await prisma.customer.delete({ where: { id } });
  await Promise.all(attachments.map((item) => deleteAttachmentFile(item.storagePath)));
  revalidatePath("/customers");
}
