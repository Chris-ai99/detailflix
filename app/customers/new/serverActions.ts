"use server";

import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

export async function createCustomer(formData: FormData) {
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

  await prisma.customer.create({ data });
  redirect("/customers");
}
