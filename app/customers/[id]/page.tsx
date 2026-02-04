import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { deleteCustomer } from "./serverActions";

export default async function CustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  // ✅ Next.js 15: params ist ein Promise -> erst awaiten
  const { id } = await params; // [1](https://stackoverflow.com/questions/79627113/next-js-app-router-dynamic-route-params-should-be-awaited-warning-in-api)[2](https://iifx.dev/en/articles/457106750/upgrading-to-next-js-15-await-your-params-fixing-dynamic-route-access)

  const customer = await prisma.customer.findUnique({
    where: { id },
  });

  if (!customer) return notFound();

  return (
    <div className="max-w-2xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">
          {customer.name || (customer.isBusiness ? "Gewerbekunde" : "Ohne Name")}
        </h1>

        <div className="flex gap-2">
          <Link
            href={`/customers/${customer.id}/edit`}
            className="bg-slate-800 hover:bg-slate-700 px-3 py-2 rounded"
          >
            Bearbeiten
          </Link>

          <Link
            href="/customers"
            className="bg-slate-800 hover:bg-slate-700 px-3 py-2 rounded"
          >
            Zurück
          </Link>
        </div>
      </div>

      <div className="mt-6 bg-slate-900 rounded p-4 space-y-2">
        <div>
          <span className="text-slate-400">E-Mail:</span>{" "}
          {customer.email ?? "-"}
        </div>

        <div>
          <span className="text-slate-400">Telefon:</span>{" "}
          {customer.phone ?? "-"}
        </div>

        <div>
          <span className="text-slate-400">USt-Id:</span>{" "}
          {customer.vatId ?? "-"}
        </div>

        <div>
          <span className="text-slate-400">Adresse:</span>{" "}
          {(customer.street ?? "-") +
            (customer.zip || customer.city
              ? `, ${customer.zip ?? ""} ${customer.city ?? ""}`
              : "")}
        </div>

        <div>
          <span className="text-slate-400">Notizen:</span>{" "}
          {customer.notes ?? "-"}
        </div>
      </div>

      <div className="mt-6">
        <form action={deleteCustomer}>
          <input type="hidden" name="id" value={customer.id} />
          <button className="bg-red-600 hover:bg-red-500 px-3 py-2 rounded">
            Kunde löschen
          </button>
        </form>
      </div>
    </div>
  );
}
