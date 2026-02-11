"use server";

import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

function asNullable(value: FormDataEntryValue | null) {
  const text = String(value || "").trim();
  return text || null;
}

function euroToCentsNullable(value: FormDataEntryValue | null) {
  const raw = String(value || "").trim();
  if (!raw) return null;
  const normalized = raw.replace(",", ".");
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return Math.round(parsed * 100);
}

export async function updateCustomer(formData: FormData) {
  const id = String(formData.get("id") || "");
  const isBusiness = String(formData.get("isBusiness") || "0") === "1";
  const companyNameRaw = String(formData.get("companyName") || "").trim();
  const firstNameRaw = String(formData.get("firstName") || "").trim();
  const lastNameRaw = String(formData.get("lastName") || "").trim();
  const contactUseZh = isBusiness && String(formData.get("contactUseZh") || "") === "on";

  if (isBusiness && !companyNameRaw) {
    throw new Error("Unternehmensname ist Pflicht");
  }
  if (!isBusiness && !firstNameRaw && !lastNameRaw) {
    throw new Error("Vorname oder Nachname ist Pflicht");
  }

  const countryRaw = String(formData.get("country") || "").trim();
  const displayName = isBusiness
    ? companyNameRaw
    : [firstNameRaw, lastNameRaw].filter(Boolean).join(" ").trim();

  const data = {
    name: displayName || null,
    isBusiness,
    companyName: isBusiness ? companyNameRaw || null : null,
    contactFirstName: firstNameRaw || null,
    contactLastName: lastNameRaw || null,
    contactUseZh,
    email: asNullable(formData.get("email")),
    phone: asNullable(formData.get("phone")),
    vatId: asNullable(formData.get("vatId")),
    street: asNullable(formData.get("street")),
    zip: asNullable(formData.get("zip")),
    city: asNullable(formData.get("city")),
    country: countryRaw || "Deutschland",
    notes: asNullable(formData.get("notes")),
    hourlyRateCents: euroToCentsNullable(formData.get("hourlyRateEur")),
  };

  await prisma.customer.update({
    where: { id },
    data,
  });

  redirect(`/customers/${id}`);
}
