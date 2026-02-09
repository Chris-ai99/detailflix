import Link from "next/link";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const DASH = "\u2014";

function formatDate(value?: Date | string | null) {
  if (!value) return DASH;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return DASH;
  return date.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function ActionLink({
  href,
  title,
  children,
}: {
  href: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      title={title}
      className="inline-flex h-8 w-8 items-center justify-center rounded border border-cyan-500/60 text-cyan-300 transition hover:bg-cyan-500/10"
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

export default async function ArchivedVehiclesPage({
  searchParams,
}: {
  searchParams?: { from?: string; to?: string; q?: string } | Promise<{ from?: string; to?: string; q?: string }>;
}) {
  const resolved = searchParams ? await searchParams : undefined;
  const fromRaw = resolved?.from ?? "";
  const toRaw = resolved?.to ?? "";
  const q = (resolved?.q ?? "").trim();

  const where: any = { isSold: true };

  if (fromRaw || toRaw) {
    const range: any = {};
    if (fromRaw) range.gte = new Date(fromRaw);
    if (toRaw) range.lte = new Date(toRaw);
    where.soldAt = range;
  }

  if (q) {
    where.OR = [
      { make: { contains: q } },
      { model: { contains: q } },
      { vin: { contains: q } },
      { customer: { name: { contains: q } } },
    ];
  }

  const vehicles = await prisma.vehicle.findMany({
    where,
    orderBy: { soldAt: "desc" },
    select: {
      id: true,
      make: true,
      model: true,
      vin: true,
      mileage: true,
      year: true,
      soldAt: true,
      customer: { select: { name: true, isBusiness: true } },
      _count: { select: { attachments: true } },
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 rounded border border-slate-800 bg-slate-900/50 px-4 py-2 text-xs text-slate-200 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <span>Fahrzeuge Archiv</span>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/vehicles"
            className="inline-flex items-center gap-2 rounded bg-slate-800 px-3 py-1 text-xs font-semibold text-slate-200 hover:bg-slate-700"
          >
            Zur\u00fcck zu Kundenfahrzeugen
          </Link>
        </div>
      </div>

      <div className="rounded border border-slate-800 bg-slate-800/60 p-3">
        <form className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end" method="get">
          <div className="w-full sm:w-auto">
            <label className="block text-[11px] text-slate-400">verkauft am</label>
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
        <table className="w-full min-w-[1020px] text-sm">
          <thead className="text-slate-300">
            <tr className="border-b border-slate-700">
              <th className="p-3 text-left">#</th>
              <th className="p-3 text-left">Kunde</th>
              <th className="p-3 text-left">Fahrzeug</th>
              <th className="p-3 text-left">VIN</th>
              <th className="p-3 text-left">KM</th>
              <th className="p-3 text-left">Baujahr</th>
              <th className="p-3 text-left">Dokumente</th>
              <th className="p-3 text-left">verkauft am</th>
              <th className="p-3 text-right">Aktionen</th>
            </tr>
          </thead>
          <tbody>
            {vehicles.map((v, idx) => {
              const customerName = v.customer?.name || (v.customer?.isBusiness ? "Gewerbekunde" : DASH);
              const vehicleLabel = `${v.make ?? DASH} ${v.model ?? ""}`.trim();

              return (
                <tr key={v.id} className="border-b border-slate-700 last:border-b-0">
                  <td className="p-3 text-slate-400">{idx + 1}</td>
                  <td className="p-3 text-slate-200">{customerName}</td>
                  <td className="p-3 text-slate-200">{vehicleLabel || DASH}</td>
                  <td className="p-3 text-slate-200">{v.vin ?? DASH}</td>
                  <td className="p-3 text-slate-200">{v.mileage ?? DASH}</td>
                  <td className="p-3 text-slate-200">{v.year ?? DASH}</td>
                  <td className="p-3 text-slate-200">
                    <Link
                      href={`/vehicles/${v.id}#fahrzeug-dokumente`}
                      className="rounded border border-slate-600 bg-slate-900 px-2 py-1 text-xs text-slate-200 hover:bg-slate-800"
                    >
                      {v._count.attachments} Datei{v._count.attachments === 1 ? "" : "en"}
                    </Link>
                  </td>
                  <td className="p-3 text-slate-300">{formatDate(v.soldAt)}</td>
                  <td className="p-3 text-right">
                    <div className="flex justify-end gap-2">
                      <ActionLink href={`/vehicles/${v.id}`} title={"\u00d6ffnen"}>
                        <IconSearch />
                      </ActionLink>
                    </div>
                  </td>
                </tr>
              );
            })}

            {vehicles.length === 0 && (
              <tr>
                <td className="p-6 text-slate-400" colSpan={9}>
                  Keine archivierten Fahrzeuge vorhanden.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
