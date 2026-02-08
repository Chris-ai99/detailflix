import { redirect } from "next/navigation";
import { createDraftDocument } from "@/app/documents/serverActions";

export default async function NewOfferPage() {
  const id = await createDraftDocument("OFFER");
  redirect(`/documents/${id}/edit`);
}
