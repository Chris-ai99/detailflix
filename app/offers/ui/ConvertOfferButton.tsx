"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { acceptOfferAndCreateOrderAndWorkCard } from "@/app/documents/serverActions";

export default function ConvertOfferButton({ offerId }: { offerId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <button
      type="button"
      title="Angebot annehmen"
      onClick={() => {
        if (!confirm("Angebot annehmen und Auftrag + Arbeitskarte automatisch erstellen?")) return;
        startTransition(async () => {
          const result = await acceptOfferAndCreateOrderAndWorkCard(offerId);
          router.push(`/documents/${result.orderId}/edit`);
        });
      }}
      disabled={isPending}
      className="inline-flex h-8 w-8 items-center justify-center rounded border border-cyan-500/60 text-cyan-300 transition hover:bg-cyan-500/10 disabled:opacity-50"
    >
      <svg viewBox="0 0 20 20" className="h-4 w-4" fill="currentColor" aria-hidden="true">
        <path d="M10 2a8 8 0 1 0 8 8 8 8 0 0 0-8-8Zm3.53 7.53-4 4a.75.75 0 0 1-1.06 0l-2-2a.75.75 0 0 1 1.06-1.06L9 11.94l3.47-3.47a.75.75 0 1 1 1.06 1.06Z" />
      </svg>
    </button>
  );
}
