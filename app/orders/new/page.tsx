import { redirect } from "next/navigation";
import { createDraftDocument } from "@/app/documents/serverActions";

export default async function NewOrderPage() {
  const id = await createDraftDocument("PURCHASE_CONTRACT");
  redirect(`/documents/${id}/edit`);
}
