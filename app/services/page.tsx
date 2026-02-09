import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { minutesToHHMM } from "@/lib/time";
import DeleteServiceButton from "./ui/DeleteServiceButton";

export const dynamic = "force-dynamic";

const DASH = "\u2014";

function formatMoney(cents?: number | null) {
  if (typeof cents !== "number") return DASH;
  return (cents / 100).toFixed(2).replace(".", ",") + " \u20ac";
}

function calcDefaultPriceCents(s: any): number {
  if (s.pricingType === "AW") {
    const qty = typeof s.awDefaultQty === "number" ? s.awDefaultQty : 1;
    const unit = s.awUnitPriceCents ?? 0;
    return Math.round(unit * qty);
  }
  const rate = s.hourlyRateCents ?? 0;
  const mins = s.defaultMinutes ?? 0;
  return Math.round(rate * (mins / 60));
}

function formatTime(s: any) {
  if (s.pricingType === "AW") {
    return `${s.awDefaultQty ?? 1}x ${s.awDurationMinutes ?? 60}min`;
  }
  const hhmm = minutesToHHMM(s.defaultMinutes ?? 0);
  return hhmm ? hhmm : DASH;
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

function IconEdit() {
  return (
    <svg viewBox="0 0 20 20" className="h-4 w-4" fill="currentColor" aria-hidden="true">
      <path d="M3 13.75V17h3.25L16.81 6.44l-3.25-3.25L3 13.75Z" />
      <path d="m17.71 5.04-2.75-2.75a1 1 0 0 0-1.41 0l-1.06 1.06 3.25 3.25 1.06-1.06a1 1 0 0 0 0-1.41Z" />
    </svg>
  );
}

function IconGear() {
  return (
    <svg viewBox="0 0 20 20" className="h-4 w-4" fill="currentColor" aria-hidden="true">
      <path d="M9.87 1.5a1 1 0 0 1 .97.76l.23.94a6.64 6.64 0 0 1 1.3.76l.9-.38a1 1 0 0 1 1.25.46l.95 1.65a1 1 0 0 1-.25 1.3l-.76.62c.06.35.09.7.09 1.06s-.03.71-.09 1.06l.76.62a1 1 0 0 1 .25 1.3l-.95 1.65a1 1 0 0 1-1.25.46l-.9-.38a6.64 6.64 0 0 1-1.3.76l-.23.94a1 1 0 0 1-.97.76H8.13a1 1 0 0 1-.97-.76l-.23-.94a6.64 6.64 0 0 1-1.3-.76l-.9.38a1 1 0 0 1-1.25-.46l-.95-1.65a1 1 0 0 1 .25-1.3l.76-.62A6.9 6.9 0 0 1 3.5 10c0-.36.03-.71.09-1.06l-.76-.62a1 1 0 0 1-.25-1.3l.95-1.65a1 1 0 0 1 1.25-.46l.9.38c.4-.31.83-.57 1.3-.76l.23-.94A1 1 0 0 1 8.13 1.5h1.74Zm.13 5.25a3.25 3.25 0 1 0 0 6.5 3.25 3.25 0 0 0 0-6.5Z" />
    </svg>
  );
}

export default async function ServicesPage({
  searchParams,
}: {
  searchParams?:
    | { q?: string; status?: string; from?: string; to?: string }
    | Promise<{ q?: string; status?: string; from?: string; to?: string }>;
}) {
  const resolved = searchParams ? await searchParams : undefined;
  const q = (resolved?.q ?? "").trim();
  const statusFilter = resolved?.status ?? "all";
  const fromRaw = resolved?.from ?? "";
  const toRaw = resolved?.to ?? "";

  const where: any = {};

  if (statusFilter === "active") where.active = true;
  if (statusFilter === "inactive") where.active = false;

  if (fromRaw || toRaw) {
    const range: any = {};
    if (fromRaw) range.gte = new Date(fromRaw);
    if (toRaw) range.lte = new Date(toRaw);
    where.createdAt = range;
  }

  if (q) {
    where.OR = [{ name: { contains: q } }, { category: { contains: q } }];
  }

  const services = await prisma.serviceItem.findMany({
    where,
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 rounded border border-slate-800 bg-slate-900/50 px-4 py-2 text-xs text-slate-200 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <span>Leistungen</span>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/settings"
            className="inline-flex h-8 w-8 items-center justify-center rounded border border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700"
            title="Einstellungen"
          >
            <IconGear />
          </Link>
          <Link
            href="/services/new"
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
            <label className="block text-[11px] text-slate-400">Status</label>
            <select
              name="status"
              defaultValue={statusFilter}
              className="w-full rounded border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-slate-200 sm:w-40"
            >
              <option value="all">Alle anzeigen</option>
              <option value="active">Aktiv</option>
              <option value="inactive">Inaktiv</option>
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
              <th className="p-3 text-left">Service</th>
              <th className="p-3 text-left">Preis</th>
              <th className="p-3 text-left">Zeit</th>
              <th className="p-3 text-left">Kategorie</th>
              <th className="p-3 text-left">Material</th>
              <th className="p-3 text-left">erstellt am</th>
              <th className="p-3 text-right">Umsatz</th>
              <th className="p-3 text-left">Status</th>
              <th className="p-3 text-right">Aktionen</th>
            </tr>
          </thead>
          <tbody>
            {services.map((s, idx) => {
              const priceCents = calcDefaultPriceCents(s);
              const timeText = formatTime(s);
              const materialText =
                (s.materialPercent ?? 0) > 0 || (s.materialFixedCents ?? 0) > 0
                  ? `${s.materialPercent ?? 0}% + ${formatMoney(s.materialFixedCents ?? 0)}`
                  : "0%";

              return (
                <tr key={s.id} className="border-b border-slate-700 last:border-b-0">
                  <td className="p-3 text-slate-400">{idx + 1}</td>
                  <td className="p-3">
                    <Link href={`/services/${s.id}`} className="text-cyan-300 hover:underline">
                      {s.name}
                    </Link>
                  </td>
                  <td className="p-3 text-slate-200">{formatMoney(priceCents)}</td>
                  <td className="p-3 text-slate-200">{timeText}</td>
                  <td className="p-3 text-slate-200">{s.category ?? DASH}</td>
                  <td className="p-3 text-slate-200">{materialText}</td>
                  <td className="p-3 text-slate-300">
                    {new Date(s.createdAt).toLocaleDateString("de-DE", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                    })}
                  </td>
                  <td className="p-3 text-right text-slate-500">{DASH}</td>
                  <td className="p-3">
                    {s.active ? (
                      <span className="text-xs text-cyan-300">aktiv</span>
                    ) : (
                      <span className="text-xs text-slate-400">inaktiv</span>
                    )}
                  </td>
                  <td className="p-3 text-right">
                    <div className="flex justify-end gap-2">
                      <ActionLink href={`/services/${s.id}/edit`} title="Bearbeiten" tone="amber">
                        <IconEdit />
                      </ActionLink>
                      <DeleteServiceButton serviceId={s.id} />
                    </div>
                  </td>
                </tr>
              );
            })}

            {services.length === 0 && (
              <tr>
                <td className="p-6 text-slate-400" colSpan={10}>
                  Noch keine Leistungen vorhanden.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
