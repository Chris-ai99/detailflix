import { prisma } from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";
import EditorClient from "./ui/EditorClient";
import { mapDocumentToView } from "@/app/documents/_logic/mapDoc";

type EditSearchParams =
  | {
      resolveData?: string;
      missingCustomer?: string;
      missingVehicle?: string;
    }
  | Promise<{
      resolveData?: string;
      missingCustomer?: string;
      missingVehicle?: string;
    }>;

export default async function DocumentEditPage({
  params,
  searchParams,
}: {
  params: { id: string } | Promise<{ id: string }>;
  searchParams?: EditSearchParams;
}) {
  const { id } = await params;
  const resolvedSearch = searchParams ? await searchParams : undefined;

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

  if (doc.docType === "INVOICE" && doc.isFinal) {
    redirect(`/documents/${id}/view`);
  }

  const viewModel = mapDocumentToView(doc);
  const forceDataPrompt = String(resolvedSearch?.resolveData ?? "").trim() === "1";
  const forceMissingCustomer = String(resolvedSearch?.missingCustomer ?? "").trim() === "1";
  const forceMissingVehicle = String(resolvedSearch?.missingVehicle ?? "").trim() === "1";

  return (
    <EditorClient
      doc={viewModel}
      dataResolutionPrompt={{
        open: forceDataPrompt,
        missingCustomer: forceMissingCustomer,
        missingVehicle: forceMissingVehicle,
      }}
    />
  );
}
