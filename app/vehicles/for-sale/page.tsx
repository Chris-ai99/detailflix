import Link from "next/link";
import { prisma } from "@/lib/prisma";
import MarkVehicleSoldButton from "../ui/MarkVehicleSoldButton";

export const dynamic = "force-dynamic";

const DASH = "\u2014";

function formatDate(value?: Date | string | null) {
  if (!value) return DASH;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return DASH;
  return date.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function formatMoney(cents?: number | null) {
  if (typeof cents !== "number") return DASH;
  return (cents / 100).toFixed(2).replace(".", ",") + " \u20ac";
}

function ActionLink({
  href,
  title,
  tone,
  children,
}: {
  href: string;
  title: string;
  tone: "cyan" | "amber";
  children: React.ReactNode;
}) {
  const toneClass =
    tone === "cyan"
      ? "border-cyan-500/60 text-cyan-300 hover:bg-cyan-500/10"
      : "border-amber-400/60 text-amber-300 hover:bg-amber-500/10";

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

function IconEdit() {
  return (
    <svg viewBox="0 0 20 20" className="h-4 w-4" fill="currentColor" aria-hidden="true">
      <path d="M3 13.75V17h3.25L16.81 6.44l-3.25-3.25L3 13.75Z" />
      <path d="m17.71 5.04-2.75-2.75a1 1 0 0 0-1.41 0l-1.06 1.06 3.25 3.25 1.06-1.06a1 1 0 0 0 0-1.41Z" />
    </svg>
  );
}

export default async function ForSaleVehiclesPage({
  searchParams,
}: {
  searchParams?: { from?: string; to?: string; q?: string } | Promise<{ from?: string; to?: string; q?: string }>;
}) {
  const resolved = searchParams ? await searchParams : undefined;
  const fromRaw = resolved?.from ?? "";
  const toRaw = resolved?.to ?? "";
  const q = (resolved?.q ?? "").trim();

  const where: any = { isStock: true, isForSale: true, isSold: false };

  if (fromRaw || toRaw) {
    const range: any = {};
    if (fromRaw) range.gte = new Date(fromRaw);
    if (toRaw) range.lte = new Date(toRaw);
    where.createdAt = range;
  }

  if (q) {
    where.OR = [{ make: { contains: q } }, { model: { contains: q } }, { vin: { contains: q } }];
  }

  const vehicles = await prisma.vehicle.findMany({
    where,
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      make: true,
      model: true,
      vin: true,
      purchaseCents: true,
      createdAt: true,
      _count: { select: { attachments: true } },
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 rounded border border-slate-800 bg-slate-900/50 px-4 py-2 text-xs text-slate-200 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <span>Fahrzeuge Verkauf</span>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/vehicles/new"
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
        <table className="w-full min-w-[900px] text-sm">
          <thead className="text-slate-300">
            <tr className="border-b border-slate-700">
              <th className="p-3 text-left">#</th>
              <th className="p-3 text-left">Fahrzeug</th>
              <th className="p-3 text-left">VIN</th>
              <th className="p-3 text-left">Preis (EK)</th>
              <th className="p-3 text-left">Dokumente</th>
              <th className="p-3 text-left">erstellt am</th>
              <th className="p-3 text-right">Aktionen</th>
            </tr>
          </thead>
          <tbody>
            {vehicles.map((v, idx) => {
              const vehicleLabel = `${v.make ?? DASH} ${v.model ?? ""}`.trim();

              return (
                <tr key={v.id} className="border-b border-slate-700 last:border-b-0">
                  <td className="p-3 text-slate-400">{idx + 1}</td>
                  <td className="p-3 text-slate-200">{vehicleLabel || DASH}</td>
                  <td className="p-3 text-slate-200">{v.vin ?? DASH}</td>
                  <td className="p-3 text-slate-200">{formatMoney(v.purchaseCents)}</td>
                  <td className="p-3 text-slate-200">
                    <Link
                      href={`/vehicles/${v.id}#fahrzeug-dokumente`}
                      className="rounded border border-slate-600 bg-slate-900 px-2 py-1 text-xs text-slate-200 hover:bg-slate-800"
                    >
                      {v._count.attachments} Datei{v._count.attachments === 1 ? "" : "en"}
                    </Link>
                  </td>
                  <td className="p-3 text-slate-300">{formatDate(v.createdAt)}</td>
                  <td className="p-3 text-right">
                    <div className="flex justify-end gap-2">
                      <ActionLink href={`/vehicles/${v.id}`} title={"\u00d6ffnen"} tone="cyan">
                        <IconSearch />
                      </ActionLink>
                      <ActionLink href={`/vehicles/${v.id}/edit`} title="Bearbeiten" tone="amber">
                        <IconEdit />
                      </ActionLink>
                      <MarkVehicleSoldButton id={v.id} />
                    </div>
                  </td>
                </tr>
              );
            })}

            {vehicles.length === 0 && (
              <tr>
                <td className="p-6 text-slate-400" colSpan={7}>
                  Keine Fahrzeuge zum Verkauf vorhanden.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
