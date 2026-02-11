import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { updateCustomer } from "./serverActions";
import CustomerIdentityFields from "@/app/customers/ui/CustomerIdentityFields";

const inputClass =
  "w-full rounded border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 outline-none ring-cyan-400 transition focus:ring-2";
const cardClass = "rounded-xl border border-slate-700 bg-slate-900/60 p-5";
const labelClass = "mb-1 block text-[11px] uppercase tracking-wide text-slate-400";

function formatDate(value?: Date | string | null): string {
  if (!value) return "-";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function splitName(fullName?: string | null): { firstName: string; lastName: string } {
  const name = (fullName || "").trim();
  if (!name) return { firstName: "", lastName: "" };
  const parts = name.split(/\s+/);
  if (parts.length === 1) return { firstName: parts[0], lastName: "" };
  return { firstName: parts[0], lastName: parts.slice(1).join(" ") };
}

function centsToInputEuro(cents?: number | null): string {
  if (!Number.isFinite(cents ?? null) || (cents ?? 0) <= 0) return "";
  return ((cents as number) / 100).toFixed(2);
}

export default async function EditCustomerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const customer = await prisma.customer.findUnique({
    where: { id },
    include: {
      attachments: {
        select: { id: true },
      },
    },
  });

  if (!customer) return notFound();

  const split = splitName(customer.name);
  const initialFirstName = customer.contactFirstName ?? (!customer.isBusiness ? split.firstName : "");
  const initialLastName = customer.contactLastName ?? (!customer.isBusiness ? split.lastName : "");
  const initialCompanyName = customer.companyName ?? (customer.isBusiness ? customer.name ?? "" : "");

  return (
    <div className="space-y-5">
      <section className="rounded-xl border border-slate-700 bg-slate-900/70 p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-xs uppercase tracking-[0.12em] text-slate-400">Kundenverwaltung</div>
            <h1 className="mt-1 text-2xl font-semibold text-slate-100">Kunde bearbeiten</h1>
            <p className="mt-1 text-sm text-slate-400">
              Stammdaten aktualisieren und alle verknuepften Informationen zentral pflegen.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 text-xs">
            <span className="rounded border border-slate-600 bg-slate-800/60 px-2 py-1 text-slate-300">
              Kunde erstellt: {formatDate(customer.createdAt)}
            </span>
            <span className="rounded border border-cyan-500/40 bg-cyan-500/10 px-2 py-1 text-cyan-200">
              Dokumente: {customer.attachments.length}
            </span>
          </div>
        </div>
      </section>

      <form action={updateCustomer} className="space-y-5">
        <input type="hidden" name="id" value={customer.id} />

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)_320px]">
          <section className={cardClass}>
            <h2 className="text-base font-semibold text-slate-100">Stammdaten</h2>
            <p className="mt-1 text-xs text-slate-400">Kontaktdaten und Rechnungsadresse des Kunden.</p>

            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <CustomerIdentityFields
                inputClass={inputClass}
                labelClass={labelClass}
                initialIsBusiness={customer.isBusiness}
                initialCompanyName={initialCompanyName}
                initialFirstName={initialFirstName}
                initialLastName={initialLastName}
                initialContactUseZh={customer.contactUseZh}
              />

              <div>
                <label className={labelClass}>E-Mail</label>
                <input
                  name="email"
                  type="email"
                  defaultValue={customer.email ?? ""}
                  placeholder="kunde@beispiel.de"
                  className={inputClass}
                />
              </div>

              <div>
                <label className={labelClass}>Telefon</label>
                <input
                  name="phone"
                  defaultValue={customer.phone ?? ""}
                  placeholder="+49 ..."
                  className={inputClass}
                />
              </div>

              <div className="md:col-span-2">
                <label className={labelClass}>Straße, Nr.</label>
                <input
                  name="street"
                  defaultValue={customer.street ?? ""}
                  placeholder="Musterstrasse 1"
                  className={inputClass}
                />
              </div>

              <div>
                <label className={labelClass}>PLZ</label>
                <input name="zip" defaultValue={customer.zip ?? ""} placeholder="12345" className={inputClass} />
              </div>

              <div>
                <label className={labelClass}>Stadt</label>
                <input name="city" defaultValue={customer.city ?? ""} placeholder="Berlin" className={inputClass} />
              </div>

              <div>
                <label className={labelClass}>Land</label>
                <input
                  name="country"
                  defaultValue={customer.country ?? "Deutschland"}
                  placeholder="Deutschland"
                  className={inputClass}
                />
              </div>

              <div>
                <label className={labelClass}>USt-IdNr (optional)</label>
                <input name="vatId" defaultValue={customer.vatId ?? ""} placeholder="DE..." className={inputClass} />
              </div>

              <div>
                <label className={labelClass}>Stundenverrechnungssatz netto (EUR/h, optional)</label>
                <input
                  name="hourlyRateEur"
                  type="number"
                  min={0}
                  step="0.01"
                  defaultValue={centsToInputEuro(customer.hourlyRateCents)}
                  placeholder="z. B. 60,00"
                  className={inputClass}
                />
              </div>
            </div>
          </section>

          <section className={cardClass}>
            <h2 className="text-base font-semibold text-slate-100">Interne Notiz</h2>
            <p className="mt-1 text-sm text-slate-400">
              Notizen sind nur intern sichtbar und helfen bei Rückfragen oder Arbeitsanweisungen.
            </p>
            <textarea
              name="notes"
              rows={17}
              defaultValue={customer.notes ?? ""}
              placeholder="Notizen zum Kunden..."
              className={`${inputClass} mt-3 resize-y`}
            />
          </section>

          <aside className="space-y-4">
            <div className={cardClass}>
              <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-300">Kundenfahrzeuge</h3>
              <p className="mt-2 text-sm text-slate-400">
                Fahrzeuge sind im Kundenprofil oder ueber den Fahrzeugbereich zuordenbar.
              </p>
              <Link
                href={`/customers/${customer.id}`}
                className="mt-3 inline-flex rounded border border-slate-600 bg-slate-800 px-3 py-1.5 text-xs text-slate-200 hover:bg-slate-700"
              >
                Kundenprofil öffnen
              </Link>
            </div>

            <div className={cardClass}>
              <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-300">Dokumente</h3>
              <p className="mt-2 text-sm text-slate-400">
                Hinterlegte Dokumente: {customer.attachments.length}
              </p>
              <Link
                href={`/customers/${customer.id}`}
                className="mt-3 inline-flex rounded border border-slate-600 bg-slate-800 px-3 py-1.5 text-xs text-slate-200 hover:bg-slate-700"
              >
                Dokumente verwalten
              </Link>
            </div>

            <div className={cardClass}>
              <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-300">Datenschutzvereinbarung</h3>
              <p className="mt-2 text-sm text-slate-400">
                Vorlage drucken oder als PDF speichern und danach signierte Version beim Kunden hinterlegen.
              </p>
              <Link
                href={`/customers/${customer.id}/privacy-agreement`}
                className="mt-3 inline-flex rounded bg-cyan-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-cyan-500"
              >
                Vorlage öffnen
              </Link>
            </div>
          </aside>
        </div>

        <section className="rounded-xl border border-slate-700 bg-slate-900/60 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-slate-400">Änderungen werden direkt am Kundenprofil wirksam.</p>
            <div className="flex flex-wrap items-center gap-2">
              <button className="rounded bg-cyan-600 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-500">
                Änderungen speichern
              </button>
              <Link
                href={`/customers/${customer.id}`}
                className="rounded border border-slate-600 bg-slate-900 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800"
              >
                Zurück
              </Link>
            </div>
          </div>
        </section>
      </form>
    </div>
  );
}
