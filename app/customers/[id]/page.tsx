import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import {
  createCustomerVehicle,
  deleteCustomer,
  deleteCustomerAttachment,
  uploadCustomerAttachment,
} from "./serverActions";

const PRIVACY_ATTACHMENT_KINDS = new Set([
  "PRIVACY_AGREEMENT_UNSIGNED",
  "PRIVACY_AGREEMENT_SIGNED",
]);

const ATTACHMENT_KIND_LABEL: Record<string, string> = {
  GENERAL: "Allgemein",
  VEHICLE_REGISTRATION: "Fahrzeugschein",
  PRIVACY_AGREEMENT_UNSIGNED: "Datenschutz (Vorlage)",
  PRIVACY_AGREEMENT_SIGNED: "Datenschutz (signiert)",
};

const ATTACHMENT_KIND_TONE: Record<string, string> = {
  GENERAL: "border-slate-600/70 bg-slate-700/40 text-slate-200",
  VEHICLE_REGISTRATION: "border-cyan-500/40 bg-cyan-500/15 text-cyan-200",
  PRIVACY_AGREEMENT_UNSIGNED: "border-amber-500/40 bg-amber-500/15 text-amber-200",
  PRIVACY_AGREEMENT_SIGNED: "border-emerald-500/40 bg-emerald-500/15 text-emerald-200",
};

const cardClass = "rounded-xl border border-slate-700 bg-slate-900/60 p-5";
const subCardClass = "rounded-lg border border-slate-700 bg-slate-800/40 p-4";
const labelClass = "text-xs uppercase tracking-wide text-slate-400";
const inputClass =
  "w-full rounded border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 outline-none ring-cyan-400 transition focus:ring-2";

type AttachmentRow = {
  id: string;
  kind: string;
  title: string;
  sizeBytes: number;
  createdAt: Date;
  vehicle?: { make?: string | null; model?: string | null; vin?: string | null } | null;
};

