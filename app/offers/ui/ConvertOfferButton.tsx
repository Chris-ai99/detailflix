"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { convertOfferToInvoice } from "@/app/documents/serverActions";

export default function ConvertOfferButton({ offerId }: { offerId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <button
      type="button"
      title="In Rechnung umwandeln"
      onClick={() => {
        if (!confirm("Angebot in Rechnung umwandeln?")) return;
        startTransition(async () => {
          const invoiceId = await convertOfferToInvoice(offerId);
          router.push(`/documents/${invoiceId}/edit`);
        });
      }}
      disabled={isPending}
      className="inline-flex h-8 w-8 items-center justify-center rounded border border-cyan-500/60 text-cyan-300 transition hover:bg-cyan-500/10 disabled:opacity-50"
    >
      <svg viewBox="0 0 20 20" className="h-4 w-4" fill="currentColor" aria-hidden="true">
        <path d="M4 4h8a2 2 0 0 1 2 2v2h-2V6H4v8h8v-2h2v2a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z" />
        <path d="M11 9h6l-2.5-2.5L16 5l5 5-5 5-1.5-1.5L17 11h-6V9Z" />
      </svg>
    </button>
  );
}
