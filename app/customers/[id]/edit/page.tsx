import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { updateCustomer } from "./serverActions";

const inputClass = "w-full rounded border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500";
const cardClass = "rounded border border-slate-800 bg-slate-900/70 p-4";

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

  return (
    <div className="space-y-4">
      <div className="rounded border border-slate-800 bg-slate-900/50 px-4 py-3">
        <h1 className="text-2xl font-bold text-slate-100">Kunde bearbeiten</h1>
        <p className="mt-1 text-sm text-slate-400">
          Datenpflege im gleichen Ablauf wie beim Anlegen. Kundentyp und Skonto bleiben ausgeblendet.
        </p>
      </div>

      <form action={updateCustomer} className="space-y-4">
        <input type="hidden" name="id" value={customer.id} />

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)_320px]">
          <section className={cardClass}>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-300">Stammdaten</h2>

            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <div className="md:col-span-2">
                <label className="mb-1 block text-xs text-slate-400">Name / Firma *</label>
                <input
                  name="name"
                  required
                  defaultValue={customer.name ?? ""}
                  placeholder="Max Mustermann GmbH"
                  className={inputClass}
                />
              </div>

              <div>
                <label className="mb-1 block text-xs text-slate-400">E-Mail</label>
                <input
                  name="email"
                  type="email"
                  defaultValue={customer.email ?? ""}
                  placeholder="kunde@beispiel.de"
                  className={inputClass}
                />
              </div>

              <div>
                <label className="mb-1 block text-xs text-slate-400">Telefon</label>
                <input
                  name="phone"
                  defaultValue={customer.phone ?? ""}
                  placeholder="+49 ..."
                  className={inputClass}
                />
              </div>

              <div className="md:col-span-2">
                <label className="mb-1 block text-xs text-slate-400">Strasse, Nr.</label>
                <input
                  name="street"
                  defaultValue={customer.street ?? ""}
                  placeholder="Musterstrasse 1"
                  className={inputClass}
                />
              </div>

              <div>
                <label className="mb-1 block text-xs text-slate-400">PLZ</label>
                <input name="zip" defaultValue={customer.zip ?? ""} placeholder="12345" className={inputClass} />
              </div>

              <div>
                <label className="mb-1 block text-xs text-slate-400">Stadt</label>
                <input name="city" defaultValue={customer.city ?? ""} placeholder="Berlin" className={inputClass} />
              </div>

              <div>
                <label className="mb-1 block text-xs text-slate-400">Land</label>
                <input
                  name="country"
                  defaultValue={customer.country ?? "Deutschland"}
                  placeholder="Deutschland"
                  className={inputClass}
                />
              </div>

              <div>
                <label className="mb-1 block text-xs text-slate-400">USt-IdNr (optional)</label>
                <input name="vatId" defaultValue={customer.vatId ?? ""} placeholder="DE..." className={inputClass} />
              </div>
            </div>
          </section>

          <section className={cardClass}>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-300">Interne Notiz</h2>
            <p className="mt-1 text-xs text-slate-400">
              Notizen sind nur intern sichtbar und helfen bei Rueckfragen oder Arbeitsanweisungen.
            </p>
            <textarea
              name="notes"
              rows={16}
              defaultValue={customer.notes ?? ""}
              placeholder="Notizen zum Kunden..."
              className={`${inputClass} mt-3 resize-y`}
            />
          </section>

          <aside className="space-y-4">
            <div className={cardClass}>
              <h3 className="text-sm font-semibold text-slate-200">Kundenfahrzeuge</h3>
              <p className="mt-2 text-xs text-slate-400">
                Fahrzeuge sind im Kundenprofil oder ueber den Fahrzeugbereich zuordenbar.
              </p>
              <Link
                href={`/customers/${customer.id}`}
                className="mt-3 inline-flex rounded bg-slate-800 px-3 py-1.5 text-xs text-slate-200 hover:bg-slate-700"
              >
                Kundenprofil oeffnen
              </Link>
            </div>

            <div className={cardClass}>
              <h3 className="text-sm font-semibold text-slate-200">Dokumente</h3>
              <p className="mt-2 text-xs text-slate-400">
                Hinterlegte Dokumente: {customer.attachments.length}
              </p>
              <Link
                href={`/customers/${customer.id}`}
                className="mt-3 inline-flex rounded bg-slate-800 px-3 py-1.5 text-xs text-slate-200 hover:bg-slate-700"
              >
                Dokumente verwalten
              </Link>
            </div>

            <div className={cardClass}>
              <h3 className="text-sm font-semibold text-slate-200">Datenschutzvereinbarung</h3>
              <p className="mt-2 text-xs text-slate-400">
                Vorlage drucken oder als PDF speichern und danach signierte Version beim Kunden hinterlegen.
              </p>
              <Link
                href={`/customers/${customer.id}/privacy-agreement`}
                className="mt-3 inline-flex rounded bg-cyan-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-cyan-500"
              >
                Vorlage oeffnen
              </Link>
            </div>
          </aside>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button className="rounded bg-cyan-600 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-500">
            Aenderungen speichern
          </button>
          <Link
            href={`/customers/${customer.id}`}
            className="rounded border border-slate-700 bg-slate-900 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800"
          >
            Zurueck
          </Link>
        </div>
      </form>
    </div>
  );
}
