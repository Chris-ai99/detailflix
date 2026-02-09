import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { DocumentStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

type MonthPoint = {
  key: string;
  label: string;
  valueCents: number;
};

function formatMoney(cents: number | null | undefined) {
  const value = typeof cents === "number" ? cents : 0;
  return (value / 100).toLocaleString("de-DE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }) + " \u20ac";
}

function formatDate(value: Date | string | null | undefined) {
  if (!value) return "\u2014";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "\u2014";
  return date.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function monthKey(d: Date) {
  return `${d.getFullYear()}-${d.getMonth() + 1}`;
}

function buildMonthRange(months: number) {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() - (months - 1), 1);
  const out: { key: string; label: string; date: Date }[] = [];
  for (let i = 0; i < months; i++) {
    const d = new Date(start.getFullYear(), start.getMonth() + i, 1);
    out.push({
      key: monthKey(d),
      label: d.toLocaleDateString("de-DE", { month: "short", year: "2-digit" }),
      date: d,
    });
  }
  return out;
}

function buildMonthlySeries(
  months: { key: string; label: string }[],
  docs: { issueDate: Date; grossTotalCents: number | null }[]
): MonthPoint[] {
  const map = new Map<string, number>();
  for (const d of docs) {
    const key = monthKey(d.issueDate);
    map.set(key, (map.get(key) ?? 0) + (d.grossTotalCents ?? 0));
  }
  return months.map((m) => ({
    key: m.key,
    label: m.label,
    valueCents: map.get(m.key) ?? 0,
  }));
}

function BarChart({ data, barClassName }: { data: MonthPoint[]; barClassName: string }) {
  const max = Math.max(1, ...data.map((d) => d.valueCents));

  return (
    <div className="flex h-44 items-end gap-2 px-2 pb-1">
      {data.map((p) => {
        const pct = Math.round((p.valueCents / max) * 100);
        return (
          <div key={p.key} className="flex min-w-0 flex-1 flex-col items-center">
            <div className="relative h-36 w-full">
              <div
                className={`absolute bottom-0 w-full rounded-sm ${barClassName}`}
                style={{ height: `${pct}%` }}
                title={`${p.label}: ${formatMoney(p.valueCents)}`}
              />
            </div>
            <div className="mt-2 w-full truncate text-center text-[10px] text-slate-400">
              {p.label}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function IconButton({
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
      className="inline-flex h-8 w-8 items-center justify-center rounded border border-slate-600 text-slate-200 hover:bg-slate-800"
    >
      {children}
    </Link>
  );
}

function QuickTile({
  href,
  label,
  tone,
}: {
  href: string;
  label: string;
  tone: "olive" | "cyan" | "gray" | "orange";
}) {
  const toneClass =
    tone === "olive"
      ? "bg-lime-200/70 text-slate-900"
      : tone === "cyan"
        ? "bg-cyan-200/90 text-slate-900"
        : tone === "orange"
          ? "bg-amber-200/90 text-slate-900"
          : "bg-slate-200/90 text-slate-900";

  return (
    <Link
      href={href}
      className={`flex items-center justify-center gap-2 rounded border border-slate-800/40 px-4 py-3 text-sm font-semibold ${toneClass}`}
    >
      {label}
    </Link>
  );
}

function PlaceholderCard({
  href,
  title,
  description,
}: {
  href: string;
  title: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="rounded border border-slate-700 bg-slate-800/70 px-4 py-3 text-left text-slate-200 hover:border-slate-500"
    >
      <div className="text-sm font-semibold">{title}</div>
      <div className="mt-1 text-xs text-slate-400">{description}</div>
    </Link>
  );
}

function StatCard({
  value,
  caption,
  subcaption,
  accent,
  href,
}: {
  value: string;
  caption: string;
  subcaption?: string;
  accent: "green" | "cyan";
  href: string;
}) {
  const accentClass =
    accent === "green"
      ? "text-emerald-600 border-emerald-200"
      : "text-cyan-600 border-cyan-200";

  return (
    <Link
      href={href}
      className="block rounded border border-slate-200 bg-white px-4 py-3 text-slate-900 shadow-sm hover:shadow"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div
            className={`flex h-9 w-9 items-center justify-center rounded-full border bg-white ${accentClass}`}
            aria-hidden="true"
          >
            {"\u20ac"}
          </div>
          <div>
            <div className="text-xs text-slate-500">{caption}</div>
            <div className="text-xl font-semibold">{value}</div>
          </div>
        </div>
        {subcaption ? (
          <div className="text-right text-[11px] text-slate-500">{subcaption}</div>
        ) : null}
      </div>
    </Link>
  );
}

function Panel({
  title,
  right,
  headerTone,
  children,
}: {
  title: string;
  right?: React.ReactNode;
  headerTone: "green" | "orange" | "blue" | "olive";
  children: React.ReactNode;
}) {
  const headerColor =
    headerTone === "green"
      ? "bg-emerald-400/30 text-emerald-100"
      : headerTone === "orange"
        ? "bg-amber-400/30 text-amber-100"
        : headerTone === "olive"
          ? "bg-lime-400/30 text-lime-100"
          : "bg-sky-400/30 text-sky-100";

  return (
    <div className="overflow-hidden rounded border border-slate-700 bg-slate-800/60">
      <div className={`flex items-center justify-between gap-4 px-3 py-2 text-xs font-semibold ${headerColor}`}>
        <div>{title}</div>
        <div className="text-[11px] text-slate-200">{right}</div>
      </div>
      <div className="p-3">{children}</div>
    </div>
  );
}

function ActionIcon({
  href,
  title,
  tone,
  children,
}: {
  href: string;
  title: string;
  tone: "cyan" | "amber" | "indigo" | "rose";
  children: React.ReactNode;
}) {
  const toneClass =
    tone === "cyan"
      ? "border-cyan-500/60 text-cyan-300 hover:bg-cyan-500/10"
      : tone === "amber"
        ? "border-amber-400/60 text-amber-300 hover:bg-amber-500/10"
        : tone === "indigo"
          ? "border-indigo-400/60 text-indigo-300 hover:bg-indigo-500/10"
          : "border-rose-500/60 text-rose-300 hover:bg-rose-500/10";

  return (
    <Link
      href={href}
      title={title}
      className={`inline-flex h-7 w-7 items-center justify-center rounded border text-xs transition ${toneClass}`}
    >
      {children}
    </Link>
  );
}

export default async function DashboardPage() {
  const months = buildMonthRange(12);
  const from = months[0]?.date ?? new Date(new Date().getFullYear(), new Date().getMonth() - 11, 1);

  const [
    unpaidAgg,
    invoiceRevenueAgg,
    offerRevenueAgg,
    customersCount,
    vehiclesCount,
    invoiceDocsForChart,
    offerDocsForChart,
    recentOrders,
    recentVehicles,
  ] = await Promise.all([
    prisma.document.aggregate({
      where: {
        docType: "INVOICE",
        isFinal: true,
        status: DocumentStatus.SENT,
      },
      _sum: { grossTotalCents: true },
      _count: { _all: true },
    }),
    prisma.document.aggregate({
      where: {
        docType: "INVOICE",
        isFinal: true,
        status: { in: [DocumentStatus.SENT, DocumentStatus.PAID] },
      },
      _sum: { grossTotalCents: true },
    }),
    prisma.document.aggregate({
      where: {
        docType: "OFFER",
        isFinal: true,
      },
      _sum: { grossTotalCents: true },
    }),
    prisma.customer.count(),
    prisma.vehicle.count({ where: { isStock: false, isSold: false } }),
    prisma.document.findMany({
      where: {
        docType: "INVOICE",
        isFinal: true,
        status: { in: [DocumentStatus.SENT, DocumentStatus.PAID] },
        issueDate: { gte: from },
      },
      select: { issueDate: true, grossTotalCents: true },
    }),
    prisma.document.findMany({
      where: { docType: "OFFER", isFinal: true, issueDate: { gte: from } },
      select: { issueDate: true, grossTotalCents: true },
    }),
    prisma.document.findMany({
      where: { docType: "PURCHASE_CONTRACT" },
      orderBy: { createdAt: "desc" },
      take: 12,
      select: {
        id: true,
        docNumber: true,
        status: true,
        issueDate: true,
        deliveryDate: true,
        grossTotalCents: true,
        customer: { select: { id: true, name: true, isBusiness: true } },
        vehicle: { select: { id: true, make: true, model: true, vin: true } },
        vehicleMake: true,
        vehicleModel: true,
        vehicleVin: true,
      },
    }),
    prisma.vehicle.findMany({
      where: { isStock: false, isSold: false },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: {
        id: true,
        make: true,
        model: true,
        vin: true,
        year: true,
        mileage: true,
        createdAt: true,
        customer: { select: { id: true, name: true, isBusiness: true } },
      },
    }),
  ]);

  const unpaidSum = unpaidAgg._sum.grossTotalCents ?? 0;
  const unpaidCount = unpaidAgg._count._all ?? 0;
  const invoiceRevenue = invoiceRevenueAgg._sum.grossTotalCents ?? 0;
  const offerRevenue = offerRevenueAgg._sum.grossTotalCents ?? 0;

  const invoiceSeries = buildMonthlySeries(months, invoiceDocsForChart);
  const offerSeries = buildMonthlySeries(months, offerDocsForChart);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <img
            src="/detailix-wordmark.svg"
            alt="Autosello"
            className="h-7 w-auto sm:h-9"
            loading="lazy"
          />
          <img
            src="/detailix-car.png"
            alt="Autosello Fahrzeug"
            className="h-10 w-auto object-contain sm:h-12"
            loading="lazy"
          />
          <div className="text-xs uppercase tracking-[0.2em] text-slate-500">Software</div>
        </div>
        <div className="flex items-center gap-2 self-end sm:self-auto">
          <IconButton href="/settings" title="Einstellungen">{"\u2699"}</IconButton>
          <IconButton href="/profile" title="Profil">{"\uD83D\uDC64"}</IconButton>
        </div>
      </div>

      <div className="text-sm text-slate-300">Dashboard</div>

      <div className="grid grid-cols-12 gap-3">
        <div className="col-span-12 md:col-span-3">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-1">
            <QuickTile href="/orders" label={"Auftr\u00e4ge"} tone="olive" />
            <QuickTile href="/invoices" label="Rechnungen" tone="cyan" />
          </div>
        </div>

        <div className="col-span-12 md:col-span-4">
          <StatCard
            href="/invoices?status=unpaid"
            value={formatMoney(unpaidSum)}
            caption="Unbezahlte Rechnungen"
            subcaption={`${unpaidCount} offen`}
            accent="green"
          />
        </div>

        <div className="col-span-12 md:col-span-3">
          <StatCard
            href="/invoices"
            value={formatMoney(invoiceRevenue)}
            caption="Umsatz Rechnungen"
            subcaption="Summe (final)"
            accent="cyan"
          />
        </div>

        <div className="col-span-12 md:col-span-2">
          <div className="grid grid-cols-1 gap-2">
            <QuickTile href="/customers" label={`Kunden (${customersCount})`} tone="gray" />
            <QuickTile href="/offers" label="Angebote" tone="orange" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-3">
        <div className="col-span-12 lg:col-span-5 space-y-3">
          <Panel
            title="Rechnungen"
            headerTone="green"
            right={<span>Umsatz: {formatMoney(invoiceRevenue)}</span>}
          >
            <BarChart data={invoiceSeries} barClassName="bg-cyan-500/70" />
          </Panel>

          <Panel
            title="Angebote"
            headerTone="orange"
            right={<span>Umsatz: {formatMoney(offerRevenue)}</span>}
          >
            <BarChart data={offerSeries} barClassName="bg-cyan-400/70" />
          </Panel>
        </div>

        <div className="col-span-12 lg:col-span-7">
          <Panel title={"Auftr\u00e4ge"} headerTone="blue" right={<span>{"Letzte Auftr\u00e4ge"}</span>}>
            <div className="flex flex-col gap-3 border-b border-slate-800 pb-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="w-full flex-1">
                <input
                  placeholder="Suchen"
                  className="w-full rounded border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-200"
                />
              </div>
              <div className="flex w-full gap-2 sm:w-auto">
                <Link
                  href="/orders"
                  className="flex-1 rounded bg-slate-800 px-3 py-2 text-center text-xs hover:bg-slate-700 sm:flex-none"
                >
                  Liste
                </Link>
                <Link
                  href="/orders/new"
                  className="flex-1 rounded bg-cyan-600 px-3 py-2 text-center text-xs text-white hover:bg-cyan-500 sm:flex-none"
                >
                  + Neu
                </Link>
              </div>
            </div>

            <div className="mt-3 max-h-[520px] space-y-3 overflow-auto pr-1">
              {recentOrders.map((order) => {
                const customerName =
                  order.customer?.name || (order.customer?.isBusiness ? "Gewerbekunde" : "\u2014");
                const vehicleMake = order.vehicle?.make ?? order.vehicleMake ?? "";
                const vehicleModel = order.vehicle?.model ?? order.vehicleModel ?? "";
                const vehicleVin = order.vehicle?.vin ?? order.vehicleVin ?? "";
                const vehicleMakeModel = `${vehicleMake} ${vehicleModel}`.trim();
                const vehicleLabel = vehicleMakeModel
                  ? vehicleVin
                    ? `${vehicleMakeModel} (${vehicleVin})`
                    : vehicleMakeModel
                  : vehicleVin || "\u2014";

                return (
                  <div
                    key={order.id}
                    className="rounded border border-slate-700 bg-slate-800/60 p-3"
                  >
                    <div className="grid gap-3 text-xs sm:grid-cols-[140px_1fr] sm:gap-4">
                      <div className="space-y-1 text-slate-400">
                        <div>Auftrag-ID</div>
                        <div>Kunde</div>
                        <div>Fahrzeug</div>
                        <div>erstellt am</div>
                        <div>Lieferdatum</div>
                        <div>Betrag</div>
                        <div>Status</div>
                        <div>Aktionen</div>
                      </div>
                      <div className="space-y-1 text-slate-200">
                        <div className="font-semibold text-cyan-300">
                          <Link href={`/documents/${order.id}/edit`} className="hover:underline">
                            {order.docNumber}
                          </Link>
                        </div>
                        <div>{customerName}</div>
                        <div>{vehicleLabel}</div>
                        <div className="text-slate-300">{formatDate(order.issueDate)}</div>
                        <div className="text-slate-300">{formatDate(order.deliveryDate)}</div>
                        <div>{formatMoney(order.grossTotalCents)}</div>
                        <div>{order.status}</div>
                        <div className="flex flex-wrap gap-2">
                          <ActionIcon href={`/documents/${order.id}/edit`} title={"\u00d6ffnen"} tone="cyan">
                            {"\uD83D\uDD0D"}
                          </ActionIcon>
                          <ActionIcon
                            href={`/api/documents/${order.id}/pdf`}
                            title="PDF"
                            tone="indigo"
                          >
                            {"\u2B07"}
                          </ActionIcon>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}

              {recentOrders.length === 0 && (
                <div className="rounded border border-slate-700 bg-slate-800 p-4 text-sm text-slate-300">
                  Noch keine Auftr\u00e4ge vorhanden.
                </div>
              )}
            </div>
          </Panel>
        </div>
      </div>

      <Panel
        title="Fahrzeugannahmen"
        headerTone="olive"
        right={<span>Fahrzeuge Kunden: {vehiclesCount}</span>}
      >
        <div className="flex flex-col gap-3 border-b border-slate-800 pb-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-xs text-slate-400">{"\u00dcbersicht"}</div>
          <div className="flex w-full items-center gap-2 sm:w-auto">
            <input
              placeholder="Suchen"
              className="w-full rounded border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-slate-200 sm:w-48"
            />
            <Link
              href="/vehicles"
              className="rounded bg-slate-800 px-3 py-1 text-xs hover:bg-slate-700"
            >
              Liste
            </Link>
          </div>
        </div>
        <div className="mt-3 overflow-x-auto rounded border border-slate-700 bg-slate-800/60">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="text-slate-300">
              <tr className="border-b border-slate-800">
                <th className="p-3 text-left">#</th>
                <th className="p-3 text-left">Kunde</th>
                <th className="p-3 text-left">Fahrzeug</th>
                <th className="p-3 text-left">erstellt am</th>
                <th className="p-3 text-left">VIN</th>
                <th className="p-3 text-right">Aktionen</th>
              </tr>
            </thead>
            <tbody>
              {recentVehicles.map((v, idx) => {
                const customerName =
                  v.customer?.name || (v.customer?.isBusiness ? "Gewerbekunde" : "\u2014");
                const vehicleLabel = `${v.make ?? "\u2014"} ${v.model ?? ""}`.trim();
                return (
                  <tr key={v.id} className="border-b border-slate-800 last:border-b-0">
                    <td className="p-3 text-slate-400">{idx + 1}</td>
                    <td className="p-3 text-slate-200">{customerName}</td>
                    <td className="p-3 text-slate-200">{vehicleLabel}</td>
                    <td className="p-3 text-slate-300">{formatDate(v.createdAt)}</td>
                    <td className="p-3 text-slate-300">{v.vin ?? "\u2014"}</td>
                    <td className="p-3 text-right">
                      <div className="flex justify-end gap-2">
                        <ActionIcon href={`/vehicles/${v.id}`} title={"\u00d6ffnen"} tone="cyan">
                          {"\uD83D\uDD0D"}
                        </ActionIcon>
                        <ActionIcon href={`/vehicles/${v.id}/edit`} title="Bearbeiten" tone="amber">
                          {"\u270F"}
                        </ActionIcon>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {recentVehicles.length === 0 && (
                <tr>
                  <td className="p-6 text-slate-400" colSpan={6}>
                    Keine Kundenfahrzeuge vorhanden.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Panel>

      <div className="rounded border border-slate-700 bg-slate-800/60 px-4 py-4">
        <div className="text-sm font-semibold text-slate-200">
          Weitere Funktionen (Platzhalter)
        </div>
        <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-3">
          <PlaceholderCard
            href="/dellenkalkulation"
            title="Dellenkalkulation"
            description="Platzhalter - Dellen- & Schadensanalyse."
          />
          <PlaceholderCard
            href="/appointments"
            title="Termine"
            description="Platzhalter - Terminverwaltung."
          />
          <PlaceholderCard
            href="/equipment-rental"
            title={"Ger\u00e4temiete"}
            description="Platzhalter - Vermietung von Equipment."
          />
          <PlaceholderCard
            href="/apps"
            title="APPs"
            description="Platzhalter - App-\u00dcbersicht."
          />
          <PlaceholderCard
            href="/updates"
            title="Updates"
            description="Platzhalter - Versions- & Updateinfos."
          />
          <PlaceholderCard
            href="/e-invoice-mailbox"
            title="E-Rechnung Mailbox"
            description="Platzhalter - Eingang/Versand."
          />
          <PlaceholderCard
            href="/customers/overview"
            title={"Kunden \u00dcbersicht"}
            description="Platzhalter - KPI/\u00dcbersicht."
          />
        </div>
      </div>

      <div className="grid grid-cols-12 gap-3">
        <div className="col-span-12 md:col-span-6 rounded border border-amber-500/30 bg-amber-500/15 px-4 py-3 text-amber-100">
          <div className="text-sm font-semibold">APS PTG Berichtsfunktion</div>
          <div className="mt-1 text-xs">Platzhalter-Hinweis (kann sp\u00e4ter an echte Features gekoppelt werden).</div>
          <div className="mt-3 flex gap-2">
            <Link
              href="/apps/aps-ptg"
              className="rounded bg-amber-500/20 px-3 py-1 text-xs text-amber-100 hover:bg-amber-500/30"
            >
              {"\u00d6ffnen"}
            </Link>
          </div>
        </div>
        <div className="col-span-12 md:col-span-6 rounded border border-amber-500/30 bg-amber-500/15 px-4 py-3 text-amber-100">
          <div className="text-sm font-semibold">Mitarbeiter-Modul</div>
          <div className="mt-1 text-xs">Platzhalter-Hinweis (kann sp\u00e4ter an echte Features gekoppelt werden).</div>
          <div className="mt-3 flex gap-2">
            <Link
              href="/employees"
              className="rounded bg-amber-500/20 px-3 py-1 text-xs text-amber-100 hover:bg-amber-500/30"
            >
              {"\u00d6ffnen"}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
