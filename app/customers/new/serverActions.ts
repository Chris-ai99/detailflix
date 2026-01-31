"use server";

import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

export async function createCustomer(formData: FormData) {
  const data = {
    name: String(formData.get("name") || ""),
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