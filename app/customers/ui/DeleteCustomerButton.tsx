"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteCustomer } from "@/app/customers/serverActions";

export default function DeleteCustomerButton({ id }: { id: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <button
      type="button"
      onClick={() => {
        if (!confirm("Kunde wirklich löschen?")) return;
        startTransition(async () => {
          await deleteCustomer(id);
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
