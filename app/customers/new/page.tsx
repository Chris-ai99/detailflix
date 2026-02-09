import Link from "next/link";
import { createCustomer } from "./serverActions";

const inputClass = "w-full rounded border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500";
const cardClass = "rounded border border-slate-800 bg-slate-900/70 p-4";

export default function NewCustomerPage() {
  return (
    <div className="space-y-4">
      <div className="rounded border border-slate-800 bg-slate-900/50 px-4 py-3">
        <h1 className="text-2xl font-bold text-slate-100">Neuen Kunden anlegen</h1>
        <p className="mt-1 text-sm text-slate-400">
          Aufbau wie gewuenscht: ohne Kundentyp, Land als Freitext, Skonto vorerst nicht im Formular.
        </p>
      </div>

      <form action={createCustomer} className="space-y-4">
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)_320px]">
          <section className={cardClass}>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-300">Stammdaten</h2>

            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <div className="md:col-span-2">
                <label className="mb-1 block text-xs text-slate-400">Name / Firma *</label>
                <input name="name" required placeholder="Max Mustermann GmbH" className={inputClass} />
              </div>

              <div>
                <label className="mb-1 block text-xs text-slate-400">E-Mail</label>
                <input name="email" type="email" placeholder="kunde@beispiel.de" className={inputClass} />
              </div>

              <div>
                <label className="mb-1 block text-xs text-slate-400">Telefon</label>
                <input name="phone" placeholder="+49 ..." className={inputClass} />
              </div>

              <div className="md:col-span-2">
                <label className="mb-1 block text-xs text-slate-400">Strasse, Nr.</label>
                <input name="street" placeholder="Musterstrasse 1" className={inputClass} />
              </div>

              <div>
                <label className="mb-1 block text-xs text-slate-400">PLZ</label>
                <input name="zip" placeholder="12345" className={inputClass} />
              </div>

              <div>
                <label className="mb-1 block text-xs text-slate-400">Stadt</label>
                <input name="city" placeholder="Berlin" className={inputClass} />
              </div>

              <div>
                <label className="mb-1 block text-xs text-slate-400">Land</label>
                <input
                  name="country"
                  defaultValue="Deutschland"
                  placeholder="Deutschland"
                  className={inputClass}
                />
              </div>

              <div>
                <label className="mb-1 block text-xs text-slate-400">USt-IdNr (optional)</label>
                <input name="vatId" placeholder="DE..." className={inputClass} />
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
              placeholder="Notizen zum Kunden..."
              className={`${inputClass} mt-3 resize-y`}
            />
          </section>

          <aside className="space-y-4">
            <div className={cardClass}>
              <h3 className="text-sm font-semibold text-slate-200">Kundenfahrzeuge</h3>
              <p className="mt-2 text-xs text-slate-400">
                Fahrzeuge koennen nach dem Speichern direkt im Kundenprofil verknuepft werden.
              </p>
            </div>

            <div className={cardClass}>
              <h3 className="text-sm font-semibold text-slate-200">Dokumente</h3>
              <p className="mt-2 text-xs text-slate-400">
                Nach dem Speichern koennen Sie Dokumente wie Fahrzeugschein oder Vollmacht hochladen.
              </p>
            </div>

            <div className={cardClass}>
              <h3 className="text-sm font-semibold text-slate-200">Datenschutzvereinbarung</h3>
              <p className="mt-2 text-xs text-slate-400">
                Vorlage drucken, unterschreiben lassen, danach als signiertes Dokument beim Kunden speichern.
              </p>
            </div>
          </aside>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button className="rounded bg-cyan-600 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-500">
            Kunde speichern
          </button>
          <Link
            href="/customers"
            className="rounded border border-slate-700 bg-slate-900 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800"
          >
            Abbrechen
          </Link>
        </div>
      </form>
    </div>
  );
}
