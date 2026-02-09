import { redirect } from "next/navigation";
import { createDraftDocumentForCustomer } from "@/app/documents/serverActions";

export default async function NewOrderPage({
  searchParams,
}: {
  searchParams?: { customerId?: string } | Promise<{ customerId?: string }>;
}) {
  const resolved = searchParams ? await searchParams : undefined;
  const customerId = String(resolved?.customerId || "").trim() || null;

  const id = await createDraftDocumentForCustomer("PURCHASE_CONTRACT", customerId);
  redirect(`/documents/${id}/edit`);
}

