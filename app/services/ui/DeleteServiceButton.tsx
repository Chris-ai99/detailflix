"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteServiceById } from "../[id]/serverActions";

export default function DeleteServiceButton({ serviceId }: { serviceId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <button
      type="button"
      title="Löschen"
      onClick={() => {
        if (!confirm("Leistung wirklich löschen?")) return;
        startTransition(async () => {
          await deleteServiceById(serviceId);
          router.refresh();
        });
      }}
      disabled={isPending}
      className="inline-flex h-8 w-8 items-center justify-center rounded border border-rose-500/60 text-rose-300 transition hover:bg-rose-500/10 disabled:opacity-50"
    >
      <svg viewBox="0 0 20 20" className="h-4 w-4" fill="currentColor" aria-hidden="true">
        <path d="M6 7a1 1 0 0 1 1 1v7a1 1 0 1 1-2 0V8a1 1 0 0 1 1-1Zm4 0a1 1 0 0 1 1 1v7a1 1 0 1 1-2 0V8a1 1 0 0 1 1-1Zm6-3H4a1 1 0 0 0 0 2h1v11a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2V6h1a1 1 0 1 0 0-2Z" />
      </svg>
    </button>
  );
}
