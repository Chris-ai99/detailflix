// app/vehicles/serverActions.ts
"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function listVehicles() {
  return prisma.vehicle.findMany({
    orderBy: { createdAt: "desc" },
  });
}

export async function deleteVehicle(id: string) {
  await prisma.vehicle.delete({ where: { id } });
  revalidatePath("/vehicles");
}
