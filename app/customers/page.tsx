import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import DeleteCustomerButton from "./ui/DeleteCustomerButton";

export const dynamic = "force-dynamic";

const DASH = "\u2014";

function normalizeDigits(value?: string | null) {
  return (value || "").replace(/\D+/g, "");
}

function buildPhoneNeedles(rawQuery: string) {
  const digits = normalizeDigits(rawQuery);
  if (!digits) return [] as string[];

  const needles = new Set<string>();
  const baseVariants = new Set<string>([digits]);

  if (digits.startsWith("00") && digits.length > 2) {
    baseVariants.add(digits.slice(2));
  }

  for (const base of baseVariants) {
    if (!base) continue;
    needles.add(base);

    if (base.startsWith("0") && base.length > 1) {
      const withoutLeadingZero = base.slice(1);
      if (withoutLeadingZero) needles.add(withoutLeadingZero);
    }

    // Generic country-code handling: strip possible 1-3 digit international prefix
    // and add local variants with/without trunk zero.
    for (let ccLength = 1; ccLength <= 3; ccLength += 1) {
      if (base.length <= ccLength + 5) continue;
      const local = base.slice(ccLength);
      if (!local) continue;
      needles.add(local);
      needles.add(local.replace(/^0+/, ""));
      if (!local.startsWith("0")) {
        needles.add(`0${local}`);
      }
    }
  }

  return Array.from(needles).filter((item) => item.length >= 3);
}

function includesText(value: string | null | undefined, queryLower: string) {
  return (value || "").toLowerCase().includes(queryLower);
}

function formatContactName(input: {
  isBusiness: boolean;
  name?: string | null;
  contactFirstName?: string | null;
  contactLastName?: string | null;
  contactUseZh?: boolean;
}) {
  const full = [input.contactFirstName || "", input.contactLastName || ""]
    .map((item) => item.trim())
    .filter(Boolean)
    .join(" ")
    .trim();
  if (!full) return input.isBusiness ? DASH : input.name || DASH;
  return input.contactUseZh ? `z. H. ${full}` : full;
}

