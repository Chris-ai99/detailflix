import { redirect } from "next/navigation";
import { createDraftDocument } from "@/app/documents/serverActions"; // Pfad ggf. anpassen!

export default async function NewInvoicePage() {
  const id = await createDraftDocument("INVOICE");
  redirect(`/documents/${id}/edit`);
}