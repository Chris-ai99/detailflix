import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import ViewerClient from "./ui/ViewerClient";
import { mapDocumentToView } from "@/app/documents/_logic/mapDoc";

export default async function DocumentViewPage({
  params,
}: {
  params: { id: string } | Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (typeof id !== "string" || id.length === 0) return notFound();

  const doc = await prisma.document.findUnique({
    where: { id },
    include: {
      customer: true,
      vehicle: true,
      lines: { orderBy: { position: "asc" } },
    },
  });

  if (!doc) return notFound();

  const viewModel = mapDocumentToView(doc);

  return <ViewerClient doc={viewModel} />;
}