function formatDate(value?: Date | string | null) {
  if (!value) return DASH;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return DASH;
  return date.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function formatLocation(city?: string | null, country?: string | null) {
  const result = [(city || "").trim(), (country || "").trim()].filter(Boolean).join(", ");
  return result || DASH;
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

function CustomerDocQuickLinks({ customerId }: { customerId: string }) {
  const query = `?customerId=${encodeURIComponent(customerId)}`;
  const linkClass =
    "rounded border border-slate-600 bg-slate-900 px-2 py-1 text-[11px] text-slate-200 hover:bg-slate-800";

  return (
    <div className="flex flex-wrap justify-end gap-1">
      <Link href={`/offers/new${query}`} prefetch={false} className={linkClass}>
        Angebot
      </Link>
      <Link href={`/orders/new${query}`} prefetch={false} className={linkClass}>
        Auftrag
      </Link>
      <Link href={`/invoices/new${query}`} prefetch={false} className={linkClass}>
        Rechnung
      </Link>
    </div>
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

export default async function CustomersPage({
  searchParams,
}: {
  searchParams?:
    | { from?: string; to?: string; q?: string }
    | Promise<{ from?: string; to?: string; q?: string }>;
}) {
  const resolved = searchParams ? await searchParams : undefined;
  const fromRaw = resolved?.from ?? "";
  const toRaw = resolved?.to ?? "";
  const q = (resolved?.q ?? "").trim();

  const where: Prisma.CustomerWhereInput = {};

  if (fromRaw || toRaw) {
    const range: Prisma.DateTimeFilter = {};
    if (fromRaw) range.gte = new Date(fromRaw);
    if (toRaw) range.lte = new Date(toRaw);
    where.createdAt = range;
  }

  const customersRaw = await prisma.customer.findMany({
    where,
    orderBy: { createdAt: "desc" },
  });
  const qLower = q.toLowerCase();
  const phoneNeedles = buildPhoneNeedles(q);

  const customers = q
    ? customersRaw.filter((customer) => {
        const textMatch =
          includesText(customer.name, qLower) ||
          includesText(customer.companyName, qLower) ||
          includesText(customer.contactFirstName, qLower) ||
          includesText(customer.contactLastName, qLower) ||
          includesText(customer.email, qLower) ||
          includesText(customer.phone, qLower) ||
          includesText(customer.vatId, qLower) ||
          includesText(customer.city, qLower) ||
          includesText(customer.country, qLower);

        if (textMatch) return true;
        if (phoneNeedles.length === 0) return false;

        const phoneDigits = normalizeDigits(customer.phone);
        return phoneNeedles.some((needle) => phoneDigits.includes(needle));
      })
    : customersRaw;

  return (
    <div className="space-y-5">
      <section className="rounded-xl border border-slate-700 bg-slate-900/70 p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-xs uppercase tracking-[0.12em] text-slate-400">Kundenverwaltung</div>
            <h1 className="mt-1 text-xl font-semibold text-slate-100">Kunden</h1>
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded border border-slate-600 bg-slate-800/60 px-2 py-1 text-xs text-slate-300">
              {customers.length} Ergebnis{customers.length === 1 ? "" : "se"}
            </span>
            <Link
              href="/customers/new"
              className="inline-flex items-center gap-2 rounded bg-cyan-600 px-3 py-2 text-sm font-semibold text-white hover:bg-cyan-500"
            >
              + Neuer Kunde
            </Link>
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-slate-700 bg-slate-900/60 p-4">
        <form className="grid gap-3 lg:grid-cols-[1fr_auto]" method="get">
          <div className="grid gap-3 md:grid-cols-[auto_auto_1fr] md:items-end">
            <label className="space-y-1">
              <span className="block text-[11px] uppercase tracking-wide text-slate-400">Von</span>
              <input
                type="date"
                name="from"
                defaultValue={fromRaw}
                className="w-full rounded border border-slate-600 bg-slate-900 px-2 py-1.5 text-sm text-slate-100"
              />
            </label>
            <label className="space-y-1">
              <span className="block text-[11px] uppercase tracking-wide text-slate-400">Bis</span>
              <input
                type="date"
                name="to"
                defaultValue={toRaw}
                className="w-full rounded border border-slate-600 bg-slate-900 px-2 py-1.5 text-sm text-slate-100"
              />
            </label>
            <label className="space-y-1">
              <span className="block text-[11px] uppercase tracking-wide text-slate-400">Suche</span>
              <input
                name="q"
                defaultValue={q}
                placeholder="Name, E-Mail, Telefon, Ort ..."
                className="w-full rounded border border-slate-600 bg-slate-900 px-2 py-1.5 text-sm text-slate-100"
              />
            </label>
          </div>

          <div className="flex items-end gap-2">
            <button
              type="submit"
              className="rounded bg-slate-800 px-3 py-2 text-sm text-slate-100 hover:bg-slate-700"
            >
              Filtern
            </button>
            <Link
              href="/customers"
              className="rounded border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-slate-300 hover:bg-slate-800"
            >
              Zuruecksetzen
            </Link>
          </div>
        </form>
      </section>

      <section className="overflow-hidden rounded-xl border border-slate-700 bg-slate-900/50">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-800/70 text-slate-300">
              <tr className="border-b border-slate-700">
                <th className="p-3 text-left">#</th>
                <th className="p-3 text-left">Kunde</th>
                <th className="p-3 text-left">Kontakt</th>
                <th className="p-3 text-left">Ort</th>
                <th className="p-3 text-left">Erstellt am</th>
                <th className="p-3 text-right">Aktionen</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((c, idx) => {
                const customerName =
                  (c.isBusiness ? c.companyName : c.name)?.trim() || c.name || "Ohne Name";
                const contactName = formatContactName({
                  isBusiness: c.isBusiness,
                  name: c.name,
                  contactFirstName: c.contactFirstName,
                  contactLastName: c.contactLastName,
                  contactUseZh: c.contactUseZh,
                });

                return (
                  <tr
                    key={c.id}
                    className="border-b border-slate-700/80 transition hover:bg-slate-800/40 last:border-b-0"
                  >
                    <td className="p-3 text-slate-500">{idx + 1}</td>
                    <td className="p-3 text-slate-100">
                      <div className="font-medium">{customerName}</div>
                      <div className="text-xs text-slate-400">
                        {c.isBusiness ? "Unternehmen" : "Privat"} | {c.vatId || DASH}
                      </div>
                    </td>
                    <td className="p-3 text-slate-300">
                      <div>{c.email ?? DASH}</div>
                      <div className="text-xs text-slate-500">{c.phone ?? DASH}</div>
                      <div className="text-xs text-slate-500">{contactName}</div>
                    </td>
                    <td className="p-3 text-slate-300">{formatLocation(c.city, c.country)}</td>
                    <td className="p-3 text-slate-300">{formatDate(c.createdAt)}</td>
                    <td className="p-3 text-right">
                      <div className="flex flex-col items-end gap-2">
                        <div className="flex justify-end gap-2">
                          <ActionLink href={`/customers/${c.id}`} title="Oeffnen" tone="cyan">
                            <IconSearch />
                          </ActionLink>
                          <ActionLink href={`/customers/${c.id}/edit`} title="Bearbeiten" tone="amber">
                            <IconEdit />
                          </ActionLink>
                          <DeleteCustomerButton id={c.id} />
                        </div>
                        <CustomerDocQuickLinks customerId={c.id} />
                      </div>
                    </td>
                  </tr>
                );
              })}

              {customers.length === 0 && (
                <tr>
                  <td className="p-6 text-slate-400" colSpan={6}>
                    Noch keine Kunden vorhanden.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}


