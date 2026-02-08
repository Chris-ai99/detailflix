"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteDocument } from "@/app/documents/serverActions";

export default function DeleteDraftButton({ id }: { id: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <button
      type="button"
      onClick={() => {
        if (!confirm("Rechnung wirklich löschen?")) return;
        startTransition(async () => {
          await deleteDocument(id);
          router.refresh();
        });
      }}
      disabled={isPending}
      className="rounded bg-rose-700 px-3 py-2 text-xs hover:bg-rose-600 disabled:opacity-50"
    >
      Löschen
    </button>
  );
}
