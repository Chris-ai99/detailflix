import { prisma } from "@/lib/prisma";
import { updateCompanySettings } from "./serverActions";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const s = await prisma.companySettings.findUnique({ where: { id: "default" } });
  const year = new Date().getFullYear();
  const invoiceCounter = await prisma.documentCounter.findUnique({
    where: { docType_year: { docType: "INVOICE", year } },
    select: { lastSeq: true },
  });
  const nextInvoiceSeq = (invoiceCounter?.lastSeq ?? 0) + 1;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Einstellungen</h1>
        <p className="mt-1 text-sm text-slate-400">
          Diese Daten werden u.a. in der PDF-Vorlage (Briefkopf, Fusszeile, QR-Code) verwendet.
        </p>
      </div>

      <div className="rounded-lg border border-slate-700 bg-slate-800/60 p-4">
        <form action={updateCompanySettings} encType="multipart/form-data" className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm text-slate-300">Firmenname *</label>
              <input
                name="companyName"
                defaultValue={s?.companyName ?? ""}
                required
                className="mt-1 w-full rounded bg-slate-800 p-2"
              />
            </div>

            <div className="col-span-2">
              <label className="block text-sm text-slate-300">Inhaber / Ansprechpartner</label>
              <input
                name="ownerName"
                defaultValue={s?.ownerName ?? ""}
                className="mt-1 w-full rounded bg-slate-800 p-2"
              />
            </div>

            <div className="col-span-2">
              <label className="block text-sm text-slate-300">Strasse</label>
              <input
                name="street"
                defaultValue={s?.street ?? ""}
                className="mt-1 w-full rounded bg-slate-800 p-2"
              />
            </div>

            <div>
              <label className="block text-sm text-slate-300">PLZ</label>
              <input
                name="zip"
                defaultValue={s?.zip ?? ""}
                className="mt-1 w-full rounded bg-slate-800 p-2"
              />
            </div>

            <div>
              <label className="block text-sm text-slate-300">Ort</label>
              <input
                name="city"
                defaultValue={s?.city ?? ""}
                className="mt-1 w-full rounded bg-slate-800 p-2"
              />
            </div>

            <div>
              <label className="block text-sm text-slate-300">Telefon</label>
              <input
                name="phone"
                defaultValue={s?.phone ?? ""}
                className="mt-1 w-full rounded bg-slate-800 p-2"
              />
            </div>

            <div>
              <label className="block text-sm text-slate-300">E-Mail</label>
              <input
                name="email"
                type="email"
                defaultValue={s?.email ?? ""}
                className="mt-1 w-full rounded bg-slate-800 p-2"
              />
            </div>

            <div className="col-span-2">
              <label className="block text-sm text-slate-300">Webseite</label>
              <input
                name="website"
                defaultValue={s?.website ?? ""}
                className="mt-1 w-full rounded bg-slate-800 p-2"
              />
            </div>
          </div>

          <div className="rounded border border-slate-700 bg-slate-800 p-4">
            <div className="mb-3 text-sm font-semibold text-slate-200">Nummerierung</div>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-sm text-slate-300">
                  Nächste Rechnungsnummer (laufende Nummer) – Jahr {year}
                </label>
                <input
                  type="number"
                  name="nextInvoiceSeq"
                  min={nextInvoiceSeq}
                  defaultValue={nextInvoiceSeq}
                  className="mt-1 w-full rounded bg-slate-900 p-2"
                />
                <div className="mt-1 text-xs text-slate-400">
                  Diese Nummer wird beim Finalisieren vergeben. Beispiel:{" "}
                  <span className="font-mono text-slate-300">
                    RE-{year}-{String(nextInvoiceSeq).padStart(5, "0")}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded border border-slate-700 bg-slate-800 p-4">
            <div className="mb-3 text-sm font-semibold text-slate-200">Bank & Rechtliches</div>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-sm text-slate-300">Bank</label>
                <input
                  name="bankName"
                  defaultValue={s?.bankName ?? ""}
                  className="mt-1 w-full rounded bg-slate-900 p-2"
                />
              </div>

              <div className="col-span-2">
                <label className="block text-sm text-slate-300">IBAN</label>
                <input
                  name="iban"
                  defaultValue={s?.iban ?? ""}
                  className="mt-1 w-full rounded bg-slate-900 p-2"
                />
              </div>

              <div>
                <label className="block text-sm text-slate-300">BIC</label>
                <input
                  name="bic"
                  defaultValue={s?.bic ?? ""}
                  className="mt-1 w-full rounded bg-slate-900 p-2"
                />
              </div>

              <div>
                <label className="block text-sm text-slate-300">USt.-IdNr.</label>
                <input
                  name="vatId"
                  defaultValue={s?.vatId ?? ""}
                  className="mt-1 w-full rounded bg-slate-900 p-2"
                />
              </div>

              <div className="col-span-2">
                <label className="block text-sm text-slate-300">Hinweis (rot, optional)</label>
                <input
                  name="noticeRed"
                  defaultValue={s?.noticeRed ?? ""}
                  className="mt-1 w-full rounded bg-slate-900 p-2"
                  placeholder="z.B. Bitte beachten Sie die geaenderte Bankverbindung!"
                />
              </div>
            </div>
          </div>

          <div className="rounded border border-slate-700 bg-slate-800 p-4">
            <div className="mb-3 text-sm font-semibold text-slate-200">Firmenlogo</div>

            {s?.logoDataUrl ? (
              <div className="mb-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={s.logoDataUrl}
                    alt="Firmenlogo"
                    className="max-h-24 rounded border border-slate-700 bg-slate-900 p-2"
                  />
              </div>
            ) : (
              <div className="mb-4 text-sm text-slate-400">Noch kein Logo hinterlegt.</div>
            )}

            <div className="grid grid-cols-2 items-center gap-4">
              <div className="col-span-2">
                <label className="block text-sm text-slate-300">Logo hochladen (max. 2MB)</label>
                <input
                  type="file"
                  name="logo"
                  accept="image/*"
                  className="mt-1 w-full rounded bg-slate-900 p-2 text-sm text-slate-200 file:mr-3 file:rounded file:border-0 file:bg-slate-800 file:px-3 file:py-2 file:text-slate-200 hover:file:bg-slate-700"
                />
              </div>

              <label className="col-span-2 flex items-center gap-2 text-sm text-slate-300">
                <input type="checkbox" name="clearLogo" />
                Logo entfernen
              </label>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3">
            <button
              type="submit"
              className="rounded bg-cyan-700 px-4 py-2 text-sm font-medium hover:bg-cyan-600"
            >
              Speichern
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

