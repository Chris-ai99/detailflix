"use client";

import { useMemo, useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import { setDocumentPaid, setDocumentSent } from "@/app/documents/serverActions";

function toInputDate(value: Date | string | null | undefined) {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

function formatDocLabel(doc: { docNumber: string; isFinal: boolean; docType: string; offerType?: string | null }) {
  if (doc.isFinal) return doc.docNumber;
  if (doc.docType === "INVOICE") return `Rechnungsentwurf ${doc.docNumber}`;
  if (doc.docType === "OFFER") {
    return doc.offerType === "ESTIMATE"
      ? `Kostenvoranschlag-Entwurf ${doc.docNumber}`
      : `Angebotsentwurf ${doc.docNumber}`;
  }
  if (doc.docType === "PURCHASE_CONTRACT") return `Auftragsentwurf ${doc.docNumber}`;
  if (doc.docType === "CREDIT_NOTE") return `Gutschrift-Entwurf ${doc.docNumber}`;
  if (doc.docType === "STORNO") return `Storno-Entwurf ${doc.docNumber}`;
  return `Entwurf ${doc.docNumber}`;
}

function statusLabel(status: string, isFinal: boolean, sentAt?: Date | string | null) {
  if (status === "SENT" && sentAt) return "Versendet";
  if (status === "PAID") return "Bezahlt";
  if (status === "CANCELLED") return "Storniert";
  if (!isFinal) return "Entwurf";
  return "Offen";
}

function formatDate(value?: Date | string | null) {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export default function ViewerClient({ doc }: { doc: any }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [refreshKey, setRefreshKey] = useState(0);
  const [paidAtInput, setPaidAtInput] = useState(() => toInputDate(doc.paidAt ?? new Date()));

  const pdfUrl = useMemo(() => {
    return `/api/documents/${doc.id}/pdf?ts=${refreshKey}`;
  }, [doc.id, refreshKey]);

  useEffect(() => {
    setPaidAtInput(toInputDate(doc.paidAt ?? new Date()));
  }, [doc.paidAt]);

  function markPaid() {
    if (!paidAtInput) return;
    startTransition(async () => {
      await setDocumentPaid(doc.id, new Date(paidAtInput));
      setRefreshKey((k) => k + 1);
      router.refresh();
    });
  }

  function markSent() {
    startTransition(async () => {
      await setDocumentSent(doc.id);
      setRefreshKey((k) => k + 1);
      router.refresh();
    });
  }

  return (
    <div className="grid grid-cols-[1fr_520px] gap-4">
      <div className="space-y-4">
        <div className="rounded-lg border border-slate-700 bg-slate-800/60 p-4">
          <div className="text-sm text-slate-400">Dokument</div>
          <div className="text-lg font-semibold text-slate-100">{formatDocLabel(doc)}</div>
          <div className="text-xs text-slate-400">
            {statusLabel(doc.status, doc.isFinal, doc.sentAt)}
          </div>
          {doc.sentAt && (
            <div className="text-xs text-slate-400">Versendet am: {formatDate(doc.sentAt)}</div>
          )}
        </div>

        <div className="rounded-lg border border-slate-700 bg-slate-800/60 p-4">
          <div className="text-sm font-semibold text-slate-300">Aktionen</div>
          <div className="mt-3 flex flex-wrap gap-2">
            <a
              className="rounded bg-slate-800 px-3 py-2 text-sm hover:bg-slate-700"
              href={pdfUrl}
              target="_blank"
              rel="noreferrer"
            >
              PDF öffnen
            </a>
            <a
              className="rounded bg-slate-800 px-3 py-2 text-sm hover:bg-slate-700"
              href={pdfUrl}
              download
            >
              PDF herunterladen
            </a>

            {!doc.isFinal && (
              <button
                type="button"
                onClick={() => router.push(`/documents/${doc.id}/edit`)}
                className="rounded bg-cyan-700 px-3 py-2 text-sm text-white hover:bg-cyan-600"
              >
                Zum Bearbeiten
              </button>
            )}

            {doc.docType === "INVOICE" &&
              doc.isFinal &&
              !doc.sentAt &&
              doc.status !== "PAID" &&
              doc.status !== "CANCELLED" && (
              <button
                type="button"
                onClick={markSent}
                disabled={isPending}
                className="rounded bg-cyan-700 px-3 py-2 text-sm text-white hover:bg-cyan-600 disabled:opacity-50"
              >
                Als versendet markieren
              </button>
            )}
          </div>
        </div>

        {doc.docType === "INVOICE" && (
          <div className="rounded-lg border border-slate-700 bg-slate-800/60 p-4">
            <div className="text-sm font-semibold text-slate-300">Bezahlung</div>
            <div className="mt-3 grid grid-cols-[160px_1fr] gap-2">
              <input
                type="date"
                value={paidAtInput}
                onChange={(e) => setPaidAtInput(e.target.value)}
                disabled={!doc.isFinal || isPending || doc.status === "CANCELLED"}
                className="w-full rounded bg-slate-900 p-2 text-sm"
              />
              <div className="flex gap-2">
                <button
                  onClick={markPaid}
                  disabled={!doc.isFinal || isPending || doc.status === "CANCELLED" || !paidAtInput}
                  className="rounded bg-cyan-700 px-3 py-2 text-sm disabled:opacity-50"
                  type="button"
                >
                  {doc.status === "PAID" ? "Zahlungsdatum speichern" : "Als bezahlt markieren"}
                </button>
              </div>
            </div>
            {!doc.isFinal && (
              <div className="mt-2 text-xs text-slate-500">
                Bezahlen ist erst nach dem Finalisieren möglich.
              </div>
            )}
          </div>
        )}
      </div>

      <div className="rounded-lg border border-slate-700 bg-slate-800/60 p-2">
        <div className="mb-2 flex items-center justify-between px-2">
          <div className="font-semibold">Vorschau</div>
          <div className="flex gap-2">
            <a
              className="rounded bg-slate-800 px-3 py-1 hover:bg-slate-700"
              href={pdfUrl}
              target="_blank"
              rel="noreferrer"
            >
              PDF öffnen
            </a>
          </div>
        </div>

        <iframe title="PDF Preview" src={pdfUrl} className="h-[82vh] w-full rounded bg-white" />
      </div>
    </div>
  );
}
