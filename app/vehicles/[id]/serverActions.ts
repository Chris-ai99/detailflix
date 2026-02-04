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
  const current = await prisma.vehicle.findUnique({
    where: { id },
    select: { isStock: true, isForSale: true, isSold: true, soldAt: true },
  });
  if (!current) throw new Error("Fahrzeug nicht gefunden");

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
  const hasStock = formData.has("isStock");
  const hasForSale = formData.has("isForSale");
  const hasSold = formData.has("isSold");

  let isStock = current.isStock;
  let isForSale = current.isForSale;
  let isSold = current.isSold;
  let soldAt: Date | null = current.soldAt ?? null;

  if (hasStock) isStock = Boolean(formData.get("isStock"));
  if (hasForSale) isForSale = Boolean(formData.get("isForSale"));
  if (hasSold) isSold = Boolean(formData.get("isSold"));

  if (hasForSale && isForSale) {
    isStock = true;
  }
  if (hasSold) {
    soldAt = isSold ? new Date() : null;
    if (isSold) {
      isForSale = false;
      isStock = true;
    }
  }

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
      isStock,
      isForSale: isSold ? false : isForSale,
      isSold,
      soldAt,
      customerId: hasStock && isStock ? null : undefined,
    },
  });

  revalidatePath("/vehicles");
  revalidatePath(`/vehicles/${id}`);
  redirect(`/vehicles/${id}`);
}
