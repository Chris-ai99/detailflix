"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { markVehicleSold } from "@/app/vehicles/serverActions";

export default function MarkVehicleSoldButton({ id }: { id: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <button
      type="button"
      onClick={() => {
        if (!confirm("Fahrzeug als verkauft markieren und ins Archiv verschieben?")) return;
        startTransition(async () => {
          await markVehicleSold(id, true);
          router.refresh();
        });
      }}
      disabled={isPending}
      className="rounded bg-emerald-700 px-3 py-2 text-xs hover:bg-emerald-600 disabled:opacity-50"
    >
      Als verkauft markieren
    </button>
  );
}
