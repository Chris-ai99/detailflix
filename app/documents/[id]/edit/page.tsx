import { prisma } from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";
import EditorClient from "./ui/EditorClient";
import { mapDocumentToView } from "@/app/documents/_logic/mapDoc";

export default async function DocumentEditPage({
  params,
}: {
  params: { id: string } | Promise<{ id: string }>;
}) {
  // ✅ funktioniert bei params als Object UND bei params als Promise
  const { id } = await params;

  // ✅ Prisma darf niemals undefined bekommen
  if (typeof id !== "string" || id.length === 0) return notFound();

  const doc = await prisma.document.findUnique({
    where: { id },
    include: {
      customer: true,
      vehicle: true,
      lines: { orderBy: { position: "asc" } }, // ✅ PRO
    },
  });

  if (!doc) return notFound();

  if (doc.docType === "INVOICE" && doc.isFinal) {
    redirect(`/documents/${id}/view`);
  }

  const viewModel = mapDocumentToView(doc);

  return <EditorClient doc={viewModel} />;
}
