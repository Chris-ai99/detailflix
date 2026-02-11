import Link from "next/link";
import { createCustomer } from "./serverActions";
import CustomerIdentityFields from "../ui/CustomerIdentityFields";

const inputClass =
  "w-full rounded border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 outline-none ring-cyan-400 transition focus:ring-2";
const cardClass = "rounded-xl border border-slate-700 bg-slate-900/60 p-5";
const labelClass = "mb-1 block text-[11px] uppercase tracking-wide text-slate-400";

export default function NewCustomerPage() {
  return (
    <div className="space-y-5">
      <section className="rounded-xl border border-slate-700 bg-slate-900/70 p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-xs uppercase tracking-[0.12em] text-slate-400">Kundenverwaltung</div>
            <h1 className="mt-1 text-2xl font-semibold text-slate-100">Neuen Kunden anlegen</h1>
            <p className="mt-1 text-sm text-slate-400">
              Stammdaten, Notizen und vorbereitende Angaben in einem durchgaengigen Ablauf.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 text-xs">
            <span className="rounded border border-slate-600 bg-slate-800/60 px-2 py-1 text-slate-300">
              Pflichtfeld: Typabhängig (Name oder Unternehmensname)
            </span>
            <span className="rounded border border-cyan-500/40 bg-cyan-500/10 px-2 py-1 text-cyan-200">
              Schritt 1 von 1
            </span>
          </div>
        </div>
      </section>

      <form action={createCustomer} className="space-y-5">
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)_320px]">
          <section className={cardClass}>
            <h2 className="text-base font-semibold text-slate-100">Stammdaten</h2>
            <p className="mt-1 text-xs text-slate-400">Kontaktdaten und Rechnungsadresse des Kunden.</p>

            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <CustomerIdentityFields inputClass={inputClass} labelClass={labelClass} />

              <div>
                <label className={labelClass}>E-Mail</label>
                <input name="email" type="email" placeholder="kunde@beispiel.de" className={inputClass} />
              </div>

              <div>
                <label className={labelClass}>Telefon</label>
                <input name="phone" placeholder="+49 ..." className={inputClass} />
              </div>

              <div className="md:col-span-2">
                <label className={labelClass}>Straße, Nr.</label>
                <input name="street" placeholder="Musterstrasse 1" className={inputClass} />
              </div>

              <div>
                <label className={labelClass}>PLZ</label>
                <input name="zip" placeholder="12345" className={inputClass} />
              </div>

              <div>
                <label className={labelClass}>Stadt</label>
                <input name="city" placeholder="Berlin" className={inputClass} />
              </div>

              <div>
                <label className={labelClass}>Land</label>
                <input
                  name="country"
                  defaultValue="Deutschland"
                  placeholder="Deutschland"
                  className={inputClass}
                />
              </div>

              <div>
                <label className={labelClass}>USt-IdNr (optional)</label>
                <input name="vatId" placeholder="DE..." className={inputClass} />
              </div>

              <div>
                <label className={labelClass}>Stundenverrechnungssatz netto (EUR/h, optional)</label>
                <input
                  name="hourlyRateEur"
                  type="number"
                  min={0}
                  step="0.01"
                  placeholder="z. B. 60,00"
                  className={inputClass}
                />
              </div>
            </div>

            <div className="mt-5 rounded-lg border border-slate-700/80 bg-slate-800/40 p-4">
              <h3 className="text-sm font-semibold text-slate-100">Fahrzeug-Menue (optional)</h3>
              <p className="mt-1 text-xs text-slate-400">
                Kunde kann direkt mit einem Fahrzeug angelegt werden.
              </p>

              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <div>
                  <label className={labelClass}>Marke</label>
                  <input name="vehicleMake" placeholder="BMW" className={inputClass} />
                </div>

                <div>
                  <label className={labelClass}>Modell</label>
                  <input name="vehicleModel" placeholder="320d" className={inputClass} />
                </div>

                <div>
                  <label className={labelClass}>Kennzeichen</label>
                  <input name="vehicleLicensePlate" placeholder="BI-AB 123" className={inputClass} />
                </div>

                <div>
                  <label className={labelClass}>Kilometerstand</label>
                  <input name="vehicleMileage" type="number" min={0} step={1} placeholder="123000" className={inputClass} />
                </div>

                <div className="md:col-span-2">
                  <label className={labelClass}>Notiz</label>
                  <input
                    name="vehicleNotes"
                    placeholder="z. B. Erstfahrzeug, Termin zur Aufbereitung folgt"
                    className={inputClass}
                  />
                </div>
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
              placeholder="Notizen zum Kunden..."
              className={`${inputClass} mt-3 resize-y`}
            />
          </section>

          <aside className="space-y-4">
            <div className={cardClass}>
              <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-300">Kundenfahrzeuge</h3>
              <p className="mt-2 text-sm text-slate-400">
                Optional koennen Sie direkt hier ein erstes Fahrzeug hinterlegen.
              </p>
            </div>

            <div className={cardClass}>
              <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-300">Dokumente</h3>
              <p className="mt-2 text-sm text-slate-400">
                Nach dem Speichern koennen Sie Dokumente wie Fahrzeugschein oder Vollmacht hochladen.
              </p>
            </div>

            <div className={cardClass}>
              <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-300">Datenschutzvereinbarung</h3>
              <p className="mt-2 text-sm text-slate-400">
                Vorlage drucken, unterschreiben lassen, danach als signiertes Dokument beim Kunden speichern.
              </p>
            </div>
          </aside>
        </div>

        <section className="rounded-xl border border-slate-700 bg-slate-900/60 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-slate-400">Nach dem Speichern gelangen Sie direkt ins Kundenprofil.</p>
            <div className="flex flex-wrap items-center gap-2">
              <button className="rounded bg-cyan-600 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-500">
                Kunde speichern
              </button>
              <Link
                href="/customers"
                className="rounded border border-slate-600 bg-slate-900 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800"
              >
                Abbrechen
              </Link>
            </div>
          </div>
        </section>
      </form>
    </div>
  );
}
