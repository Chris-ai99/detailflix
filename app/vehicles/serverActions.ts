// app/vehicles/serverActions.ts
"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function listVehicles() {
  return prisma.vehicle.findMany({
    where: { isStock: false, isSold: false },
    orderBy: { createdAt: "desc" },
  });
}

export async function listArchivedVehicles() {
  return prisma.vehicle.findMany({
    where: { isSold: true },
    orderBy: { soldAt: "desc" },
  });
}

export async function listForSaleVehicles() {
  return prisma.vehicle.findMany({
    where: { isStock: true, isForSale: true, isSold: false },
    orderBy: { createdAt: "desc" },
  });
}

export async function markVehicleSold(id: string, sold: boolean) {
  await prisma.vehicle.update({
    where: { id },
    data: {
      isSold: sold,
      soldAt: sold ? new Date() : null,
      isForSale: sold ? false : true,
      isStock: sold ? true : undefined,
      customerId: sold ? null : undefined,
    },
  });
  revalidatePath("/vehicles/for-sale");
  revalidatePath("/vehicles");
  revalidatePath("/vehicles/archive");
}

export async function deleteVehicle(id: string) {
  await prisma.vehicle.delete({ where: { id } });
  revalidatePath("/vehicles");
  revalidatePath("/vehicles/archive");
  revalidatePath("/vehicles/for-sale");
}
