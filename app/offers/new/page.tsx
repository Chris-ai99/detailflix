import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createDraftDocumentForCustomer } from "@/app/documents/serverActions";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function isPrefetchRequest(headerStore: Headers): boolean {
  const nextRouterPrefetch = headerStore.get("next-router-prefetch") === "1";
  const middlewarePrefetch = headerStore.get("x-middleware-prefetch") === "1";
  const nextJsPrefetch = headerStore.get("x-nextjs-prefetch") === "1";
  const purpose = `${headerStore.get("purpose") || ""} ${headerStore.get("sec-purpose") || ""}`
    .toLowerCase()
    .trim();

  return (
    nextRouterPrefetch ||
    middlewarePrefetch ||
    nextJsPrefetch ||
    purpose.includes("prefetch")
  );
}

export default async function NewOfferPage({
  searchParams,
}: {
  searchParams?: { customerId?: string } | Promise<{ customerId?: string }>;
}) {
  const requestHeaders = await headers();
  if (isPrefetchRequest(requestHeaders)) {
    redirect("/offers");
  }

  const resolved = searchParams ? await searchParams : undefined;
  const customerId = String(resolved?.customerId || "").trim() || null;

  const id = await createDraftDocumentForCustomer("OFFER", customerId);
  redirect(`/documents/${id}/edit`);
}
