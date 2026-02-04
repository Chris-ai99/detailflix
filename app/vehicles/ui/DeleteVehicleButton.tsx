"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteVehicle } from "@/app/vehicles/serverActions";

export default function DeleteVehicleButton({
  id,
  redirectTo,
}: {
  id: string;
  redirectTo?: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <button
      type="button"
      onClick={() => {
        if (!confirm("Fahrzeug wirklich löschen?")) return;
        startTransition(async () => {
          await deleteVehicle(id);
          if (redirectTo) router.push(redirectTo);
          router.refresh();
        });
      }}
      disabled={isPending}
      className="rounded bg-rose-700 px-3 py-1 text-xs hover:bg-rose-600 disabled:opacity-50"
    >
      Löschen
    </button>
  );
}
