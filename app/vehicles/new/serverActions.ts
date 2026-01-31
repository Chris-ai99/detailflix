// app/vehicles/new/serverActions.ts
"use server";

import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

function parseIntOrNull(v: FormDataEntryValue | null) {
  if (v === null) return null;
  const n = Number(String(v));
  return Number.isFinite(n) && n !== 0 ? n : null;
}

export async function createVehicle(formData: FormData) {
  const vin = String(formData.get("vin") ?? "").trim() || null;
  const make = String(formData.get("make") ?? "").trim() || null;
  const model = String(formData.get("model") ?? "").trim() || null;
  const notes = String(formData.get("notes") ?? "").trim() || null;

  const year = parseIntOrNull(formData.get("year"));
  const mileage = parseIntOrNull(formData.get("mileage"));

  // purchase: als Euro Eingabe -> in Cents speichern
  const purchaseEuroRaw = String(formData.get("purchaseEuro") ?? "").trim();
  const purchaseCents =
    purchaseEuroRaw ? Math.round(Number(purchaseEuroRaw.replace(",", ".")) * 100) : null;

  const created = await prisma.vehicle.create({
    data: {
      vin,
      make,
      model,
      notes,
      year,
      mileage,
      purchaseCents: Number.isFinite(purchaseCents as any) ? purchaseCents : null,
    },
  });

  revalidatePath("/vehicles");
  redirect(`/vehicles/${created.id}`);
}
