"use server";

import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

export async function createCustomer(formData: FormData) {
  const isBusiness = Boolean(formData.get("isBusiness"));
  const nameRaw = String(formData.get("name") || "").trim();
  if (!nameRaw && !isBusiness) {
    throw new Error("Name ist Pflicht");
  }
  const data = {
    name: nameRaw || null,
    isBusiness,
    email: String(formData.get("email") || "") || null,
    phone: String(formData.get("phone") || "") || null,
    vatId: String(formData.get("vatId") || "") || null,
    street: String(formData.get("street") || "") || null,
    zip: String(formData.get("zip") || "") || null,
    city: String(formData.get("city") || "") || null,
    notes: String(formData.get("notes") || "") || null,
  };

  await prisma.customer.create({ data });
  redirect("/customers");
}
