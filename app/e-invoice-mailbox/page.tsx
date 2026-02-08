export const dynamic = "force-dynamic";

const DASH = "\u2014";

export default async function EInvoiceMailboxPage({
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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between rounded border border-slate-800 bg-slate-900/50 px-4 py-2 text-xs text-slate-200">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <span>E-Rechnung Mailbox</span>
        </div>
        <div className="text-xs text-slate-400">Platzhalter</div>
      </div>

      <div className="rounded border border-slate-800 bg-slate-800/60 p-3">
        <form className="flex flex-wrap items-end gap-3" method="get">
          <div>
            <label className="block text-[11px] text-slate-400">eingegangen am</label>
            <div className="flex items-center gap-2">
              <input
                type="date"
                name="from"
                defaultValue={fromRaw}
                className="w-40 rounded border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-slate-200"
              />
              <span className="text-slate-500">{DASH}</span>
              <input
                type="date"
                name="to"
                defaultValue={toRaw}
                className="w-40 rounded border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-slate-200"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] text-slate-400">Status</label>
            <select
              name="status"
              defaultValue={statusFilter}
              className="w-40 rounded border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-slate-200"
            >
              <option value="all">Alle anzeigen</option>
              <option value="unread">Neu</option>
              <option value="processed">Verarbeitet</option>
            </select>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <input
              name="q"
              defaultValue={q}
              placeholder="Suchen"
              className="w-56 rounded border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-slate-200"
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

      <div className="rounded border border-slate-800 bg-slate-800/60">
        <table className="w-full text-sm">
          <thead className="text-slate-300">
            <tr className="border-b border-slate-700">
              <th className="p-3 text-left">#</th>
              <th className="p-3 text-left">E-Rechnung-ID</th>
              <th className="p-3 text-left">Absender</th>
              <th className="p-3 text-left">eingegangen am</th>
              <th className="p-3 text-right">Betrag</th>
              <th className="p-3 text-left">Status</th>
              <th className="p-3 text-right">Aktionen</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="p-6 text-slate-400" colSpan={7}>
                Noch keine E-Rechnungen vorhanden.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