function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value.toFixed(unit === 0 ? 0 : 1)} ${units[unit]}`;
}

function formatDate(value?: Date | string | null): string {
  if (!value) return "-";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function splitName(fullName?: string | null): { firstName: string; lastName: string } {
  const name = (fullName || "").trim();
  if (!name) return { firstName: "", lastName: "" };
  const parts = name.split(/\s+/);
  if (parts.length === 1) return { firstName: parts[0], lastName: "" };
  return { firstName: parts[0], lastName: parts.slice(1).join(" ") };
}

function formatContactName(input: {
  isBusiness: boolean;
  name?: string | null;
  contactFirstName?: string | null;
  contactLastName?: string | null;
  contactUseZh?: boolean;
}) {
  const first = (input.contactFirstName || "").trim();
  const last = (input.contactLastName || "").trim();
  const explicit = [first, last].filter(Boolean).join(" ").trim();

  let fallback = "";
  if (!input.isBusiness && !explicit) {
    const split = splitName(input.name);
    fallback = [split.firstName, split.lastName].filter(Boolean).join(" ").trim();
  }

  const base = explicit || fallback;
  if (!base) return "-";
  return input.contactUseZh ? `z. H. ${base}` : base;
}

function formatAddress(input: {
  street?: string | null;
  zip?: string | null;
  city?: string | null;
  country?: string | null;
}): string {
  const line1 = (input.street || "").trim();
  const line2 = [(input.zip || "").trim(), (input.city || "").trim()].filter(Boolean).join(" ");
  const line3 = (input.country || "").trim();
  const all = [line1, line2, line3].filter(Boolean);
  return all.length ? all.join(", ") : "-";
}

function kindClass(kind: string) {
  return ATTACHMENT_KIND_TONE[kind] ?? "border-slate-600/70 bg-slate-700/40 text-slate-200";
}

function formatVehicleLabel(input?: { make?: string | null; model?: string | null; vin?: string | null } | null) {
  if (!input) return "-";
  const combined = [input.make || "", input.model || ""].join(" ").trim();
  if (combined && input.vin) return `${combined} (${input.vin})`;
  return combined || input.vin || "-";
}

function AttachmentList({
  customerId,
  items,
  emptyMessage,
  showVehicle,
}: {
  customerId: string;
  items: AttachmentRow[];
  emptyMessage: string;
  showVehicle: boolean;
}) {
  if (items.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-slate-700 bg-slate-800/30 px-4 py-5 text-sm text-slate-400">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-slate-700 bg-slate-800/30">
      <div className="hidden grid-cols-[minmax(0,1.45fr)_140px_140px_180px] gap-3 border-b border-slate-700 bg-slate-800/70 px-4 py-2 text-xs uppercase tracking-wide text-slate-400 md:grid">
        <div>Dokument</div>
        <div>Groesse</div>
        <div>Erstellt</div>
        <div className="text-right">Aktionen</div>
      </div>

      <div className="divide-y divide-slate-700/80">
        {items.map((item) => (
          <div
            key={item.id}
            className="grid gap-3 px-4 py-3 md:grid-cols-[minmax(0,1.45fr)_140px_140px_180px] md:items-center"
          >
            <div>
              <div className="font-medium text-slate-100">{item.title}</div>
              <div className="mt-1">
                <span className={`inline-flex rounded border px-2 py-0.5 text-xs ${kindClass(item.kind)}`}>
                  {ATTACHMENT_KIND_LABEL[item.kind] ?? item.kind}
                </span>
              </div>
              {showVehicle && item.kind === "VEHICLE_REGISTRATION" ? (
                <div className="mt-1 text-xs text-slate-500">Fahrzeug: {formatVehicleLabel(item.vehicle)}</div>
              ) : null}
            </div>

            <div className="text-sm text-slate-300">{formatBytes(item.sizeBytes)}</div>
            <div className="text-sm text-slate-300">{formatDate(item.createdAt)}</div>

            <div className="flex gap-2 md:justify-end">
              <Link
                href={`/api/customers/${customerId}/attachments/${item.id}`}
                className="rounded border border-cyan-500/50 bg-cyan-500/10 px-3 py-1 text-sm text-cyan-200 hover:bg-cyan-500/20"
              >
                Oeffnen
              </Link>
              <form action={deleteCustomerAttachment}>
                <input type="hidden" name="customerId" value={customerId} />
                <input type="hidden" name="attachmentId" value={item.id} />
                <button className="rounded border border-red-500/50 bg-red-500/15 px-3 py-1 text-sm text-red-100 hover:bg-red-500/25">
                  Loeschen
                </button>
              </form>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default async function CustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const customer = await prisma.customer.findUnique({
    where: { id },
    include: {
      attachments: {
        orderBy: { createdAt: "desc" },
        include: {
          vehicle: {
            select: {
              id: true,
              make: true,
              model: true,
              vin: true,
            },
          },
        },
      },
      vehicles: {
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!customer) return notFound();

  const documentAttachments = customer.attachments.filter(
    (item) => !PRIVACY_ATTACHMENT_KINDS.has(item.kind)
  );
  const privacyAttachments = customer.attachments.filter((item) =>
    PRIVACY_ATTACHMENT_KINDS.has(item.kind)
  );

  const hasSignedPrivacyAgreement = privacyAttachments.some(
    (item) => item.kind === "PRIVACY_AGREEMENT_SIGNED"
  );
  const latestDocumentAttachmentAt = documentAttachments[0]?.createdAt ?? null;
  const latestPrivacyAttachmentAt = privacyAttachments[0]?.createdAt ?? null;
  const profileTitle =
    (customer.isBusiness ? customer.companyName : customer.name)?.trim() ||
    customer.name?.trim() ||
    "Ohne Name";
  const contactName = formatContactName({
    isBusiness: customer.isBusiness,
    name: customer.name,
    contactFirstName: customer.contactFirstName,
    contactLastName: customer.contactLastName,
    contactUseZh: customer.contactUseZh,
  });
  const vehicleAttachmentCount = documentAttachments.filter(
    (item) => item.kind === "VEHICLE_REGISTRATION"
  ).length;

  return (
    <div className="space-y-5">
      <section className="rounded-xl border border-slate-700 bg-slate-900/70 p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-xs uppercase tracking-[0.12em] text-slate-400">Kundenverwaltung</div>
            <h1 className="mt-1 text-2xl font-semibold text-slate-100">{profileTitle}</h1>
            <p className="mt-1 text-sm text-slate-400">
              Einheitliche Kundenansicht mit Stammdaten, Fahrzeugen, Dokumenten und Datenschutz.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 text-xs">
            <span className="rounded border border-slate-600 bg-slate-800/60 px-2 py-1 text-slate-300">
              Kunde erstellt: {formatDate(customer.createdAt)}
            </span>
            <span className="rounded border border-cyan-500/40 bg-cyan-500/10 px-2 py-1 text-cyan-200">
              Fahrzeuge: {customer.vehicles.length}
            </span>
            <span className="rounded border border-slate-600 bg-slate-800/60 px-2 py-1 text-slate-300">
              Dokumente: {documentAttachments.length}
            </span>
            <span
              className={`rounded border px-2 py-1 ${
                hasSignedPrivacyAgreement
                  ? "border-emerald-500/50 bg-emerald-500/15 text-emerald-200"
                  : "border-amber-500/50 bg-amber-500/15 text-amber-200"
              }`}
            >
              {hasSignedPrivacyAgreement ? "Datenschutz signiert" : "Datenschutz offen"}
            </span>
          </div>
        </div>
      </section>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)_320px]">
        <section className={`${cardClass} space-y-5`}>
          <div>
            <h2 className="text-base font-semibold text-slate-100">Stammdaten</h2>
            <p className="mt-1 text-xs text-slate-400">Kontaktdaten und Rechnungsadresse des Kunden.</p>
          </div>

          <dl className="grid gap-3 md:grid-cols-2">
            <div className="rounded-lg border border-slate-700/80 bg-slate-800/40 px-3 py-2">
              <dt className={labelClass}>Kundentyp</dt>
              <dd className="mt-1 text-sm text-slate-100">{customer.isBusiness ? "Unternehmen" : "Privat"}</dd>
            </div>
            <div className="rounded-lg border border-slate-700/80 bg-slate-800/40 px-3 py-2">
              <dt className={labelClass}>Unternehmensname</dt>
              <dd className="mt-1 text-sm text-slate-100">{customer.companyName ?? "-"}</dd>
            </div>
            <div className="rounded-lg border border-slate-700/80 bg-slate-800/40 px-3 py-2">
              <dt className={labelClass}>Ansprechpartner</dt>
              <dd className="mt-1 text-sm text-slate-100">{contactName}</dd>
            </div>
            <div className="rounded-lg border border-slate-700/80 bg-slate-800/40 px-3 py-2">
              <dt className={labelClass}>E-Mail</dt>
              <dd className="mt-1 text-sm text-slate-100">{customer.email ?? "-"}</dd>
            </div>
            <div className="rounded-lg border border-slate-700/80 bg-slate-800/40 px-3 py-2">
              <dt className={labelClass}>Telefon</dt>
              <dd className="mt-1 text-sm text-slate-100">{customer.phone ?? "-"}</dd>
            </div>
            <div className="rounded-lg border border-slate-700/80 bg-slate-800/40 px-3 py-2">
              <dt className={labelClass}>USt-Id</dt>
              <dd className="mt-1 text-sm text-slate-100">{customer.vatId ?? "-"}</dd>
            </div>
            <div className="rounded-lg border border-slate-700/80 bg-slate-800/40 px-3 py-2 md:col-span-2">
              <dt className={labelClass}>Adresse</dt>
              <dd className="mt-1 text-sm text-slate-100">
                {formatAddress({
                  street: customer.street,
                  zip: customer.zip,
                  city: customer.city,
                  country: customer.country,
                })}
              </dd>
            </div>
            <div className="rounded-lg border border-slate-700/80 bg-slate-800/40 px-3 py-2 md:col-span-2">
              <dt className={labelClass}>Notizen</dt>
              <dd className="mt-1 text-sm text-slate-100">{customer.notes ?? "-"}</dd>
            </div>
          </dl>

          <div className="border-t border-slate-700/70 pt-5">
            <details className="group">
              <summary className="flex cursor-pointer list-none flex-col gap-3 rounded-lg border border-cyan-500/40 bg-cyan-500/10 p-3 hover:bg-cyan-500/15 md:flex-row md:items-center md:justify-between">
                <div>
                  <h2 className="text-base font-semibold text-slate-100">Fahrzeug-Menue</h2>
                  <p className="mt-1 text-xs text-slate-400">
                    Fahrzeug direkt diesem Kunden zuordnen und anschliessend im Fahrzeugprofil bearbeiten.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="rounded border border-slate-600 bg-slate-800/60 px-2 py-1 text-xs text-slate-200">
                    {customer.vehicles.length} Fahrzeug{customer.vehicles.length === 1 ? "" : "e"}
                  </span>
                  <span className="inline-flex items-center rounded bg-cyan-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-cyan-500 group-open:hidden">
                    Fahrzeuge anzeigen
                  </span>
                  <span className="hidden items-center rounded bg-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-100 shadow-sm transition hover:bg-slate-600 group-open:inline-flex">
                    Fahrzeuge ausblenden
                  </span>
                </div>
              </summary>

              <div className="mt-4 space-y-4">
                <form action={createCustomerVehicle} className={subCardClass}>
                  <input type="hidden" name="customerId" value={customer.id} />

                  <div className="grid gap-3 md:grid-cols-3">
                    <label className="space-y-1">
                      <span className={labelClass}>Marke</span>
                      <input name="make" placeholder="BMW" className={inputClass} />
                    </label>
                    <label className="space-y-1">
                      <span className={labelClass}>Modell</span>
                      <input name="model" placeholder="320d" className={inputClass} />
                    </label>
                    <label className="space-y-1">
                      <span className={labelClass}>Kennzeichen</span>
                      <input name="licensePlate" placeholder="BI-AB 123" className={inputClass} />
                    </label>
                    <label className="space-y-1">
                      <span className={labelClass}>Kilometerstand</span>
                      <input name="mileage" type="number" min={0} step={1} placeholder="123000" className={inputClass} />
                    </label>
                    <label className="space-y-1 md:col-span-3">
                      <span className={labelClass}>Notiz (optional)</span>
                      <input name="notes" placeholder="z. B. Winterreifen vorhanden" className={inputClass} />
                    </label>
                  </div>

                  <div className="mt-3 flex justify-end">
                    <button className="rounded bg-cyan-600 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-500">
                      Fahrzeug hinzufuegen
                    </button>
                  </div>
                </form>

                {customer.vehicles.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-slate-700 bg-slate-800/30 px-4 py-5 text-sm text-slate-400">
                    Noch kein Fahrzeug fuer diesen Kunden hinterlegt.
                  </div>
                ) : (
                  <div className="overflow-hidden rounded-lg border border-slate-700 bg-slate-800/30">
                    <div className="hidden grid-cols-[minmax(0,1.3fr)_180px_130px_minmax(0,1fr)_180px] gap-3 border-b border-slate-700 bg-slate-800/70 px-4 py-2 text-xs uppercase tracking-wide text-slate-400 md:grid">
                      <div>Fahrzeug</div>
                      <div>Kennzeichen</div>
                      <div>Kilometer</div>
                      <div>Notiz</div>
                      <div className="text-right">Aktionen</div>
                    </div>

                    <div className="divide-y divide-slate-700/80">
                      {customer.vehicles.map((vehicle) => {
                        const title =
                          [vehicle.make || "", vehicle.model || ""].join(" ").trim() ||
                          vehicle.vin ||
                          "Ohne Bezeichnung";
                        const mileageLabel = vehicle.mileage != null ? `${vehicle.mileage} km` : "-";
                        const notesLabel = (vehicle.notes || "").trim() || "-";

                        return (
                          <div
                            key={vehicle.id}
                            className="grid gap-3 px-4 py-3 md:grid-cols-[minmax(0,1.3fr)_180px_130px_minmax(0,1fr)_180px] md:items-center"
                          >
                            <div>
                              <div className="font-medium text-slate-100">{title}</div>
                              <div className="text-xs text-slate-500">
                                {(vehicle.make || "-") + " | " + (vehicle.model || "-")}
                              </div>
                            </div>
                            <div className="text-sm text-slate-300">{vehicle.vin || "-"}</div>
                            <div className="text-sm text-slate-300">{mileageLabel}</div>
                            <div className="truncate text-sm text-slate-300" title={notesLabel}>
                              {notesLabel}
                            </div>
                            <div className="flex gap-2 md:justify-end">
                              <Link
                                href={`/vehicles/${vehicle.id}`}
                                className="rounded border border-cyan-500/50 bg-cyan-500/10 px-3 py-1 text-sm text-cyan-200 hover:bg-cyan-500/20"
                              >
                                Oeffnen
                              </Link>
                              <Link
                                href={`/vehicles/${vehicle.id}/edit`}
                                className="rounded border border-amber-500/50 bg-amber-500/10 px-3 py-1 text-sm text-amber-200 hover:bg-amber-500/20"
                              >
                                Bearbeiten
                              </Link>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </details>
          </div>
        </section>

        <section className={`${cardClass} space-y-5`}>
          <div>
            <h2 className="text-base font-semibold text-slate-100">Dokumente</h2>
            <p className="mt-1 text-xs text-slate-400">Fahrzeugschein und weitere Kundenunterlagen.</p>
            <div className="mt-3 flex flex-wrap gap-2 text-xs">
              <span className="rounded border border-slate-600 bg-slate-800/60 px-2 py-1 text-slate-200">
                {documentAttachments.length} Datei{documentAttachments.length === 1 ? "" : "en"}
              </span>
              <span className="rounded border border-slate-600 bg-slate-800/60 px-2 py-1 text-slate-200">
                Fahrzeugschein: {vehicleAttachmentCount}
              </span>
              <span className="rounded border border-slate-600 bg-slate-800/60 px-2 py-1 text-slate-200">
                Letzter Upload: {formatDate(latestDocumentAttachmentAt)}
              </span>
            </div>
          </div>

          <div className={subCardClass}>
            <div className={labelClass}>Dokumente direkt erstellen</div>
            <div className="mt-2 flex flex-wrap gap-2">
              <Link
                href={`/offers/new?customerId=${encodeURIComponent(customer.id)}`}
                prefetch={false}
                className="rounded border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-slate-200 hover:bg-slate-800"
              >
                Angebot erstellen
              </Link>
              <Link
                href={`/orders/new?customerId=${encodeURIComponent(customer.id)}`}
                prefetch={false}
                className="rounded border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-slate-200 hover:bg-slate-800"
              >
                Auftrag erstellen
              </Link>
              <Link
                href={`/invoices/new?customerId=${encodeURIComponent(customer.id)}`}
                prefetch={false}
                className="rounded bg-cyan-600 px-3 py-2 text-sm font-medium text-white hover:bg-cyan-500"
              >
                Rechnung erstellen
              </Link>
            </div>
          </div>

          <form action={uploadCustomerAttachment} className={subCardClass}>
            <input type="hidden" name="customerId" value={customer.id} />

            <div className="grid gap-3 md:grid-cols-2">
              <label className="space-y-1">
                <span className={labelClass}>Dokumenttyp</span>
                <select name="kind" defaultValue="GENERAL" className={inputClass}>
                  <option value="GENERAL">Allgemeines Dokument</option>
                  <option value="VEHICLE_REGISTRATION">Fahrzeugschein</option>
                </select>
              </label>

              <label className="space-y-1">
                <span className={labelClass}>Fahrzeug (optional, bei Fahrzeugschein Pflicht)</span>
                <select name="vehicleId" defaultValue="" className={inputClass}>
                  <option value="">Kein Fahrzeug ausgewaehlt</option>
                  {customer.vehicles.map((vehicle) => (
                    <option key={vehicle.id} value={vehicle.id}>
                      {formatVehicleLabel(vehicle)}
                    </option>
                  ))}
                </select>
                {customer.vehicles.length === 0 ? (
                  <span className="block text-[11px] text-amber-300">
                    Fuer Fahrzeugschein bitte zuerst ein Kundenfahrzeug anlegen.
                  </span>
                ) : null}
              </label>
            </div>

            <div className="mt-3 grid gap-3">
              <label className="space-y-1">
                <span className={labelClass}>Titel (optional)</span>
                <input name="title" placeholder="z. B. Fahrzeugschein vorne" className={inputClass} />
              </label>
            </div>

            <div className="mt-3 grid gap-3 md:grid-cols-[1fr_auto]">
              <label className="space-y-1">
                <span className={labelClass}>Datei</span>
                <input
                  type="file"
                  name="file"
                  required
                  accept=".pdf,.png,.jpg,.jpeg,.webp,.txt,.doc,.docx"
                  className="w-full rounded border border-slate-600 bg-slate-900 px-3 py-2 text-sm file:mr-3 file:rounded file:border-0 file:bg-cyan-600 file:px-3 file:py-1 file:text-white hover:file:bg-cyan-500"
                />
              </label>
              <button className="rounded bg-cyan-600 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-500">
                Dokument hochladen
              </button>
            </div>
          </form>

          <AttachmentList
            customerId={customer.id}
            items={documentAttachments as AttachmentRow[]}
            emptyMessage="Noch keine Dokumente hinterlegt."
            showVehicle
          />

          <div className="border-t border-slate-700/70 pt-5">
            <h2 className="text-base font-semibold text-slate-100">Datenschutzvereinbarung</h2>
            <p className="mt-1 text-sm text-slate-300">
              Dokument erzeugen, digital signieren und separat pro Kunde verwalten.
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
              <Link
                href={`/customers/${customer.id}/privacy-agreement`}
                className="rounded bg-cyan-600 px-3 py-2 text-sm font-medium text-white hover:bg-cyan-500"
              >
                Vorlage oeffnen
              </Link>
              <span className="rounded border border-slate-600 bg-slate-800/60 px-3 py-2 text-slate-200">
                Dateien: {privacyAttachments.length}
              </span>
              <span className="rounded border border-slate-600 bg-slate-800/60 px-3 py-2 text-slate-200">
                Letzte Aenderung: {formatDate(latestPrivacyAttachmentAt)}
              </span>
              <span
                className={`rounded border px-3 py-2 text-xs ${
                  hasSignedPrivacyAgreement
                    ? "border-emerald-500/50 bg-emerald-500/15 text-emerald-200"
                    : "border-amber-500/50 bg-amber-500/15 text-amber-200"
                }`}
              >
                {hasSignedPrivacyAgreement
                  ? "Signierte Datenschutzvereinbarung vorhanden"
                  : "Noch keine signierte Datenschutzvereinbarung"}
              </span>
            </div>

            <div className="mt-4">
              <AttachmentList
                customerId={customer.id}
                items={privacyAttachments as AttachmentRow[]}
                emptyMessage="Noch keine Datenschutzdateien gespeichert."
                showVehicle={false}
              />
            </div>
          </div>
        </section>

        <aside className="space-y-4">
          <div className={cardClass}>
            <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-300">Schnellaktionen</h3>
            <div className="mt-3 grid gap-2">
              <Link
                href={`/customers/${customer.id}/edit`}
                className="rounded border border-amber-500/50 bg-amber-500/10 px-3 py-2 text-sm text-amber-200 hover:bg-amber-500/20"
              >
                Kunde bearbeiten
              </Link>
              <Link
                href={`/offers/new?customerId=${encodeURIComponent(customer.id)}`}
                prefetch={false}
                className="rounded border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-slate-200 hover:bg-slate-800"
              >
                Angebot erstellen
              </Link>
              <Link
                href={`/orders/new?customerId=${encodeURIComponent(customer.id)}`}
                prefetch={false}
                className="rounded border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-slate-200 hover:bg-slate-800"
              >
                Auftrag erstellen
              </Link>
              <Link
                href={`/invoices/new?customerId=${encodeURIComponent(customer.id)}`}
                prefetch={false}
                className="rounded border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-slate-200 hover:bg-slate-800"
              >
                Rechnung erstellen
              </Link>
              <Link
                href={`/customers/${customer.id}/privacy-agreement`}
                className="rounded bg-cyan-600 px-3 py-2 text-sm font-semibold text-white hover:bg-cyan-500"
              >
                Datenschutz oeffnen
              </Link>
              <Link
                href="/customers"
                className="rounded border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-slate-300 hover:bg-slate-800"
              >
                Zurueck zur Kundenliste
              </Link>
            </div>
          </div>

          <div className={cardClass}>
            <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-300">Status</h3>
            <div className="mt-3 space-y-2 text-sm text-slate-300">
              <div className="flex items-center justify-between rounded border border-slate-700 bg-slate-800/40 px-3 py-2">
                <span>Fahrzeuge</span>
                <span className="font-medium text-slate-100">{customer.vehicles.length}</span>
              </div>
              <div className="flex items-center justify-between rounded border border-slate-700 bg-slate-800/40 px-3 py-2">
                <span>Dokumente</span>
                <span className="font-medium text-slate-100">{documentAttachments.length}</span>
              </div>
              <div className="flex items-center justify-between rounded border border-slate-700 bg-slate-800/40 px-3 py-2">
                <span>Datenschutzdateien</span>
                <span className="font-medium text-slate-100">{privacyAttachments.length}</span>
              </div>
              <div className="flex items-center justify-between rounded border border-slate-700 bg-slate-800/40 px-3 py-2">
                <span>Letzte Dokumentaenderung</span>
                <span className="font-medium text-slate-100">{formatDate(latestDocumentAttachmentAt)}</span>
              </div>
            </div>
          </div>

          <section className="rounded-xl border border-red-500/40 bg-red-500/10 p-4">
            <h2 className="text-sm font-semibold text-red-200">Gefahrenbereich</h2>
            <p className="mt-1 text-xs text-red-100/80">
              Kunde und zugehoerige Dokumente werden dauerhaft entfernt.
            </p>
            <form action={deleteCustomer} className="mt-3">
              <input type="hidden" name="id" value={customer.id} />
              <button className="w-full rounded bg-red-600 px-3 py-2 text-sm text-white hover:bg-red-500">
                Kunde loeschen
              </button>
            </form>
          </section>
        </aside>
      </div>
    </div>
  );
}
