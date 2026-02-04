import Link from "next/link";
import { prisma } from "@/lib/prisma";
import DeleteDraftButton from "./ui/DeleteDraftButton";

const formatDate = (value?: Date | string | null) => {
  if (!value) return "—";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("de-DE");
};

const formatMoney = (cents?: number | null) => {
  if (typeof cents !== "number") return "—";
  return (cents / 100).toFixed(2) + " €";
};

const statusLabel = (inv: { status: string; isFinal: boolean }) => {
  if (inv.status === "PAID") return "Bezahlt";
  if (inv.status === "CANCELLED") return "Storniert";
  return inv.isFinal ? "Offen" : "Entwurf";
};

export default async function InvoicesPage({
  searchParams,
}: {
  searchParams?: { status?: string } | Promise<{ status?: string }>;
}) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const statusFilter = resolvedSearchParams?.status ?? "all";

  const where: any = { docType: "INVOICE" };
  if (statusFilter === "paid") where.status = "PAID";
  if (statusFilter === "unpaid") where.status = { in: ["DRAFT", "SENT"] };
  if (statusFilter === "cancelled") where.status = "CANCELLED";

  const invoices = await prisma.document.findMany({
    where,
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      docNumber: true,
      isFinal: true,
      status: true,
      issueDate: true,
      dueDate: true,
      paidAt: true,
      customer: { select: { name: true, isBusiness: true } },
      vehicle: { select: { make: true, model: true } },
      grossTotalCents: true,
    },
  });

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Rechnungen</h1>
        <Link
          href="/invoices/new"
          className="rounded bg-emerald-700 px-4 py-2 text-sm font-medium hover:bg-emerald-600"
        >
          + Neue Rechnung
        </Link>
      </div>

      <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-4">
        <form className="flex flex-wrap items-end gap-4" method="get">
          <div>
            <label className="block text-xs text-slate-400">Bezahlstatus</label>
            <select
              name="status"
              defaultValue={statusFilter}
              className="mt-1 rounded bg-slate-950 px-3 py-2 text-sm"
            >
              <option value="all">Alle anzeigen</option>
              <option value="unpaid">Unbezahlt</option>
              <option value="paid">Bezahlt</option>
              <option value="cancelled">Storniert</option>
            </select>
          </div>

          <button
            type="submit"
            className="rounded bg-slate-800 px-3 py-2 text-sm hover:bg-slate-700"
          >
            Filtern
          </button>
        </form>
      </div>

      <div className="rounded-lg border border-slate-800 bg-slate-900/40">
        <table className="w-full text-sm">
          <thead className="text-slate-300">
            <tr className="border-b border-slate-800">
              <th className="p-3 text-left">Rechnung-ID</th>
              <th className="p-3 text-left">Kunde</th>
              <th className="p-3 text-left">Fahrzeug</th>
              <th className="p-3 text-left">Angebot-ID</th>
              <th className="p-3 text-left">Auftrag-ID</th>
              <th className="p-3 text-left">erstellt am</th>
              <th className="p-3 text-left">Fällig am</th>
              <th className="p-3 text-right">Betrag</th>
              <th className="p-3 text-right">Aktionen</th>
            </tr>
          </thead>
          <tbody>
            {invoices.map((inv) => {
              const isOverdue =
                inv.dueDate &&
                inv.status !== "PAID" &&
                inv.status !== "CANCELLED" &&
                new Date(inv.dueDate).getTime() < todayStart.getTime();

              return (
                <tr
                  key={inv.id}
                  className={`border-b border-slate-800 last:border-b-0 ${
                    isOverdue ? "bg-rose-900/15" : ""
                  }`}
                >
                  <td className="p-3">
                    <div className="font-semibold text-slate-100">{inv.docNumber}</div>
                    <div className="text-xs text-slate-500">{statusLabel(inv)}</div>
                  </td>
                  <td className="p-3">{inv.customer?.name || (inv.customer?.isBusiness ? "Gewerbekunde" : "—")}</td>
                  <td className="p-3">
                    {inv.vehicle?.make ?? "—"} {inv.vehicle?.model ?? ""}
                  </td>
                  <td className="p-3 text-slate-500">—</td>
                  <td className="p-3 text-slate-500">—</td>
                  <td className="p-3">{formatDate(inv.issueDate)}</td>
                  <td className={`p-3 ${isOverdue ? "text-rose-300" : ""}`}>
                    {formatDate(inv.dueDate)}
                  </td>
                  <td className="p-3 text-right">{formatMoney(inv.grossTotalCents)}</td>
                  <td className="p-3 text-right">
                    <div className="flex justify-end gap-2">
                      <Link
                        href={`/documents/${inv.id}/edit`}
                        className="rounded bg-slate-800 px-3 py-2 text-xs hover:bg-slate-700"
                      >
                        Öffnen
                      </Link>
                      {!inv.isFinal ? (
                        <DeleteDraftButton id={inv.id} />
                      ) : (
                        <span className="rounded bg-slate-950 px-3 py-2 text-xs text-slate-500">
                          Final
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}

            {invoices.length === 0 && (
              <tr>
                <td className="p-6 text-slate-400" colSpan={9}>
                  Noch keine Rechnungen vorhanden.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

