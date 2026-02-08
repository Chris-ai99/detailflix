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
      title="Als verkauft markieren"
      onClick={() => {
        if (!confirm("Fahrzeug als verkauft markieren und ins Archiv verschieben?")) return;
        startTransition(async () => {
          await markVehicleSold(id, true);
          router.refresh();
        });
      }}
      disabled={isPending}
      className="inline-flex h-8 w-8 items-center justify-center rounded border border-emerald-500/60 text-emerald-300 transition hover:bg-emerald-500/10 disabled:opacity-50"
    >
      <svg viewBox="0 0 20 20" className="h-4 w-4" fill="currentColor" aria-hidden="true">
        <path d="M7.5 13.2 4.8 10.5a1 1 0 1 1 1.4-1.4l1.3 1.3 5.1-5.1a1 1 0 0 1 1.4 1.4l-6.4 6.5a1 1 0 0 1-1.4 0Z" />
      </svg>
    </button>
  );
}
