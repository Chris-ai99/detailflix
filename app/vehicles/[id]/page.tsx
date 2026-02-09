import Link from "next/link";
import { notFound } from "next/navigation";
import { getVehicle } from "./serverActions";
import DeleteVehicleButton from "../ui/DeleteVehicleButton";

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

function kindClass(kind: string) {
  return ATTACHMENT_KIND_TONE[kind] ?? "border-slate-600/70 bg-slate-700/40 text-slate-200";
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

export default async function VehicleDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const v = await getVehicle(id);

  if (!v) return notFound();

  const purchaseEuro =
    v.purchaseCents != null
      ? (v.purchaseCents / 100).toFixed(2).replace(".", ",")
      : "-";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">
          Fahrzeug: {v.make ?? "-"} {v.model ?? ""}
        </h1>
        <div className="flex gap-2">
          <Link className="rounded px-3 py-2 hover:bg-slate-700/60" href="/vehicles">
            Zurueck
          </Link>
          <Link
            className="rounded bg-slate-700 px-3 py-2 hover:bg-slate-600"
            href={`/vehicles/${v.id}/edit`}
          >
            Bearbeiten
          </Link>
          <DeleteVehicleButton id={v.id} redirectTo="/vehicles" />
        </div>
      </div>

      <div className="rounded-lg border border-slate-700 bg-slate-800/60 p-6">
        <dl className="grid grid-cols-2 gap-4 text-sm">
          <Item label="Kennzeichen" value={v.vin ?? "-"} />
          <Item label="Baujahr" value={v.year?.toString() ?? "-"} />
          <Item label="Kilometer" value={v.mileage?.toString() ?? "-"} />
          <Item
            label="Einkaufspreis"
            value={purchaseEuro === "-" ? "-" : `${purchaseEuro} EUR`}
          />
        </dl>

        {v.notes && (
          <div className="mt-6">
            <div className="mb-1 text-sm text-slate-300">Notizen</div>
            <div className="rounded border border-slate-700 bg-slate-800 p-3 text-slate-200">
              {v.notes}
            </div>
          </div>
        )}
      </div>

      <section id="fahrzeug-dokumente" className="rounded-lg border border-slate-700 bg-slate-800/60 p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-100">Fahrzeugdokumente</h2>
          <span className="rounded border border-slate-600 bg-slate-900 px-2 py-1 text-xs text-slate-300">
            {v.attachments.length} Datei{v.attachments.length === 1 ? "" : "en"}
          </span>
        </div>

        {v.attachments.length === 0 ? (
          <div className="rounded border border-dashed border-slate-700 bg-slate-800/40 px-3 py-4 text-sm text-slate-400">
            Keine Fahrzeugdokumente verknuepft.
          </div>
        ) : (
          <div className="overflow-hidden rounded border border-slate-700">
            <div className="hidden grid-cols-[minmax(0,1.6fr)_140px_140px_160px] gap-3 border-b border-slate-700 bg-slate-800/70 px-4 py-2 text-xs uppercase tracking-wide text-slate-400 md:grid">
              <div>Dokument</div>
              <div>Groesse</div>
              <div>Erstellt</div>
              <div className="text-right">Aktion</div>
            </div>
            <div className="divide-y divide-slate-700/80">
              {v.attachments.map((item) => (
                <div
                  key={item.id}
                  className="grid gap-3 px-4 py-3 md:grid-cols-[minmax(0,1.6fr)_140px_140px_160px] md:items-center"
                >
                  <div>
                    <div className="font-medium text-slate-100">{item.title}</div>
                    <div className="mt-1">
                      <span className={`inline-flex rounded border px-2 py-0.5 text-xs ${kindClass(item.kind)}`}>
                        {ATTACHMENT_KIND_LABEL[item.kind] ?? item.kind}
                      </span>
                    </div>
                  </div>
                  <div className="text-sm text-slate-300">{formatBytes(item.sizeBytes)}</div>
                  <div className="text-sm text-slate-300">{formatDate(item.createdAt)}</div>
                  <div className="flex md:justify-end">
                    <Link
                      href={`/api/customers/${item.customerId}/attachments/${item.id}`}
                      className="rounded border border-cyan-500/50 bg-cyan-500/10 px-3 py-1 text-sm text-cyan-200 hover:bg-cyan-500/20"
                    >
                      Oeffnen
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

function Item({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-slate-400">{label}</dt>
      <dd className="text-slate-100">{value}</dd>
    </div>
  );
}
