"use server";

import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

export async function updateCustomer(formData: FormData) {
  const id = String(formData.get("id") || "");
  const nameRaw = String(formData.get("name") || "").trim();
  if (!nameRaw) {
    throw new Error("Name ist Pflicht");
  }
  const countryRaw = String(formData.get("country") || "").trim();

  const data = {
    name: nameRaw || null,
    email: String(formData.get("email") || "") || null,
    phone: String(formData.get("phone") || "") || null,
    vatId: String(formData.get("vatId") || "") || null,
    street: String(formData.get("street") || "") || null,
    zip: String(formData.get("zip") || "") || null,
    city: String(formData.get("city") || "") || null,
    country: countryRaw || "Deutschland",
    notes: String(formData.get("notes") || "") || null,
  };

  await prisma.customer.update({
    where: { id },
    data,
  });

  redirect(`/customers/${id}`);
}
