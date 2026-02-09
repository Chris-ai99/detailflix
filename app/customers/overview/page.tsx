import Link from "next/link";
import { prisma } from "@/lib/prisma";

function formatDate(value?: Date | string | null): string {
  if (!value) return "-";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function CustomerDocQuickLinks({ customerId }: { customerId: string }) {
  const query = `?customerId=${encodeURIComponent(customerId)}`;
  const className =
    "rounded border border-slate-600 bg-slate-900 px-2 py-1 text-[11px] text-slate-200 hover:bg-slate-800";
  return (
    <div className="flex flex-wrap justify-end gap-1">
      <Link href={`/offers/new${query}`} prefetch={false} className={className}>
        Angebot
      </Link>
      <Link href={`/orders/new${query}`} prefetch={false} className={className}>
        Auftrag
      </Link>
      <Link href={`/invoices/new${query}`} prefetch={false} className={className}>
        Rechnung
      </Link>
    </div>
  );
}

export default async function CustomersOverviewPage() {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [
    totalCustomers,
    businessCustomers,
    customersWithEmail,
    customersWithPhone,
    attachmentsTotal,
    signedPrivacyAgreements,
    newThisMonth,
    recentCustomers,
  ] = await Promise.all([
    prisma.customer.count(),
    prisma.customer.count({ where: { isBusiness: true } }),
    prisma.customer.count({ where: { email: { not: null } } }),
    prisma.customer.count({ where: { phone: { not: null } } }),
    prisma.customerAttachment.count(),
    prisma.customerAttachment.count({
      where: { kind: "PRIVACY_AGREEMENT_SIGNED" },
    }),
    prisma.customer.count({ where: { createdAt: { gte: startOfMonth } } }),
    prisma.customer.findMany({
      orderBy: { createdAt: "desc" },
      take: 8,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        city: true,
        createdAt: true,
      },
    }),
  ]);

  const signedRate = totalCustomers ? Math.round((signedPrivacyAgreements / totalCustomers) * 100) : 0;

  return (
    <div className="space-y-5">
      <section className="rounded-xl border border-slate-700 bg-slate-900/70 p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-xs uppercase tracking-[0.12em] text-slate-400">Kundenverwaltung</div>
            <h1 className="mt-1 text-2xl font-semibold text-slate-100">Kunden Uebersicht</h1>
            <p className="mt-1 text-sm text-slate-400">
              Kompakter Status zu Kundenbestand, Dokumenten und Datenschutz.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/customers"
              className="rounded border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-200 hover:bg-slate-700"
            >
              Kundenliste
            </Link>
            <Link
              href="/customers/new"
              className="rounded bg-cyan-600 px-3 py-2 text-sm font-semibold text-white hover:bg-cyan-500"
            >
              + Neuer Kunde
            </Link>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <article className="rounded-xl border border-slate-700 bg-slate-900/60 p-4">
          <div className="text-xs uppercase tracking-wide text-slate-400">Gesamt</div>
          <div className="mt-2 text-3xl font-semibold text-slate-100">{totalCustomers}</div>
          <div className="mt-2 text-xs text-slate-400">Davon {businessCustomers} als Geschaeftskunden markiert</div>
        </article>

        <article className="rounded-xl border border-slate-700 bg-slate-900/60 p-4">
          <div className="text-xs uppercase tracking-wide text-slate-400">Neue Kunden</div>
          <div className="mt-2 text-3xl font-semibold text-slate-100">{newThisMonth}</div>
          <div className="mt-2 text-xs text-slate-400">Seit Monatsbeginn</div>
        </article>

        <article className="rounded-xl border border-slate-700 bg-slate-900/60 p-4">
          <div className="text-xs uppercase tracking-wide text-slate-400">Kontaktabdeckung</div>
          <div className="mt-2 text-3xl font-semibold text-slate-100">
            {customersWithEmail}/{customersWithPhone}
          </div>
          <div className="mt-2 text-xs text-slate-400">E-Mail / Telefon hinterlegt</div>
        </article>

        <article className="rounded-xl border border-slate-700 bg-slate-900/60 p-4">
          <div className="text-xs uppercase tracking-wide text-slate-400">Datenschutz</div>
          <div className="mt-2 text-3xl font-semibold text-slate-100">{signedRate}%</div>
          <div className="mt-2 text-xs text-slate-400">
            {signedPrivacyAgreements} signierte Vereinbarungen bei {attachmentsTotal} Dokumenten
          </div>
        </article>
      </section>

      <section className="overflow-hidden rounded-xl border border-slate-700 bg-slate-900/50">
        <div className="flex items-center justify-between border-b border-slate-700 bg-slate-800/60 px-4 py-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-300">Letzte Kunden</h2>
          <Link href="/customers" className="text-xs text-cyan-300 hover:text-cyan-200">
            Alle anzeigen
          </Link>
        </div>

        {recentCustomers.length === 0 ? (
          <div className="px-4 py-6 text-sm text-slate-400">Noch keine Kunden vorhanden.</div>
        ) : (
          <div className="divide-y divide-slate-700/80">
            {recentCustomers.map((customer) => (
              <div key={customer.id} className="grid gap-2 px-4 py-3 md:grid-cols-[1.3fr_1fr_1fr_auto] md:items-center">
                <div>
                  <div className="font-medium text-slate-100">{customer.name || "Ohne Name"}</div>
                  <div className="text-xs text-slate-400">{customer.city || "-"}</div>
                </div>
                <div className="text-sm text-slate-300">{customer.email || "-"}</div>
                <div className="text-sm text-slate-300">{customer.phone || "-"}</div>
                <div className="flex flex-col items-end gap-2">
                  <div className="flex items-center justify-between gap-3 md:justify-end">
                    <span className="text-xs text-slate-500">{formatDate(customer.createdAt)}</span>
                    <Link
                      href={`/customers/${customer.id}`}
                      className="rounded border border-cyan-500/50 bg-cyan-500/10 px-3 py-1 text-xs text-cyan-200 hover:bg-cyan-500/20"
                    >
                      Oeffnen
                    </Link>
                  </div>
                  <CustomerDocQuickLinks customerId={customer.id} />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <div>
        <Link
          href="/dashboard"
          className="inline-flex rounded border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-slate-200 hover:bg-slate-800"
        >
          Zurueck zum Dashboard
        </Link>
      </div>
    </div>
  );
}


