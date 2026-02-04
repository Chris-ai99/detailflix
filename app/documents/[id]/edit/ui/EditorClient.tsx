"use client";

import { useMemo, useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";

import {
  toggleFinalizeDocument,
  updateDocumentBasics,
  searchCustomers,
  createCustomer,
  setDocumentCustomer,
  searchVehicles,
  createVehicle,
  setDocumentVehicle,
  searchServices,
  searchStockVehicles,
  addCustomLine,
  moveDocumentLine,
  deleteDocumentLine,
  deleteDocument,
  setDocumentPaid,
  cancelFinalDocument,
  createCreditNoteFromInvoice,

} from "@/app/documents/serverActions";

function toInputDate(value: Date | string | null | undefined) {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

function formatDocNumber(doc: { docNumber: string }) {
  return doc.docNumber;
}

function formatDocLabel(doc: { docNumber: string; isFinal: boolean; docType: string }) {
  if (doc.isFinal) return formatDocNumber(doc);
  if (doc.docType === "INVOICE") return `Rechnungsentwurf ${doc.docNumber}`;
  return `Entwurf ${doc.docNumber}`;
}

export default function EditorClient({ doc }: { doc: any }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [refreshKey, setRefreshKey] = useState(0);
  const [paidAtInput, setPaidAtInput] = useState(() => toInputDate(doc.paidAt ?? new Date()));
  const [creditSelection, setCreditSelection] = useState<
    Record<string, { selected: boolean; qty: number }>
  >({});
  const [step, setStep] = useState(1);

  const pdfUrl = useMemo(() => {
    // ts verhindert Cache
    return `/api/documents/${doc.id}/pdf?ts=${refreshKey}`;
  }, [doc.id, refreshKey]);

  useEffect(() => {
    setPaidAtInput(toInputDate(doc.paidAt ?? new Date()));
  }, [doc.paidAt]);

  useEffect(() => {
    const next: Record<string, { selected: boolean; qty: number }> = {};
    for (const line of doc.lines ?? []) {
      next[line.id] = {
        selected: false,
        qty: Number(line.quantity ?? 1),
      };
    }
    setCreditSelection(next);
  }, [doc.lines]);

  function saveBasics(formData: FormData) {
    const notesPublic = String(formData.get("notesPublic") ?? "").trim() || null;
    const notesInternal = String(formData.get("notesInternal") ?? "").trim() || null;
    const issueDateRaw = String(formData.get("issueDate") ?? "").trim();
    const dueDateRaw = String(formData.get("dueDate") ?? "").trim();

    const issueDate = issueDateRaw ? new Date(issueDateRaw) : undefined;
    const dueDate = dueDateRaw ? new Date(dueDateRaw) : null;

    startTransition(async () => {
      await updateDocumentBasics({
        id: doc.id,
        notesPublic,
        notesInternal,
        issueDate,
        dueDate,
      });

      // PDF Preview aktualisieren
      setRefreshKey((k) => k + 1);

      // Doc neu vom Server holen (falls du oben Werte direkt sehen willst)
      router.refresh();
    });
  }

  function toggleFinal() {
    startTransition(async () => {
      await toggleFinalizeDocument(doc.id);

      // PDF Preview aktualisieren
      setRefreshKey((k) => k + 1);

      // Doc neu laden (isFinal/docNumber aktualisieren)
      router.refresh();
    });
  }

  function markPaid() {
    if (!paidAtInput) return;
    startTransition(async () => {
      await setDocumentPaid(doc.id, new Date(paidAtInput));
      setRefreshKey((k) => k + 1);
      router.refresh();
    });
  }

  function markUnpaid() {
    startTransition(async () => {
      await setDocumentPaid(doc.id, null);
      setRefreshKey((k) => k + 1);
      router.refresh();
    });
  }

  function cancelInvoice() {
    if (!confirm("Rechnung wirklich stornieren?")) return;
    startTransition(async () => {
      await cancelFinalDocument(doc.id);
      setRefreshKey((k) => k + 1);
      router.refresh();
    });
  }

  function createCreditNote() {
    const lines = Object.entries(creditSelection)
      .filter(([, value]) => value.selected && value.qty > 0)
      .map(([lineId, value]) => ({ lineId, qty: value.qty }));

    if (lines.length === 0) return;

    startTransition(async () => {
      const creditId = await createCreditNoteFromInvoice({
        invoiceId: doc.id,
        lines,
      });
      router.push(`/documents/${creditId}/edit`);
    });
  }

  function deleteDraft() {
    if (!confirm("Entwurf wirklich löschen?")) return;
    startTransition(async () => {
      await deleteDocument(doc.id);
      router.push(doc.docType === "INVOICE" ? "/invoices" : "/offers");
    });
  }

  // -------------------- STEP 3: Dienstleistungen --------------------
  const [itemQuery, setItemQuery] = useState("");
  const [showItemResults, setShowItemResults] = useState(false);
  const [itemResults, setItemResults] = useState<{ type: "service" | "stock"; item: any }[]>([]);
  const [lineDescription, setLineDescription] = useState("");
  const [lineQty, setLineQty] = useState(1);
  const [linePrice, setLinePrice] = useState(0);
  const [lineDiscount, setLineDiscount] = useState(0);
  const [lineVatRate, setLineVatRate] = useState(19);
  const [, setSelectedItem] = useState<{ type: "service" | "stock"; item: any } | null>(null);
  const [activeLineId, setActiveLineId] = useState<string | null>(doc.lines?.[0]?.id ?? null);

  // wenn sich lines durch refresh ändern: activeLineId ggf. stabil halten
  useEffect(() => {
    if (!activeLineId && doc.lines?.length) setActiveLineId(doc.lines[0].id);
  }, [doc.lines]);

  // Services suchen (debounced)

  // Dienstleistungen + Fahrzeugbestand suchen (debounced)
  useEffect(() => {
    const q = itemQuery.trim();
    const t = setTimeout(() => {
      startTransition(async () => {
        const [services, stock] = await Promise.all([
          searchServices(q),
          searchStockVehicles(q),
        ]);
        const combined = [
          ...services.map((s: any) => ({ type: "service" as const, item: s })),
          ...stock.map((v: any) => ({ type: "stock" as const, item: v })),
        ];
        setItemResults(combined);
      });
    }, 200);

    return () => clearTimeout(t);
  }, [itemQuery]);

  function selectService(service: any) {
    const qty =
      service.pricingType === "AW"
        ? Number(service.awDefaultQty ?? 1)
        : (Number(service.defaultMinutes ?? 60) || 60) / 60;
    const unitPrice =
      service.pricingType === "AW"
        ? (Number(service.awUnitPriceCents ?? 0) || 0) / 100
        : (Number(service.hourlyRateCents ?? 0) || 0) / 100;

    setSelectedItem({ type: "service", item: service });
    setShowItemResults(false);
    setItemQuery(service.name ?? "");
    setLineQty(qty);
    setLinePrice(unitPrice);
    setLineDiscount(0);
    setLineVatRate(Number(service.vatRate ?? 19));
    setLineDescription(service.shortText ?? "");
  }

  function selectStockVehicle(vehicle: any) {
    setSelectedItem({ type: "stock", item: vehicle });
    setShowItemResults(false);
    setItemQuery(`Bestand: ${vehicle.make ?? "-"} ${vehicle.model ?? ""}`.trim());
    setLineQty(1);
    setLinePrice((Number(vehicle.purchaseCents ?? 0) || 0) / 100);
    setLineDiscount(0);
    setLineVatRate(19);
    setLineDescription(vehicle.vin ? `VIN: ${vehicle.vin}` : "");
  }

  function addPositionLine() {
    const title = itemQuery.trim() || "Freitext";
    if (!itemQuery.trim() && !lineDescription.trim()) return;
    startTransition(async () => {
      await addCustomLine({
        documentId: doc.id,
        title,
        description: lineDescription.trim() || null,
        qty: lineQty,
        unitPrice: linePrice,
        discount: lineDiscount,
        vatRate: lineVatRate,
      });
      setRefreshKey((k) => k + 1);
      router.refresh();
      setItemQuery("");
      setItemResults([]);
      setLineDescription("");
      setLineQty(1);
      setLinePrice(0);
      setLineDiscount(0);
      setLineVatRate(19);
      setSelectedItem(null);
      setShowItemResults(false);
    });
  }

  function removeLine(lineId: string) {
    startTransition(async () => {
      await deleteDocumentLine(lineId);
      setRefreshKey((k) => k + 1);
      router.refresh();
      if (activeLineId === lineId) setActiveLineId(null);
    });
  }

  function moveLine(lineId: string, direction: "up" | "down") {
    startTransition(async () => {
      await moveDocumentLine({ documentId: doc.id, lineId, direction });
      setRefreshKey((k) => k + 1);
      router.refresh();
    });
  }

  return (
    <div className="grid grid-cols-[1fr_520px] gap-4">
      {/* LINKS: Wizard */}
      <div className="space-y-4">
        <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="text-sm text-slate-400">Dokument</div>
              <div className="text-lg font-semibold">
                {doc.docType === "INVOICE"
                  ? "Rechnung"
                  : doc.docType === "OFFER"
                    ? "Angebot"
                    : doc.docType === "CREDIT_NOTE"
                      ? "Gutschrift"
                      : "Kaufvertrag"}{" "}
                — {formatDocLabel(doc)}
              </div>
            </div>

            <label className="flex items-center gap-3 text-sm text-slate-300">
              <span>Entwurf</span>
              <span className="relative inline-flex h-6 w-11 items-center">
                <input
                  type="checkbox"
                  className="peer sr-only"
                  checked={doc.isFinal}
                  onChange={() => toggleFinal()}
                  disabled={isPending}
                />
                <span className="h-6 w-11 rounded-full bg-slate-700 transition peer-checked:bg-emerald-600 peer-disabled:opacity-50" />
                <span className="absolute left-1 top-1 h-4 w-4 rounded-full bg-white transition peer-checked:translate-x-5" />
              </span>
              <span>Final</span>
            </label>
          </div>
        </div>

        {/* Schritt 1 */}
        <div className="rounded-lg border border-slate-800 bg-slate-900/40">
          <button
            type="button"
            onClick={() => setStep(1)}
            className="flex w-full items-center justify-between border-b border-slate-800 px-4 py-3 text-left text-sm font-semibold text-slate-200 hover:bg-slate-900/60"
          >
            <span>Schritt 1: Allgemeine Daten</span>
            <span className="text-xs text-slate-400">{formatDocLabel(doc)}</span>
          </button>

          {step === 1 && (
            <div className="p-4">
              <form action={saveBasics} className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm text-slate-300">Dokumentnummer</label>
                    <input
                      value={formatDocNumber(doc)}
                      disabled
                      className="w-full rounded bg-slate-950 p-2 text-slate-400"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-slate-300">Rechnungsdatum</label>
                    <input
                      type="date"
                      name="issueDate"
                      defaultValue={toInputDate(doc.issueDate)}
                      className="w-full rounded bg-slate-950 p-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-slate-300">Fällig am</label>
                    <input
                      type="date"
                      name="dueDate"
                      defaultValue={toInputDate(doc.dueDate)}
                      className="w-full rounded bg-slate-950 p-2"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm text-slate-300">Kundennotiz</label>
                  <textarea
                    name="notesPublic"
                    defaultValue={doc.notesPublic ?? ""}
                    className="w-full rounded bg-slate-950 p-2"
                  />
                </div>

                <div>
                  <label className="block text-sm text-slate-300">Interne Notiz</label>
                  <textarea
                    name="notesInternal"
                    defaultValue={doc.notesInternal ?? ""}
                    className="w-full rounded bg-slate-950 p-2"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <button
                    type="submit"
                    disabled={isPending}
                    className="rounded bg-slate-800 px-3 py-2 hover:bg-slate-700 disabled:opacity-50"
                  >
                    Speichern
                  </button>
                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    className="rounded bg-emerald-700 px-4 py-2 text-sm hover:bg-emerald-600"
                  >
                    Weiter
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>

        {/* Schritt 2 */}
        <Step2CustomerVehicle
          documentId={doc.id}
          currentCustomer={doc.customer}
          currentVehicle={doc.vehicle}
          onChanged={() => {
            setRefreshKey((k) => k + 1);
            router.refresh();
          }}
          active={step === 2}
          onOpen={() => setStep(2)}
          onNext={() => setStep(3)}
          onPrev={() => setStep(1)}
        />

        {/* Schritt 3: Dienstleistungen */}
        <div className="rounded-lg border border-slate-800 bg-slate-900/40">
          <button
            type="button"
            onClick={() => setStep(3)}
            className="flex w-full items-center justify-between border-b border-slate-800 px-4 py-3 text-left text-sm font-semibold text-slate-200 hover:bg-slate-900/60"
          >
            <span>Schritt 3: Dienstleistungen</span>
            <span className="text-xs text-slate-400">{doc.lines?.length ?? 0} Positionen</span>
          </button>

          {step === 3 && (
            <div className="p-4 space-y-4">
              <div className="rounded border border-slate-800 bg-slate-950 p-3">
                <div className="mb-3 text-sm font-semibold text-slate-300">Position</div>
                <div className="grid grid-cols-[1fr_340px] gap-4">
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs text-slate-300">Suche nach Dienstleistungen</label>
                      <div className="flex gap-2">
                        <input
                          value={itemQuery}
                          onChange={(e) => {
                            const value = e.target.value;
                            setItemQuery(value);
                            setSelectedItem(null);
                            setShowItemResults(value.trim().length > 0);
                          }}
                          placeholder="Suche"
                          className="w-full rounded bg-slate-900 p-2 text-sm"
                        />
                        <button
                          type="button"
                          className="rounded bg-cyan-600 px-3 py-2 text-sm text-white"
                          onClick={() => setShowItemResults((v) => !v)}
                        >
                          ≡
                        </button>
                      </div>

                      <div
                        className={`mt-2 max-h-40 overflow-auto rounded border border-slate-800 bg-slate-900 ${
                          showItemResults ? "" : "hidden"
                        }`}
                      >
                        {itemResults.length === 0 ? (
                          <div className="p-3 text-sm text-slate-500">
                            {itemQuery.trim() ? "Keine Treffer" : "Vorschläge werden geladen…"}
                          </div>
                        ) : (
                          itemResults.map((entry) => {
                            if (entry.type === "service") {
                              const s = entry.item;
                              return (
                                <button
                                  key={s.id}
                                  type="button"
                                  onClick={() => selectService(s)}
                                  className="flex w-full items-start justify-between gap-2 border-b border-slate-800 p-3 text-left hover:bg-slate-800/70"
                                >
                                  <div>
                                    <div className="font-semibold text-slate-100">{s.name}</div>
                                    <div className="text-xs text-slate-400">
                                      {s.shortText ?? ""}
                                    </div>
                                  </div>
                                  <div className="text-xs text-cyan-400">Service</div>
                                </button>
                              );
                            }

                            const v = entry.item;
                            return (
                              <button
                                key={v.id}
                                type="button"
                                onClick={() => selectStockVehicle(v)}
                                className="flex w-full items-start justify-between gap-2 border-b border-slate-800 p-3 text-left hover:bg-slate-800/70"
                              >
                                <div>
                                  <div className="font-semibold text-slate-100">
                                    Bestand: {v.make ?? "-"} {v.model ?? ""}
                                  </div>
                                  <div className="text-xs text-slate-400">VIN: {v.vin ?? "-"}</div>
                                </div>
                                <div className="text-xs text-cyan-400">Bestand</div>
                              </button>
                            );
                          })
                        )}
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs text-slate-300">Beschreibung</label>
                      <textarea
                        value={lineDescription}
                        onChange={(e) => setLineDescription(e.target.value)}
                        className="h-24 w-full rounded bg-slate-900 p-2 text-sm"
                      />
                    </div>

                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setItemQuery("");
                          setLineDescription("");
                          setLineQty(1);
                          setLinePrice(0);
                          setLineDiscount(0);
                          setLineVatRate(19);
                          setSelectedItem(null);
                          setShowItemResults(false);
                        }}
                        className="rounded bg-slate-800 px-4 py-2 text-sm hover:bg-slate-700"
                      >
                        Abbrechen
                      </button>
                      <button
                        type="button"
                        onClick={addPositionLine}
                        disabled={!itemQuery.trim() && !lineDescription.trim()}
                        className="rounded bg-emerald-700 px-4 py-2 text-sm disabled:opacity-50"
                      >
                        Hinzufügen
                      </button>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs text-slate-300">Anzahl</label>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setLineQty((q) => Math.max(1, q - 1))}
                          className="h-9 w-9 rounded bg-slate-800 text-lg hover:bg-slate-700"
                        >
                          -
                        </button>
                        <input
                          type="number"
                          value={lineQty}
                          min={1}
                          onChange={(e) => setLineQty(Number(e.target.value) || 1)}
                          className="w-20 rounded bg-slate-900 p-2 text-center text-sm"
                        />
                        <button
                          type="button"
                          onClick={() => setLineQty((q) => q + 1)}
                          className="h-9 w-9 rounded bg-slate-800 text-lg hover:bg-slate-700"
                        >
                          +
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs text-slate-300">Preis</label>
                      <div className="flex items-center gap-2">
                        <span className="rounded bg-slate-800 px-2 py-2 text-sm text-slate-300">€</span>
                        <input
                          type="number"
                          step="0.01"
                          value={linePrice}
                          onChange={(e) => setLinePrice(Number(e.target.value) || 0)}
                          className="w-full rounded bg-slate-900 p-2 text-sm"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs text-slate-300">Rabatt ↔ Aufpreis</label>
                      <div className="flex items-center justify-between text-[10px] text-slate-400">
                        <span>-100%</span>
                        <span>{lineDiscount}%</span>
                        <span>100%</span>
                      </div>
                      <input
                        type="range"
                        min={-100}
                        max={100}
                        value={lineDiscount}
                        onChange={(e) => setLineDiscount(Number(e.target.value))}
                        className="w-full accent-cyan-400"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Alle Linien anzeigen */}
              <div>
                <div className="mb-2 text-sm text-slate-300">Positionen</div>
                {!doc.lines || doc.lines.length === 0 ? (
                  <div className="rounded border border-slate-800 bg-slate-950 p-3 text-sm text-slate-400">
                    Keine Positionen hinzugefügt
                  </div>
                ) : (
                  <div className="space-y-2 rounded border border-slate-800 bg-slate-950 p-3">
                    {doc.lines.map((line: any, idx: number) => {
                      const qty = Number(line.quantity ?? 0);
                      const unit = Number(line.unitPrice ?? 0);
                      const total = qty * unit;

                      return (
                        <div
                          key={line.id}
                          className={`flex w-full items-start justify-between gap-2 rounded p-2 text-left transition ${
                            activeLineId === line.id
                              ? "bg-slate-800 ring-1 ring-emerald-500"
                              : "hover:bg-slate-800"
                          }`}
                        >
                          <button
                            type="button"
                            onClick={() => setActiveLineId(line.id)}
                            className="flex-1 text-left"
                          >
                            <div className="text-sm font-semibold text-slate-100">
                              {line.title || line.description || "Ohne Name"}
                            </div>
                            <div className="text-xs text-slate-400">
                              {qty} x {unit.toFixed(2)} € = {total.toFixed(2)} €
                            </div>
                          </button>

                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => moveLine(line.id, "up")}
                              disabled={isPending || idx === 0}
                              className="rounded bg-slate-700 px-2 py-1 text-xs disabled:opacity-40"
                            >
                              ↑
                            </button>
                            <button
                              type="button"
                              onClick={() => moveLine(line.id, "down")}
                              disabled={isPending || idx === doc.lines.length - 1}
                              className="rounded bg-slate-700 px-2 py-1 text-xs disabled:opacity-40"
                            >
                              ↓
                            </button>
                            <button
                              type="button"
                              onClick={() => removeLine(line.id)}
                              disabled={isPending}
                              className="rounded bg-rose-700 px-2 py-1 text-xs disabled:opacity-50"
                            >
                              Löschen
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="rounded bg-slate-800 px-3 py-2 text-sm hover:bg-slate-700"
                >
                  Zurück
                </button>
                <button
                  type="button"
                  onClick={() => setStep(4)}
                  className="rounded bg-emerald-700 px-4 py-2 text-sm hover:bg-emerald-600"
                >
                  Weiter
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="rounded-lg border border-slate-800 bg-slate-900/40">
          <button
            type="button"
            onClick={() => setStep(4)}
            className="flex w-full items-center justify-between border-b border-slate-800 px-4 py-3 text-left text-sm font-semibold text-slate-200 hover:bg-slate-900/60"
          >
            <span>Schritt 4: Speichern und Senden</span>
          </button>

          {step === 4 && (
            <div className="p-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded border border-slate-800 bg-slate-950 p-3">
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

                    {!doc.isFinal && (
                      <button
                        onClick={deleteDraft}
                        disabled={isPending}
                        className="rounded bg-rose-700 px-3 py-2 text-sm disabled:opacity-50"
                        type="button"
                      >
                        Entwurf löschen
                      </button>
                    )}
                  </div>
                </div>

                {doc.docType === "INVOICE" && (
                  <div className="rounded border border-slate-800 bg-slate-950 p-3">
                    <div className="text-sm font-semibold text-slate-300">Bezahlung</div>
                    <div className="mt-3 grid grid-cols-[160px_1fr] gap-2">
                      <input
                        type="date"
                        value={paidAtInput}
                        onChange={(e) => setPaidAtInput(e.target.value)}
                        disabled={!doc.isFinal || isPending}
                        className="w-full rounded bg-slate-900 p-2 text-sm"
                      />
                      <div className="flex gap-2">
                        {doc.status === "PAID" ? (
                          <button
                            onClick={markUnpaid}
                            disabled={!doc.isFinal || isPending}
                            className="rounded bg-slate-800 px-3 py-2 text-sm hover:bg-slate-700 disabled:opacity-50"
                            type="button"
                          >
                            Zahlung entfernen
                          </button>
                        ) : (
                          <button
                            onClick={markPaid}
                            disabled={!doc.isFinal || isPending || !paidAtInput}
                            className="rounded bg-emerald-700 px-3 py-2 text-sm disabled:opacity-50"
                            type="button"
                          >
                            Als bezahlt markieren
                          </button>
                        )}
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

              {doc.docType === "INVOICE" && doc.isFinal && (
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <div className="rounded border border-slate-800 bg-slate-950 p-3">
                    <div className="text-sm font-semibold text-slate-300">Storno</div>
                    <div className="mt-1 text-xs text-slate-500">
                      Storniert die Rechnung. Das Dokument bleibt erhalten.
                    </div>
                    <button
                      onClick={cancelInvoice}
                      disabled={isPending || doc.status === "CANCELLED"}
                      className="mt-3 rounded bg-rose-700 px-3 py-2 text-sm disabled:opacity-50"
                      type="button"
                    >
                      {doc.status === "CANCELLED" ? "Bereits storniert" : "Rechnung stornieren"}
                    </button>
                  </div>

                  <div className="rounded border border-slate-800 bg-slate-950 p-3">
                    <div className="text-sm font-semibold text-slate-300">Gutschrift</div>
                    <div className="mt-1 text-xs text-slate-500">
                      Wähle Positionen für eine (Teil‑)Gutschrift.
                    </div>

                    <div className="mt-3 max-h-40 space-y-2 overflow-auto rounded border border-slate-800 p-2">
                      {(doc.lines ?? []).map((line: any) => {
                        const entry = creditSelection[line.id];
                        const maxQty = Number(line.quantity ?? 0);
                        return (
                          <label
                            key={line.id}
                            className="flex items-center justify-between gap-2 rounded px-2 py-1 text-sm hover:bg-slate-900"
                          >
                            <div className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={entry?.selected ?? false}
                                onChange={(e) =>
                                  setCreditSelection((prev) => ({
                                    ...prev,
                                    [line.id]: {
                                      selected: e.target.checked,
                                      qty: prev[line.id]?.qty ?? maxQty,
                                    },
                                  }))
                                }
                              />
                              <span className="text-slate-200">
                                {line.title || line.description || "Ohne Name"}
                              </span>
                            </div>
                            <input
                              type="number"
                              min={0}
                              max={maxQty}
                              step="0.01"
                              value={entry?.qty ?? maxQty}
                              onChange={(e) =>
                                setCreditSelection((prev) => ({
                                  ...prev,
                                  [line.id]: {
                                    selected: prev[line.id]?.selected ?? false,
                                    qty: Number(e.target.value),
                                  },
                                }))
                              }
                              className="w-20 rounded bg-slate-900 p-1 text-right text-xs"
                            />
                          </label>
                        );
                      })}
                    </div>

                    <button
                      onClick={createCreditNote}
                      disabled={
                        isPending ||
                        Object.values(creditSelection).filter((v) => v.selected && v.qty > 0).length === 0
                      }
                      className="mt-3 rounded bg-slate-800 px-3 py-2 text-sm hover:bg-slate-700 disabled:opacity-50"
                      type="button"
                    >
                      Gutschrift erstellen
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* RECHTS: PDF Vorschau */}
      <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-2">
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

        <iframe
          title="PDF Preview"
          src={pdfUrl}
          className="h-[82vh] w-full rounded bg-white"
        />
      </div>
    </div>
  );
}

function Step2CustomerVehicle({
  documentId,
  currentCustomer,
  currentVehicle,
  onChanged,
  active,
  onOpen,
  onNext,
  onPrev,
}: {
  documentId: string;
  currentCustomer: any;
  currentVehicle: any;
  onChanged: () => void;
  active: boolean;
  onOpen: () => void;
  onNext: () => void;
  onPrev: () => void;
}) {
  const [isPending, startTransition] = useTransition();

  // Kunde
  const [customerQuery, setCustomerQuery] = useState("");
  const [customerResults, setCustomerResults] = useState<any[]>([]);
  const [showCustomerCreate, setShowCustomerCreate] = useState(false);
  const [customerIsBusiness, setCustomerIsBusiness] = useState(false);

  // Fahrzeug
  const [vehicleQuery, setVehicleQuery] = useState("");
  const [vehicleResults, setVehicleResults] = useState<any[]>([]);
  const [showVehicleCreate, setShowVehicleCreate] = useState(false);

  // Kunden suchen (debounced light)
  useEffect(() => {
    const q = customerQuery.trim();
    if (!q) {
      setCustomerResults([]);
      return;
    }

    const t = setTimeout(() => {
      startTransition(async () => {
        const res = await searchCustomers(q);
        setCustomerResults(res);
      });
    }, 200);

    return () => clearTimeout(t);
  }, [customerQuery]);

  // Fahrzeuge suchen
  useEffect(() => {
    const q = vehicleQuery.trim();
    if (!q) {
      setVehicleResults([]);
      return;
    }

    const t = setTimeout(() => {
      startTransition(async () => {
        const res = await searchVehicles(q, currentCustomer?.id ?? null);
        setVehicleResults(res);
      });
    }, 200);

    return () => clearTimeout(t);
  }, [vehicleQuery, currentCustomer?.id]);

  function pickCustomer(id: string) {
    startTransition(async () => {
      await setDocumentCustomer(documentId, id);
      onChanged();
    });
  }

  function clearCustomer() {
    startTransition(async () => {
      await setDocumentCustomer(documentId, null);
      onChanged();
    });
  }

  function pickVehicle(id: string) {
    startTransition(async () => {
      await setDocumentVehicle(documentId, id);
      onChanged();
    });
  }

  function clearVehicle() {
    startTransition(async () => {
      await setDocumentVehicle(documentId, null);
      onChanged();
    });
  }

  async function submitNewCustomer(formData: FormData) {
    const isBusiness = String(formData.get("isBusiness") ?? "") === "on";
    const name = String(formData.get("name") ?? "").trim();
    const street = String(formData.get("street") ?? "").trim() || null;
    const zip = String(formData.get("zip") ?? "").trim() || null;
    const city = String(formData.get("city") ?? "").trim() || null;
    const email = String(formData.get("email") ?? "").trim() || null;
    const phone = String(formData.get("phone") ?? "").trim() || null;
    const vatId = String(formData.get("vatId") ?? "").trim() || null;

    startTransition(async () => {
      const newId = await createCustomer({
        name,
        isBusiness,
        street,
        zip,
        city,
        email,
        phone,
        vatId,
      });
      await setDocumentCustomer(documentId, newId);
      setShowCustomerCreate(false);
      setCustomerQuery("");
      setCustomerIsBusiness(false);
      onChanged();
    });
  }

  async function submitNewVehicle(formData: FormData) {
    const make = String(formData.get("make") ?? "").trim() || null;
    const model = String(formData.get("model") ?? "").trim() || null;
    const vin = String(formData.get("vin") ?? "").trim() || null;

    const yearRaw = String(formData.get("year") ?? "").trim();
    const year = yearRaw ? Number(yearRaw) : null;

    const mileageRaw = String(formData.get("mileage") ?? "").trim();
    const mileage = mileageRaw ? Number(mileageRaw) : null;

    startTransition(async () => {
      const newId = await createVehicle({
        make,
        model,
        vin,
        year: year !== null && Number.isFinite(year) ? year : null,
        mileage: mileage !== null && Number.isFinite(mileage) ? mileage : null,
        customerId: currentCustomer?.id ?? null,
      });
      await setDocumentVehicle(documentId, newId);
      setShowVehicleCreate(false);
      setVehicleQuery("");
      onChanged();
    });
  }

  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900/40">
      <button
        type="button"
        onClick={onOpen}
        className="flex w-full items-center justify-between border-b border-slate-800 px-4 py-3 text-left text-sm font-semibold text-slate-200 hover:bg-slate-900/60"
      >
        <span>Schritt 2: Kunde &amp; Fahrzeug</span>
        <span className="text-xs text-slate-400">
          {currentCustomer?.name ||
            (currentCustomer?.isBusiness ? "Gewerbekunde" : "Kein Kunde")}{" "}
          {currentVehicle ? `• ${currentVehicle.make ?? ""} ${currentVehicle.model ?? ""}` : ""}
        </span>
      </button>

      {active && (
        <div className="p-4 space-y-4">
          <div className="grid grid-cols-[1fr_auto_1fr] items-start gap-4">
            <div>
              <div className="mb-2 text-sm text-slate-300">Suche nach Kunden</div>
              <div className="flex gap-2">
                <input
                  value={customerQuery}
                  onChange={(e) => setCustomerQuery(e.target.value)}
                  placeholder="Suche"
                  className="w-full rounded bg-slate-950 p-2"
                />
                <button
                  type="button"
                  className="rounded bg-cyan-600 px-3 py-2 text-sm text-white"
                >
                  ≡
                </button>
              </div>

              <div className="mt-2 max-h-40 overflow-auto rounded border border-slate-800">
                {customerResults.length === 0 ? (
                  <div className="p-3 text-sm text-slate-500">Keine Treffer</div>
                ) : (
                  customerResults.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => pickCustomer(c.id)}
                      className="flex w-full items-start justify-between gap-2 border-b border-slate-800 p-3 text-left hover:bg-slate-900"
                    >
                      <div>
                        <div className="font-semibold text-slate-100">
                          {c.name || (c.isBusiness ? "Gewerbekunde" : "Ohne Name")}
                        </div>
                        <div className="text-xs text-slate-400">
                          {(c.city ?? "")} {c.email ? `• ${c.email}` : ""}{" "}
                          {c.phone ? `• ${c.phone}` : ""}
                        </div>
                      </div>
                      <div className="text-xs text-slate-500">{c.id.slice(0, 6)}…</div>
                    </button>
                  ))
                )}
              </div>
              {currentCustomer && (
                <button
                  type="button"
                  onClick={clearCustomer}
                  disabled={isPending}
                  className="mt-2 rounded bg-rose-700 px-3 py-1 text-xs disabled:opacity-50"
                >
                  Kunde entfernen
                </button>
              )}
            </div>

            <div className="pt-8 text-center text-xs text-slate-400">— ODER —</div>

            <div className="flex items-center justify-end pt-6">
              <label className="flex items-center gap-3 text-sm text-slate-300">
                <span>Neuen Kunden anlegen</span>
                <span className="relative inline-flex h-6 w-11 items-center">
                  <input
                    type="checkbox"
                    className="peer sr-only"
                    checked={showCustomerCreate}
                    onChange={(e) => setShowCustomerCreate(e.target.checked)}
                  />
                  <span className="h-6 w-11 rounded-full bg-slate-700 transition peer-checked:bg-cyan-600" />
                  <span className="absolute left-1 top-1 h-4 w-4 rounded-full bg-white transition peer-checked:translate-x-5" />
                </span>
              </label>
            </div>
          </div>

          {showCustomerCreate && (
            <form action={submitNewCustomer} className="grid grid-cols-2 gap-2">
              <label className="col-span-2 flex items-center gap-3 text-sm text-slate-300">
                <span>Gewerbekunde</span>
                <span className="relative inline-flex h-6 w-11 items-center">
                  <input
                    type="checkbox"
                    name="isBusiness"
                    className="peer sr-only"
                    checked={customerIsBusiness}
                    onChange={(e) => setCustomerIsBusiness(e.target.checked)}
                  />
                  <span className="h-6 w-11 rounded-full bg-slate-700 transition peer-checked:bg-cyan-600" />
                  <span className="absolute left-1 top-1 h-4 w-4 rounded-full bg-white transition peer-checked:translate-x-5" />
                </span>
              </label>

              <input
                name="name"
                placeholder={customerIsBusiness ? "Firma (optional)" : "Name *"}
                className="col-span-2 rounded bg-slate-900 p-2"
                required={!customerIsBusiness}
              />
              <input name="street" placeholder="Straße" className="col-span-2 rounded bg-slate-900 p-2" />
              <input name="zip" placeholder="PLZ" className="rounded bg-slate-900 p-2" />
              <input name="city" placeholder="Ort" className="rounded bg-slate-900 p-2" />
              <input name="email" placeholder="E-Mail" className="rounded bg-slate-900 p-2" />
              <input name="phone" placeholder="Telefon" className="rounded bg-slate-900 p-2" />
              <input name="vatId" placeholder="USt-IdNr." className="col-span-2 rounded bg-slate-900 p-2" />

              <button
                className="col-span-2 rounded bg-emerald-700 px-3 py-2 disabled:opacity-50"
                disabled={isPending}
                type="submit"
              >
                Kunde speichern &amp; auswählen
              </button>
            </form>
          )}

          <div className="grid grid-cols-[1fr_auto_1fr] items-start gap-4">
            <div>
              <div className="mb-2 text-sm text-slate-300">Suche nach Fahrzeugen</div>
              <div className="flex gap-2">
                <input
                  value={vehicleQuery}
                  onChange={(e) => setVehicleQuery(e.target.value)}
                  placeholder="Suche"
                  className="w-full rounded bg-slate-950 p-2"
                  disabled={!currentCustomer}
                />
                <button
                  type="button"
                  className="rounded bg-cyan-600 px-3 py-2 text-sm text-white"
                  disabled={!currentCustomer}
                >
                  ≡
                </button>
              </div>

              <div className="mt-2 max-h-40 overflow-auto rounded border border-slate-800">
                {vehicleResults.length === 0 ? (
                  <div className="p-3 text-sm text-slate-500">
                    {currentCustomer ? "Keine Treffer" : "Bitte zuerst Kunden auswählen"}
                  </div>
                ) : (
                  vehicleResults.map((v) => (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => pickVehicle(v.id)}
                      className="flex w-full items-start justify-between gap-2 border-b border-slate-800 p-3 text-left hover:bg-slate-900"
                    >
                      <div>
                        <div className="font-semibold text-slate-100">
                          {v.make ?? "-"} {v.model ?? ""}
                        </div>
                        <div className="text-xs text-slate-400">
                          VIN: {v.vin ?? "-"} • Jahr: {v.year ?? "-"} • KM: {v.mileage ?? "-"}
                        </div>
                      </div>
                      <div className="text-xs text-slate-500">{v.id.slice(0, 6)}…</div>
                    </button>
                  ))
                )}
              </div>
              {currentVehicle && (
                <button
                  type="button"
                  onClick={clearVehicle}
                  disabled={isPending}
                  className="mt-2 rounded bg-rose-700 px-3 py-1 text-xs disabled:opacity-50"
                >
                  Fahrzeug entfernen
                </button>
              )}
            </div>

            <div className="pt-8 text-center text-xs text-slate-400">— ODER —</div>

            <div className="flex items-center justify-end pt-6">
              <button
                type="button"
                onClick={() => setShowVehicleCreate((v) => !v)}
                disabled={!currentCustomer}
                className="rounded bg-slate-800 px-3 py-2 text-sm hover:bg-slate-700 disabled:opacity-50"
              >
                {showVehicleCreate ? "Schließen" : "Neues Fahrzeug anlegen"}
              </button>
            </div>
          </div>

          {showVehicleCreate && currentCustomer && (
            <form action={submitNewVehicle} className="grid grid-cols-2 gap-2">
              <input name="make" placeholder="Marke" className="rounded bg-slate-900 p-2" />
              <input name="model" placeholder="Modell" className="rounded bg-slate-900 p-2" />
              <input name="vin" placeholder="VIN" className="col-span-2 rounded bg-slate-900 p-2" />
              <input name="year" placeholder="Baujahr" className="rounded bg-slate-900 p-2" />
              <input name="mileage" placeholder="KM" className="rounded bg-slate-900 p-2" />

              <button
                className="col-span-2 rounded bg-emerald-700 px-3 py-2 disabled:opacity-50"
                disabled={isPending}
                type="submit"
              >
                Fahrzeug speichern &amp; auswählen
              </button>
            </form>
          )}

          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={onPrev}
              className="rounded bg-slate-800 px-3 py-2 text-sm hover:bg-slate-700"
            >
              Zurück
            </button>
            <button
              type="button"
              onClick={onNext}
              className="rounded bg-emerald-700 px-4 py-2 text-sm hover:bg-emerald-600"
            >
              Weiter
            </button>
          </div>

          {isPending && <div className="mt-3 text-xs text-slate-500">Speichere…</div>}
        </div>
      )}
    </div>
  );
}
