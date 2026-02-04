import Link from "next/link";
import { prisma } from "@/lib/prisma";
import DeleteCustomerButton from "./ui/DeleteCustomerButton";

export default async function CustomersPage() {
  const customers = await prisma.customer.findMany({
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Kunden</h1>

        <Link
          href="/customers/new"
          className="bg-emerald-600 hover:bg-emerald-500 px-3 py-2 rounded"
        >
          + Neuer Kunde
        </Link>
      </div>

      <div className="mt-6 bg-slate-900 rounded p-4">
        <table className="w-full text-left">
          <thead className="text-slate-400">
            <tr>
              <th className="py-2">Name</th>
              <th>E-Mail</th>
              <th>Telefon</th>
              <th className="text-right">Aktion</th>
            </tr>
          </thead>
          <tbody>
            {customers.map((c) => (
              <tr key={c.id} className="border-t border-slate-800">
                <td className="py-3">
                  <Link
                    className="text-emerald-400 hover:underline"
                    href={`/customers/${c.id}`}
                  >
                    {c.name || (c.isBusiness ? "Gewerbekunde" : "Ohne Name")}
                  </Link>
                </td>
                <td>{c.email ?? "-"}</td>
                <td>{c.phone ?? "-"}</td>
                <td className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    <Link
                      className="rounded px-3 py-1 text-xs hover:bg-slate-800"
                      href={`/customers/${c.id}/edit`}
                    >
                      Bearbeiten
                    </Link>
                    <DeleteCustomerButton id={c.id} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {customers.length === 0 && (
          <div className="text-slate-400 py-6">
            Noch keine Kunden vorhanden. Klicke oben auf „Neuer Kunde“.
          </div>
        )}
      </div>
    </div>
  );
}
