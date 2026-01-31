"use server";

import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

export async function deleteCustomer(formData: FormData) {
  const id = String(formData.get("id") || "");
  await prisma.customer.delete({ where: { id } });
  redirect("/customers");
}