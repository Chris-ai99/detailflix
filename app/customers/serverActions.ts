"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function deleteCustomer(id: string) {
  if (!id) return;
  await prisma.customer.delete({ where: { id } });
  revalidatePath("/customers");
}
