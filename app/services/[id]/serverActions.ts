"use server";

import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

export async function deleteService(formData: FormData) {
  const id = String(formData.get("id") || "");
  await prisma.serviceItem.delete({ where: { id } });
  redirect("/services");
}