import Link from "next/link";
import { prisma } from "@/lib/prisma";
import DeleteInvoiceButton from "./ui/DeleteInvoiceButton";

export const dynamic = "force-dynamic";

const DASH = "\u2014";

function formatDate(value?: Date | string | null) {
  if (!value) return DASH;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return DASH;
  return date.toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatMoney(cents?: number | null) {
  if (typeof cents !== "number") return DASH;
  return (cents / 100).toFixed(2).replace(".", ",") + " \u20ac";
}

function formatVehicleLabel(input: {
  vehicle?: { make?: string | null; model?: string | null; vin?: string | null } | null;
  vehicleMake?: string | null;
  vehicleModel?: string | null;
  vehicleVin?: string | null;
}) {
  const make = input.vehicle?.make ?? input.vehicleMake ?? "";
  const model = input.vehicle?.model ?? input.vehicleModel ?? "";
  const vin = input.vehicle?.vin ?? input.vehicleVin ?? "";
  const makeModel = `${make} ${model}`.trim();
  if (makeModel && vin) return `${makeModel} (${vin})`;
  return makeModel || vin || DASH;
}

function StatusBadge({
  status,
  isFinal,
  sentAt,
}: {
  status: string;
  isFinal: boolean;
  sentAt?: Date | null;
}) {
  if (status === "SENT" && sentAt)
    return <span className="text-xs text-cyan-300">Versendet</span>;
  if (status === "PAID") return <span className="text-xs text-cyan-300">Bezahlt</span>;
  if (status === "CANCELLED") return <span className="text-xs text-rose-300">Storniert</span>;
  if (!isFinal) return <span className="text-xs text-slate-400">Entwurf</span>;
  return <span className="text-xs text-slate-300">Offen</span>;
}

function dueDateClass(status: string, dueDate?: Date | string | null) {
  if (status === "PAID") return "text-emerald-300";
  if (status === "SENT") return "text-amber-300";
  if (!dueDate) return "text-slate-300";
  const d = dueDate instanceof Date ? dueDate : new Date(dueDate);
  if (Number.isNaN(d.getTime())) return "text-slate-300";
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return d < today ? "text-rose-300" : "text-slate-300";
}

function ActionLink({
  href,
  title,
  tone,
  children,
}: {
  href: string;
  title: string;
  tone: "cyan" | "indigo";
  children: React.ReactNode;
}) {
  const toneClass =
    tone === "cyan"
      ? "border-cyan-500/60 text-cyan-300 hover:bg-cyan-500/10"
      : "border-indigo-400/60 text-indigo-300 hover:bg-indigo-500/10";

  return (
    <Link
      href={href}
      title={title}
      className={`inline-flex h-8 w-8 items-center justify-center rounded border text-xs transition ${toneClass}`}
    >
      {children}
    </Link>
  );
}

function IconSearch() {
  return (
    <svg viewBox="0 0 20 20" className="h-4 w-4" fill="currentColor" aria-hidden="true">
      <path
        fillRule="evenodd"
        d="M8.5 3a5.5 5.5 0 1 0 3.53 9.7l3.63 3.64a.75.75 0 1 0 1.06-1.06l-3.64-3.63A5.5 5.5 0 0 0 8.5 3ZM4.5 8.5a4 4 0 1 1 8 0 4 4 0 0 1-8 0Z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function IconDownload() {
  return (
    <svg viewBox="0 0 20 20" className="h-4 w-4" fill="currentColor" aria-hidden="true">
      <path d="M10 3a1 1 0 0 1 1 1v6.59l1.8-1.79a1 1 0 0 1 1.4 1.42l-3.5 3.5a1 1 0 0 1-1.4 0l-3.5-3.5a1 1 0 1 1 1.4-1.42L9 10.59V4a1 1 0 0 1 1-1Z" />
      <path d="M4 14a1 1 0 0 1 1-1h10a1 1 0 1 1 0 2H5a1 1 0 0 1-1-1Z" />
    </svg>
  );
}

export default async function InvoicesPage({
  searchParams,
}: {
  searchParams?:
    | { status?: string; from?: string; to?: string; q?: string }
    | Promise<{ status?: string; from?: string; to?: string; q?: string }>;
}) {
  const resolved = searchParams ? await searchParams : undefined;
  const statusFilter = resolved?.status ?? "all";
  const fromRaw = resolved?.from ?? "";
  const toRaw = resolved?.to ?? "";
  const q = (resolved?.q ?? "").trim();

  const where: any = { docType: "INVOICE" };
  if (statusFilter === "paid") where.status = "PAID";
  if (statusFilter === "unpaid") where.status = { in: ["DRAFT", "SENT"] };
  if (statusFilter === "cancelled") where.status = "CANCELLED";

  if (fromRaw || toRaw) {
    const range: any = {};
    if (fromRaw) range.gte = new Date(fromRaw);
    if (toRaw) range.lte = new Date(toRaw);
    where.issueDate = range;
  }

  if (q) {
    where.OR = [
      { docNumber: { contains: q } },
      { customer: { name: { contains: q } } },
      { vehicle: { make: { contains: q } } },
      { vehicle: { model: { contains: q } } },
      { vehicle: { vin: { contains: q } } },
      { vehicleMake: { contains: q } },
      { vehicleModel: { contains: q } },
      { vehicleVin: { contains: q } },
    ];
  }

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
        sentAt: true,
        customer: { select: { name: true, isBusiness: true } },
        vehicle: { select: { make: true, model: true, vin: true } },
        vehicleMake: true,
        vehicleModel: true,
        vehicleVin: true,
        grossTotalCents: true,
      },
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 rounded border border-slate-800 bg-slate-900/50 px-4 py-2 text-xs text-slate-200 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <span>Meine Rechnungen</span>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/invoices/new"
            className="inline-flex items-center gap-2 rounded bg-cyan-600 px-3 py-1 text-xs font-semibold text-white hover:bg-cyan-500"
          >
            + Neu
          </Link>
        </div>
      </div>

      <div className="rounded border border-slate-800 bg-slate-800/60 p-3">
        <form className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end" method="get">
          <div className="w-full sm:w-auto">
            <label className="block text-[11px] text-slate-400">erstellt am</label>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <input
                type="date"
                name="from"
                defaultValue={fromRaw}
                className="w-full rounded border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-slate-200 sm:w-40"
              />
              <span className="hidden text-slate-500 sm:inline">{DASH}</span>
              <input
                type="date"
                name="to"
                defaultValue={toRaw}
                className="w-full rounded border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-slate-200 sm:w-40"
              />
            </div>
          </div>

          <div className="w-full sm:w-auto">
            <label className="block text-[11px] text-slate-400">Bezahlstatus</label>
            <select
              name="status"
              defaultValue={statusFilter}
              className="w-full rounded border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-slate-200 sm:w-40"
            >
              <option value="all">Alle anzeigen</option>
              <option value="unpaid">Unbezahlt</option>
              <option value="paid">Bezahlt</option>
              <option value="cancelled">Storniert</option>
            </select>
          </div>

          <div className="flex w-full items-center gap-2 sm:ml-auto sm:w-auto">
            <input
              name="q"
              defaultValue={q}
              placeholder="Suchen"
              className="w-full rounded border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-slate-200 sm:w-56"
            />
            <button
              type="submit"
              className="rounded bg-slate-800 px-3 py-1 text-xs hover:bg-slate-700"
            >
              Filtern
            </button>
          </div>
        </form>
      </div>

      <div className="overflow-x-auto rounded border border-slate-800 bg-slate-800/60">
        <table className="w-full min-w-[1120px] text-sm">
          <thead className="text-slate-300">
            <tr className="border-b border-slate-700">
              <th className="p-3 text-left">#</th>
              <th className="p-3 text-left">Rechnung-ID</th>
              <th className="p-3 text-left">Kunde</th>
              <th className="p-3 text-left">Fahrzeug</th>
              <th className="p-3 text-left">Angebot-ID</th>
              <th className="p-3 text-left">Auftrag-ID</th>
              <th className="p-3 text-left">erstellt am</th>
              <th className="p-3 text-left">versendet am</th>
              <th className="p-3 text-left">Fällig am</th>
              <th className="p-3 text-right">Betrag</th>
              <th className="p-3 text-right">Aktionen</th>
            </tr>
          </thead>
          <tbody>
            {invoices.map((inv, idx) => {
              const customerName =
                inv.customer?.name || (inv.customer?.isBusiness ? "Gewerbekunde" : DASH);
              const vehicleLabel = formatVehicleLabel(inv);
              const deletable = inv.status !== "PAID" && inv.status !== "CANCELLED";
              const viewHref = inv.isFinal ? `/documents/${inv.id}/view` : `/documents/${inv.id}/edit`;

              return (
                <tr key={inv.id} className="border-b border-slate-700 last:border-b-0">
                  <td className="p-3 text-slate-400">{idx + 1}</td>
                  <td className="p-3">
                    <div className="font-semibold text-cyan-300">{inv.docNumber}</div>
                    <StatusBadge status={inv.status} isFinal={inv.isFinal} sentAt={inv.sentAt} />
                  </td>
                  <td className="p-3 text-slate-200">{customerName}</td>
                  <td className="p-3 text-slate-200">{vehicleLabel}</td>
                  <td className="p-3 text-slate-500">{DASH}</td>
                  <td className="p-3 text-slate-500">{DASH}</td>
                  <td className="p-3 text-slate-300">{formatDate(inv.issueDate)}</td>
                  <td className="p-3 text-slate-300">{formatDate(inv.sentAt)}</td>
                  <td className={`p-3 ${dueDateClass(inv.status, inv.dueDate)}`}>
                    {formatDate(inv.dueDate)}
                  </td>
                  <td className="p-3 text-right text-slate-200">
                    {formatMoney(inv.grossTotalCents)}
                  </td>
                  <td className="p-3 text-right">
                    <div className="flex justify-end gap-2">
                      <ActionLink href={viewHref} title={"Öffnen"} tone="cyan">
                        <IconSearch />
                      </ActionLink>
                      <ActionLink href={`/api/documents/${inv.id}/pdf`} title="PDF" tone="indigo">
                        <IconDownload />
                      </ActionLink>
                      {deletable ? <DeleteInvoiceButton invoiceId={inv.id} /> : null}
                    </div>
                  </td>
                </tr>
              );
            })}

            {invoices.length === 0 && (
              <tr>
                <td className="p-6 text-slate-400" colSpan={11}>
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
