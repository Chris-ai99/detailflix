import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import {
  deleteCustomer,
  deleteCustomerAttachment,
  uploadCustomerAttachment,
} from "./serverActions";

const ATTACHMENT_KIND_LABEL: Record<string, string> = {
  GENERAL: "Allgemein",
  VEHICLE_REGISTRATION: "Fahrzeugschein",
  PRIVACY_AGREEMENT_UNSIGNED: "Datenschutz (Vorlage)",
  PRIVACY_AGREEMENT_SIGNED: "Datenschutz (signiert)",
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
      },
    },
  });

  if (!customer) return notFound();

  const hasSignedPrivacyAgreement = customer.attachments.some(
    (item) => item.kind === "PRIVACY_AGREEMENT_SIGNED"
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{customer.name || "Ohne Name"}</h1>

        <div className="flex gap-2">
          <Link
            href={`/customers/${customer.id}/edit`}
            className="rounded bg-slate-800 px-3 py-2 hover:bg-slate-700"
          >
            Bearbeiten
          </Link>
          <Link href="/customers" className="rounded bg-slate-800 px-3 py-2 hover:bg-slate-700">
            Zurueck
          </Link>
        </div>
      </div>

      <div className="rounded bg-slate-900 p-4 space-y-2">
        <div>
          <span className="text-slate-400">E-Mail:</span> {customer.email ?? "-"}
        </div>
        <div>
          <span className="text-slate-400">Telefon:</span> {customer.phone ?? "-"}
        </div>
        <div>
          <span className="text-slate-400">USt-Id:</span> {customer.vatId ?? "-"}
        </div>
        <div>
          <span className="text-slate-400">Adresse:</span>{" "}
          {(customer.street ?? "-") +
            (customer.zip || customer.city ? `, ${customer.zip ?? ""} ${customer.city ?? ""}` : "") +
            (customer.country ? `, ${customer.country}` : "")}
        </div>
        <div>
          <span className="text-slate-400">Notizen:</span> {customer.notes ?? "-"}
        </div>
      </div>

      <div className="rounded bg-slate-900 p-4 space-y-4">
        <div>
          <h2 className="text-lg font-semibold">Dokumente</h2>
          <p className="text-xs text-slate-400">
            Hier koennen Sie z. B. Fahrzeugschein, Datenschutzvereinbarung oder sonstige Unterlagen
            ablegen.
          </p>
        </div>

        <form action={uploadCustomerAttachment} className="grid gap-3 rounded bg-slate-800/70 p-3">
          <input type="hidden" name="customerId" value={customer.id} />
          <div className="grid gap-3 md:grid-cols-[220px_1fr]">
            <select name="kind" defaultValue="GENERAL" className="rounded bg-slate-900 px-3 py-2">
              <option value="GENERAL">Allgemein</option>
              <option value="VEHICLE_REGISTRATION">Fahrzeugschein</option>
              <option value="PRIVACY_AGREEMENT_UNSIGNED">Datenschutz (Vorlage)</option>
              <option value="PRIVACY_AGREEMENT_SIGNED">Datenschutz (signiert)</option>
            </select>
            <input
              name="title"
              placeholder="Titel (optional, sonst Dateiname)"
              className="rounded bg-slate-900 px-3 py-2"
            />
          </div>
          <div className="grid gap-3 md:grid-cols-[1fr_auto]">
            <input
              type="file"
              name="file"
              required
              accept=".pdf,.png,.jpg,.jpeg,.webp,.txt,.doc,.docx"
              className="rounded bg-slate-900 px-3 py-2 file:mr-3 file:rounded file:border-0 file:bg-cyan-600 file:px-3 file:py-1 file:text-white"
            />
            <button className="rounded bg-cyan-600 px-4 py-2 font-medium text-white hover:bg-cyan-500">
              Dokument hochladen
            </button>
          </div>
        </form>

        {customer.attachments.length === 0 ? (
          <div className="rounded border border-slate-700 bg-slate-800/40 px-3 py-2 text-sm text-slate-400">
            Noch keine Dokumente hinterlegt.
          </div>
        ) : (
          <div className="space-y-2">
            {customer.attachments.map((item) => (
              <div
                key={item.id}
                className="flex flex-col gap-2 rounded border border-slate-700 bg-slate-800/40 px-3 py-2 md:flex-row md:items-center md:justify-between"
              >
                <div>
                  <div className="font-medium text-slate-100">{item.title}</div>
                  <div className="text-xs text-slate-400">
                    {ATTACHMENT_KIND_LABEL[item.kind] ?? item.kind} | {formatBytes(item.sizeBytes)} |{" "}
                    {formatDate(item.createdAt)}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Link
                    href={`/api/customers/${customer.id}/attachments/${item.id}`}
                    className="rounded bg-slate-700 px-3 py-1 text-sm hover:bg-slate-600"
                  >
                    Oeffnen
                  </Link>
                  <form action={deleteCustomerAttachment}>
                    <input type="hidden" name="customerId" value={customer.id} />
                    <input type="hidden" name="attachmentId" value={item.id} />
                    <button className="rounded bg-red-600 px-3 py-1 text-sm text-white hover:bg-red-500">
                      Loeschen
                    </button>
                  </form>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="rounded bg-slate-900 p-4 space-y-3">
        <h2 className="text-lg font-semibold">Datenschutzvereinbarung</h2>
        <p className="text-sm text-slate-300">
          Vorbereitung fuer Ihren Prozess: Dokument erzeugen, drucken oder digital signieren und danach
          im Kundenprofil ablegen.
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={`/customers/${customer.id}/privacy-agreement`}
            className="rounded bg-cyan-600 px-3 py-2 text-sm font-medium text-white hover:bg-cyan-500"
          >
            Vorlage oeffnen
          </Link>
          <span
            className={`rounded px-3 py-2 text-xs ${
              hasSignedPrivacyAgreement
                ? "bg-emerald-500/20 text-emerald-300"
                : "bg-amber-500/20 text-amber-300"
            }`}
          >
            {hasSignedPrivacyAgreement
              ? "Signierte Datenschutzvereinbarung vorhanden"
              : "Noch keine signierte Datenschutzvereinbarung"}
          </span>
        </div>
      </div>

      <div>
        <form action={deleteCustomer}>
          <input type="hidden" name="id" value={customer.id} />
          <button className="rounded bg-red-600 px-3 py-2 hover:bg-red-500">Kunde loeschen</button>
        </form>
      </div>
    </div>
  );
}
