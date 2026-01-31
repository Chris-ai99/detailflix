"use server";

import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { eurosToCents } from "@/lib/money";
import { hhmmToMinutes } from "@/lib/time";

export async function updateService(formData: FormData) {
  const id = String(formData.get("id") || "");

  const pricingType = String(formData.get("pricingType") || "AW");

  const name = String(formData.get("name") || "").trim();
  const category = String(formData.get("category") || "").trim() || null;

  const vatRateRaw = String(formData.get("vatRate") || "19");
  const vatRate = Number.isFinite(Number(vatRateRaw)) ? Number(vatRateRaw) : 19;

  const active = formData.get("active") === "on";

  // AW
  const awDurationMinutes = Number(String(formData.get("awDurationMinutes") || "60")) || 60;
  const awUnitPriceCents = eurosToCents(String(formData.get("awUnitPrice") || "0"));
  const awDefaultQty = Number(String(formData.get("awDefaultQty") || "1")) || 1;

  // HOURLY
  const hourlyRateCents = eurosToCents(String(formData.get("hourlyRate") || "0"));
  const defaultMinutes = hhmmToMinutes(String(formData.get("defaultTime") || "00:00"));

  // Material
  const materialPercent = Number(String(formData.get("materialPercent") || "0")) || 0;
  const materialFixedCents = eurosToCents(String(formData.get("materialFixed") || "0"));

  const shortText = String(formData.get("shortText") || "").trim() || null;

  await prisma.serviceItem.update({
    where: { id },
    data: {
      name,
      category,
      pricingType: pricingType === "HOURLY" ? "HOURLY" : "AW",

      awDurationMinutes: pricingType === "AW" ? awDurationMinutes : null,
      awUnitPriceCents: pricingType === "AW" ? awUnitPriceCents : null,
      awDefaultQty: pricingType === "AW" ? awDefaultQty : null,

      hourlyRateCents: pricingType === "HOURLY" ? hourlyRateCents : null,
      defaultMinutes: pricingType === "HOURLY" ? defaultMinutes : null,

      materialPercent: pricingType === "HOURLY" ? materialPercent : 0,
      materialFixedCents: pricingType === "HOURLY" ? materialFixedCents : 0,

      vatRate,
      active,
      shortText,
    },
  });

  redirect(`/services/${id}`);
}