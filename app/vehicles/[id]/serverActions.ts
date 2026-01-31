// app/vehicles/[id]/serverActions.ts
"use server";

import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
export async function getVehicle(id: string | undefined) {
  if (!id || typeof id !== "string") notFound();

  const v = await prisma.vehicle.findUnique({
    where: { id },
  });

  if (!v) notFound();
  return v;
}

export async function updateVehicle(id: string, formData: FormData) {
  const vin = String(formData.get("vin") ?? "").trim() || null;
  const make = String(formData.get("make") ?? "").trim() || null;
  const model = String(formData.get("model") ?? "").trim() || null;
  const notes = String(formData.get("notes") ?? "").trim() || null;

  const yearRaw = String(formData.get("year") ?? "").trim();
  const year = yearRaw ? Number(yearRaw) : null;

  const mileageRaw = String(formData.get("mileage") ?? "").trim();
  const mileage = mileageRaw ? Number(mileageRaw) : null;

  const purchaseEuroRaw = String(formData.get("purchaseEuro") ?? "").trim();
  const purchaseCents =
    purchaseEuroRaw ? Math.round(Number(purchaseEuroRaw.replace(",", ".")) * 100) : null;

  await prisma.vehicle.update({
    where: { id },
    data: {
      vin,
      make,
      model,
      notes,
      year: year && Number.isFinite(year) ? year : null,
      mileage: mileage && Number.isFinite(mileage) ? mileage : null,
      purchaseCents: Number.isFinite(purchaseCents as any) ? purchaseCents : null,
    },
  });

  revalidatePath("/vehicles");
  revalidatePath(`/vehicles/${id}`);
  redirect(`/vehicles/${id}`);
}