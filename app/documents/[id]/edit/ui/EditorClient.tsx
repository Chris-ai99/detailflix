"use client";

import { useMemo, useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";

import {
  finalizeDocument,
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
  createCreditNoteFromInvoice,
  createStornoFromInvoice,
} from "@/app/documents/serverActions";

function toInputDate(value: Date | string | null | undefined) {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

function addDaysToInputDate(value: string, days: number) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function formatDocNumber(doc: { docNumber: string }) {
  return doc.docNumber;
}

function formatDocLabel(doc: {
  docNumber: string;
  isFinal: boolean;
  docType: string;
  offerType?: string | null;
}) {
  if (doc.isFinal) return formatDocNumber(doc);
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

export default function EditorClient({ doc }: { doc: any }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [refreshKey, setRefreshKey] = useState(0);
  const [paidAtInput, setPaidAtInput] = useState(() => toInputDate(doc.paidAt ?? new Date()));
  const [creditSelection, setCreditSelection] = useState<
    Record<string, { selected: boolean; qty: number }>
  >({});
  const [step, setStep] = useState(1);
  const [issueDateInput, setIssueDateInput] = useState(() => toInputDate(doc.issueDate));
  const [serviceDateAuto, setServiceDateAuto] = useState(() => doc.docType === "INVOICE");
  const [dueDateAuto, setDueDateAuto] = useState(() => doc.docType === "INVOICE");
  const [validUntilAuto, setValidUntilAuto] = useState(() => doc.docType === "OFFER");
  const [deliveryDateAuto, setDeliveryDateAuto] = useState(
    () => doc.docType === "PURCHASE_CONTRACT"
  );
  const [serviceDateInput, setServiceDateInput] = useState(() => {
    const service = toInputDate(doc.serviceDate);
    if (service) return service;
    if (doc.docType === "INVOICE") return toInputDate(doc.issueDate);
    return "";
  });
  const [dueDateInput, setDueDateInput] = useState(() => {
    const due = toInputDate(doc.dueDate);
    if (due) return due;
    if (doc.docType === "INVOICE") return addDaysToInputDate(toInputDate(doc.issueDate), 10);
    return "";
  });
  const [deliveryDateInput, setDeliveryDateInput] = useState(() => {
    const delivery = toInputDate(doc.deliveryDate);
    if (delivery) return delivery;
    if (doc.docType === "PURCHASE_CONTRACT") {
      return addDaysToInputDate(toInputDate(doc.issueDate), 7);
    }
    return "";
  });
  const [validUntilInput, setValidUntilInput] = useState(() => {
    const valid = toInputDate(doc.validUntil);
    if (valid) return valid;
    if (doc.docType === "OFFER") return addDaysToInputDate(toInputDate(doc.issueDate), 10);
    return "";
  });
  const isLocked =
    doc.status === "PAID" || doc.status === "CANCELLED" || (doc.docType === "INVOICE" && doc.isFinal);
  const docLabel =
    doc.docType === "INVOICE"
      ? "Rechnung"
      : doc.docType === "OFFER"
        ? doc.offerType === "ESTIMATE"
          ? "Kostenvoranschlag"
          : "Angebot"
        : doc.docType === "CREDIT_NOTE"
          ? "Gutschrift"
        : doc.docType === "STORNO"
            ? "Storno"
            : doc.docType === "PURCHASE_CONTRACT"
              ? "Auftrag"
              : "Dokument";

  const pdfUrl = useMemo(() => {
    // ts verhindert Cache
    return `/api/documents/${doc.id}/pdf?ts=${refreshKey}`;
  }, [doc.id, refreshKey]);

  useEffect(() => {
    // Reset when switching to another document
    const issue = toInputDate(doc.issueDate);
    const due = toInputDate(doc.dueDate);
    setIssueDateInput(issue);

    if (doc.docType === "INVOICE") {
      const autoDue = addDaysToInputDate(issue, 10);
      setDueDateInput(due || autoDue);
      setDueDateAuto(!due || due === autoDue);
      const service = toInputDate(doc.serviceDate);
      const autoService = issue;
      setServiceDateInput(service || autoService);
      setServiceDateAuto(!service || service === autoService);
      setValidUntilInput("");
      setValidUntilAuto(false);
      setDeliveryDateInput("");
      setDeliveryDateAuto(false);
    } else if (doc.docType === "OFFER") {
      const valid = toInputDate(doc.validUntil);
      const autoValid = addDaysToInputDate(issue, 10);
      setValidUntilInput(valid || autoValid);
      setValidUntilAuto(!valid || valid === autoValid);
      setDueDateInput("");
      setDueDateAuto(false);
      setServiceDateInput("");
      setServiceDateAuto(false);
      setDeliveryDateInput("");
      setDeliveryDateAuto(false);
    } else if (doc.docType === "PURCHASE_CONTRACT") {
      const delivery = toInputDate(doc.deliveryDate);
      const autoDelivery = addDaysToInputDate(issue, 7);
      setDeliveryDateInput(delivery || autoDelivery);
      setDeliveryDateAuto(!delivery || delivery === autoDelivery);
      setDueDateInput("");
      setDueDateAuto(false);
      setServiceDateInput("");
      setServiceDateAuto(false);
      setValidUntilInput("");
      setValidUntilAuto(false);
    } else {
      setDueDateInput(due);
      setDueDateAuto(false);
      setServiceDateInput("");
      setServiceDateAuto(false);
      setValidUntilInput("");
      setValidUntilAuto(false);
      setDeliveryDateInput("");
      setDeliveryDateAuto(false);
    }
  }, [doc.id]);

  useEffect(() => {
    setPaidAtInput(toInputDate(doc.paidAt ?? new Date()));
  }, [doc.paidAt]);

  useEffect(() => {
    // Step 5 gibt es nur bei bezahlten Rechnungen.
    if (step !== 5) return;
    if (doc.docType === "INVOICE" && doc.status === "PAID") return;
    setStep(4);
  }, [step, doc.docType, doc.status]);

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
    if (isLocked) return;
    const notesPublic = String(formData.get("notesPublic") ?? "").trim() || null;
    const notesInternal = String(formData.get("notesInternal") ?? "").trim() || null;
    const issueDateRaw = String(formData.get("issueDate") ?? "").trim();
    const serviceDateRaw = String(formData.get("serviceDate") ?? "").trim();
    const dueDateRaw = String(formData.get("dueDate") ?? "").trim();
    const deliveryDateRaw = String(formData.get("deliveryDate") ?? "").trim();
    const validUntilRaw = String(formData.get("validUntil") ?? "").trim();
    const offerTypeRaw = String(formData.get("offerType") ?? "").trim();

    const issueDate = issueDateRaw ? new Date(issueDateRaw) : undefined;
    const serviceDate = serviceDateRaw ? new Date(serviceDateRaw) : null;
    const dueDate = dueDateRaw ? new Date(dueDateRaw) : null;
    const deliveryDate = deliveryDateRaw ? new Date(deliveryDateRaw) : null;
    const validUntil = validUntilRaw ? new Date(validUntilRaw) : null;
    const offerType =
      offerTypeRaw === "ESTIMATE" || offerTypeRaw === "OFFER" ? offerTypeRaw : undefined;

    startTransition(async () => {
      await updateDocumentBasics({
        id: doc.id,
        notesPublic,
        notesInternal,
        issueDate,
        serviceDate: doc.docType === "INVOICE" ? serviceDate : undefined,
        dueDate: doc.docType === "INVOICE" ? dueDate : undefined,
        deliveryDate: doc.docType === "PURCHASE_CONTRACT" ? deliveryDate : undefined,
        validUntil: doc.docType === "OFFER" ? validUntil : undefined,
        offerType: doc.docType === "OFFER" ? offerType : undefined,
      });

      // PDF Preview aktualisieren
      setRefreshKey((k) => k + 1);

      // Doc neu vom Server holen (falls du oben Werte direkt sehen willst)
      router.refresh();
    });
  }

  function toggleFinal() {
    if (isLocked) return;
    startTransition(async () => {
      await toggleFinalizeDocument(doc.id);

      // PDF Preview aktualisieren
      setRefreshKey((k) => k + 1);

      // Doc neu laden (isFinal/docNumber aktualisieren)
      router.refresh();
    });
  }

  function finalizeNow() {
    if (isLocked || doc.isFinal) return;
    startTransition(async () => {
      await finalizeDocument(doc.id);
      setRefreshKey((k) => k + 1);
      router.refresh();
      router.push(`/documents/${doc.id}/view`);
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

  function createStorno() {
    if (!confirm("Storno-Beleg erstellen und Originalrechnung stornieren?")) return;

    startTransition(async () => {
      const stornoId = await createStornoFromInvoice({
        invoiceId: doc.id,
      });
      router.push(`/documents/${stornoId}/edit`);
    });
  }

  function deleteThisDocument() {
    if (isLocked) return;
    if (!confirm(`${docLabel} wirklich löschen?`)) return;
    startTransition(async () => {
      await deleteDocument(doc.id);
      router.push(
        doc.docType === "INVOICE"
          ? "/invoices"
          : doc.docType === "OFFER"
            ? "/offers"
            : doc.docType === "PURCHASE_CONTRACT"
              ? "/orders"
            : doc.docType === "CREDIT_NOTE"
              ? "/credit-notes"
              : doc.docType === "STORNO"
                ? "/stornos"
                : "/dashboard"
      );
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
  const [lineIsMarginScheme, setLineIsMarginScheme] = useState(false);
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
    let cancelled = false;
    const t = setTimeout(async () => {
      const [services, stock] = await Promise.all([searchServices(q), searchStockVehicles(q)]);
      if (cancelled) return;
      const combined = [
        ...services.map((s: any) => ({ type: "service" as const, item: s })),
        ...stock.map((v: any) => ({ type: "stock" as const, item: v })),
      ];
      setItemResults(combined);
    }, 200);

    return () => {
      cancelled = true;
      clearTimeout(t);
    };
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
    setLineDiscount(0);
    const rateRaw = Number(service.vatRate ?? 19);
    const rate = rateRaw === 7 ? 7 : rateRaw === 0 ? 0 : 19;
    setLineVatRate(rate);
    const unitGross = rate === 0 ? unitPrice : unitPrice * (1 + rate / 100);
    setLinePrice(unitGross);
    setLineIsMarginScheme(false);
    setLineDescription(service.shortText ?? "");
  }

  function selectStockVehicle(vehicle: any) {
    setSelectedItem({ type: "stock", item: vehicle });
    setShowItemResults(false);
    setItemQuery(`Bestand: ${vehicle.make ?? "-"} ${vehicle.model ?? ""}`.trim());
    setLineQty(1);
    setLinePrice((Number(vehicle.purchaseCents ?? 0) || 0) / 100);
    setLineDiscount(0);
    // Fahrzeugbestand wird typischerweise differenzbesteuert verkauft (MwSt. nicht ausweisbar)
    setLineVatRate(0);
    setLineIsMarginScheme(true);
    setLineDescription(vehicle.vin ? `VIN: ${vehicle.vin}` : "");
  }

  function addPositionLine() {
    if (isLocked) return;
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
        isMarginScheme: lineIsMarginScheme,
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
      setLineIsMarginScheme(false);
      setSelectedItem(null);
      setShowItemResults(false);
    });
  }

  function removeLine(lineId: string) {
    if (isLocked) return;
    startTransition(async () => {
      await deleteDocumentLine(lineId);
      setRefreshKey((k) => k + 1);
      router.refresh();
      if (activeLineId === lineId) setActiveLineId(null);
    });
  }

  function moveLine(lineId: string, direction: "up" | "down") {
    if (isLocked) return;
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
        <div className="rounded-lg border border-slate-700 bg-slate-800/60 p-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="text-sm text-slate-400">Dokument</div>
              <div className="text-lg font-semibold">
                {doc.docType === "INVOICE"
                  ? "Rechnung"
                  : doc.docType === "OFFER"
                    ? doc.offerType === "ESTIMATE"
                      ? "Kostenvoranschlag"
                      : "Angebot"
                    : doc.docType === "CREDIT_NOTE"
                      ? "Gutschrift"
                    : doc.docType === "STORNO"
                      ? "Storno"
                      : "Auftrag"}{" "}
                — {formatDocLabel(doc)}
              </div>
            </div>

            {doc.docType === "INVOICE" ? (
              <div className="flex items-center gap-2 text-sm">
                {doc.isFinal ? (
                  <span className="rounded bg-cyan-700/20 px-3 py-1 text-cyan-300">
                    Final gespeichert
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={finalizeNow}
                    disabled={isPending}
                    className="rounded bg-cyan-700 px-3 py-2 text-sm font-semibold text-white hover:bg-cyan-600 disabled:opacity-50"
                  >
                    Rechnung final speichern
                  </button>
                )}
              </div>
            ) : (
              <label className="flex items-center gap-3 text-sm text-slate-300">
                <span>Entwurf</span>
                <span className="relative inline-flex h-6 w-11 items-center">
                  <input
                    type="checkbox"
                    className="peer sr-only"
                    checked={doc.isFinal}
                    onChange={() => toggleFinal()}
                    disabled={isPending || isLocked}
                  />
                  <span className="h-6 w-11 rounded-full bg-slate-700 transition peer-checked:bg-cyan-600 peer-disabled:opacity-50" />
                  <span className="absolute left-1 top-1 h-4 w-4 rounded-full bg-white transition peer-checked:translate-x-5" />
                </span>
                <span>Final</span>
              </label>
            )}
          </div>
        </div>

        {/* Schritt 1 */}
        <div className="rounded-lg border border-slate-700 bg-slate-800/60">
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
                    <label className="block text-sm text-slate-300">
                      {doc.docType === "OFFER"
                        ? doc.offerType === "ESTIMATE"
                          ? "Kostenvoranschlagsnummer"
                          : "Angebotsnummer"
                        : doc.docType === "PURCHASE_CONTRACT"
                          ? "Auftragsnummer"
                          : "Dokumentnummer"}
                    </label>
                    <input
                      value={formatDocNumber(doc)}
                      disabled
                      className="w-full rounded bg-slate-800 p-2 text-slate-300"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-slate-300">
                      {doc.docType === "INVOICE" ? "Rechnungsdatum" : "Erstelldatum"}
                    </label>
                    <input
                      type="date"
                      name="issueDate"
                      value={issueDateInput}
                      disabled={isLocked || isPending}
                      onChange={(e) => {
                        const value = e.target.value;
                        setIssueDateInput(value);
                        if (doc.docType === "INVOICE" && dueDateAuto) {
                          setDueDateInput(addDaysToInputDate(value, 10));
                        }
                        if (doc.docType === "INVOICE" && serviceDateAuto) {
                          setServiceDateInput(value);
                        }
                        if (doc.docType === "OFFER" && validUntilAuto) {
                          setValidUntilInput(addDaysToInputDate(value, 10));
                        }
                        if (doc.docType === "PURCHASE_CONTRACT" && deliveryDateAuto) {
                          setDeliveryDateInput(addDaysToInputDate(value, 7));
                        }
                      }}
                      className="w-full rounded bg-slate-800 p-2"
                    />
                  </div>
                  {doc.docType === "OFFER" ? (
                    <div>
                      <label className="block text-sm text-slate-300">Dokumenttyp</label>
                      <select
                        name="offerType"
                        defaultValue={doc.offerType ?? "OFFER"}
                        disabled={isLocked || isPending}
                        className="w-full rounded bg-slate-800 p-2 text-slate-200"
                      >
                        <option value="OFFER">Angebot</option>
                        <option value="ESTIMATE">Kostenvoranschlag</option>
                      </select>
                    </div>
                  ) : null}
                  {doc.docType === "OFFER" ? (
                    <div>
                      <label className="block text-sm text-slate-300">Gültig bis</label>
                      <input
                        type="date"
                        name="validUntil"
                        value={validUntilInput}
                        disabled={isLocked || isPending}
                        onChange={(e) => {
                          setValidUntilInput(e.target.value);
                          setValidUntilAuto(false);
                        }}
                        className="w-full rounded bg-slate-800 p-2"
                      />
                    </div>
                  ) : doc.docType === "PURCHASE_CONTRACT" ? (
                    <div>
                      <label className="block text-sm text-slate-300">Lieferdatum</label>
                      <input
                        type="date"
                        name="deliveryDate"
                        value={deliveryDateInput}
                        disabled={isLocked || isPending}
                        onChange={(e) => {
                          setDeliveryDateInput(e.target.value);
                          setDeliveryDateAuto(false);
                        }}
                        className="w-full rounded bg-slate-800 p-2"
                      />
                    </div>
                  ) : (
                    <div>
                      <label className="block text-sm text-slate-300">Fällig am</label>
                      <input
                        type="date"
                        name="dueDate"
                        value={dueDateInput}
                        disabled={isLocked || isPending}
                        onChange={(e) => {
                          setDueDateInput(e.target.value);
                          setDueDateAuto(false);
                        }}
                        className="w-full rounded bg-slate-800 p-2"
                      />
                    </div>
                  )}
                  {doc.docType === "INVOICE" ? (
                    <div>
                      <label className="block text-sm text-slate-300">Leistungsdatum</label>
                      <input
                        type="date"
                        name="serviceDate"
                        value={serviceDateInput}
                        disabled={isLocked || isPending}
                        onChange={(e) => {
                          setServiceDateInput(e.target.value);
                          setServiceDateAuto(false);
                        }}
                        className="w-full rounded bg-slate-800 p-2"
                      />
                    </div>
                  ) : null}
                </div>

                <div>
                  <label className="block text-sm text-slate-300">Kundennotiz</label>
                  <textarea
                    name="notesPublic"
                    defaultValue={doc.notesPublic ?? ""}
                    disabled={isLocked || isPending}
                    className="w-full rounded bg-slate-800 p-2"
                  />
                </div>

                <div>
                  <label className="block text-sm text-slate-300">Interne Notiz</label>
                  <textarea
                    name="notesInternal"
                    defaultValue={doc.notesInternal ?? ""}
                    disabled={isLocked || isPending}
                    className="w-full rounded bg-slate-800 p-2"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <button
                    type="submit"
                    disabled={isPending || isLocked}
                    className="rounded bg-slate-800 px-3 py-2 hover:bg-slate-700 disabled:opacity-50"
                  >
                    Speichern
                  </button>
                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    className="rounded bg-cyan-700 px-4 py-2 text-sm hover:bg-cyan-600"
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
          locked={isLocked}
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
        <div className="rounded-lg border border-slate-700 bg-slate-800/60">
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
              {isLocked && (
                <div className="rounded border border-amber-700/40 bg-amber-900/20 p-3 text-sm text-amber-200">
                  Diese Rechnung ist bezahlt oder storniert und kann nicht mehr bearbeitet werden.
                </div>
              )}
              <div className="rounded border border-slate-700 bg-slate-800 p-3">
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
                          disabled={isLocked || isPending}
                          className="w-full rounded bg-slate-900 p-2 text-sm"
                        />
                        <button
                          type="button"
                          className="rounded bg-cyan-600 px-3 py-2 text-sm text-white"
                          onClick={() => setShowItemResults((v) => !v)}
                          disabled={isLocked || isPending}
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
                                  disabled={isLocked || isPending}
                                  className="flex w-full items-start justify-between gap-2 border-b border-slate-800 p-3 text-left hover:bg-slate-800/70 disabled:opacity-50"
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
                                disabled={isLocked || isPending}
                                className="flex w-full items-start justify-between gap-2 border-b border-slate-800 p-3 text-left hover:bg-slate-800/70 disabled:opacity-50"
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
                        disabled={isLocked || isPending}
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
                          setLineIsMarginScheme(false);
                          setSelectedItem(null);
                          setShowItemResults(false);
                        }}
                        disabled={isLocked || isPending}
                        className="rounded bg-slate-800 px-4 py-2 text-sm hover:bg-slate-700"
                      >
                        Abbrechen
                      </button>
                      <button
                        type="button"
                        onClick={addPositionLine}
                        disabled={isLocked || isPending || (!itemQuery.trim() && !lineDescription.trim())}
                        className="rounded bg-cyan-700 px-4 py-2 text-sm disabled:opacity-50"
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
                          disabled={isLocked || isPending}
                          className="h-9 w-9 rounded bg-slate-800 text-lg hover:bg-slate-700"
                        >
                          -
                        </button>
                        <input
                          type="number"
                          value={lineQty}
                          min={1}
                          onChange={(e) => setLineQty(Number(e.target.value) || 1)}
                          disabled={isLocked || isPending}
                          className="w-20 rounded bg-slate-900 p-2 text-center text-sm"
                        />
                        <button
                          type="button"
                          onClick={() => setLineQty((q) => q + 1)}
                          disabled={isLocked || isPending}
                          className="h-9 w-9 rounded bg-slate-800 text-lg hover:bg-slate-700"
                        >
                          +
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs text-slate-300">Preis (brutto)</label>
                      <div className="flex items-center gap-2">
                        <span className="rounded bg-slate-800 px-2 py-2 text-sm text-slate-300">€</span>
                        <input
                          type="number"
                          step="0.01"
                          value={linePrice}
                          onChange={(e) => setLinePrice(Number(e.target.value) || 0)}
                          disabled={isLocked || isPending}
                          className="w-full rounded bg-slate-900 p-2 text-sm"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs text-slate-300">MwSt.</label>
                      <select
                        value={lineIsMarginScheme ? "MARGIN" : String(lineVatRate)}
                        onChange={(e) => {
                          const value = e.target.value;
                          if (value === "MARGIN") {
                            setLineVatRate(0);
                            setLineIsMarginScheme(true);
                            return;
                          }

                          const rate = Number(value);
                          setLineVatRate(rate === 7 ? 7 : rate === 0 ? 0 : 19);
                          setLineIsMarginScheme(false);
                        }}
                        disabled={isLocked || isPending}
                        className="w-full rounded bg-slate-900 p-2 text-sm"
                      >
                        <option value="19">19%</option>
                        <option value="7">7%</option>
                        <option value="0">0% (Weiterberechnung)</option>
                        <option value="MARGIN">Differenzbesteuert (§25a)</option>
                      </select>
                      {lineIsMarginScheme ? (
                        <div className="mt-1 text-[11px] text-slate-400">
                          Hinweis: Differenzbesteuerung gem. §25a UStG (kein gesonderter MwSt.-Ausweis).
                        </div>
                      ) : lineVatRate === 0 ? (
                        <div className="mt-1 text-[11px] text-slate-400">
                          Hinweis: 0% Weiterberechnung (z.B. TÜV-Gebühr) – keine MwSt.
                        </div>
                      ) : null}
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
                        disabled={isLocked || isPending}
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
                  <div className="rounded border border-slate-700 bg-slate-800 p-3 text-sm text-slate-300">
                    Keine Positionen hinzugefügt
                  </div>
                ) : (
                  <div className="space-y-2 rounded border border-slate-700 bg-slate-800 p-3">
                    {doc.lines.map((line: any, idx: number) => {
                      const qty = Number(line.quantity ?? 0);
                      const unitNet = Number(line.unitPrice ?? 0);
                      const vatRate = Number(line.vatRate ?? 19);
                      const isMarginScheme = Boolean(line.isMarginScheme);
                      const unitGross =
                        isMarginScheme || vatRate === 0 ? unitNet : unitNet * (1 + vatRate / 100);
                      const totalGross = Number(line.lineGross ?? qty * unitGross);
                      const taxLabel = isMarginScheme
                        ? "Differenz (§25a)"
                        : vatRate === 0
                          ? "0% (Weiterberechnung)"
                          : `${vatRate}%`;

                      return (
                        <div
                          key={line.id}
                          className={`flex w-full items-start justify-between gap-2 rounded p-2 text-left transition ${
                            activeLineId === line.id
                              ? "bg-slate-800 ring-1 ring-cyan-500"
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
                              {qty} x {unitGross.toFixed(2)} € = {totalGross.toFixed(2)} € • Steuer:{" "}
                              {taxLabel}
                            </div>
                          </button>

                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => moveLine(line.id, "up")}
                              disabled={isPending || isLocked || idx === 0}
                              className="rounded bg-slate-700 px-2 py-1 text-xs disabled:opacity-40"
                            >
                              ↑
                            </button>
                            <button
                              type="button"
                              onClick={() => moveLine(line.id, "down")}
                              disabled={isPending || isLocked || idx === doc.lines.length - 1}
                              className="rounded bg-slate-700 px-2 py-1 text-xs disabled:opacity-40"
                            >
                              ↓
                            </button>
                            <button
                              type="button"
                              onClick={() => removeLine(line.id)}
                              disabled={isPending || isLocked}
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
                  className="rounded bg-cyan-700 px-4 py-2 text-sm hover:bg-cyan-600"
                >
                  Weiter
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="rounded-lg border border-slate-700 bg-slate-800/60">
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
                <div className="rounded border border-slate-700 bg-slate-800 p-3">
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

                    {!isLocked && (
                      <button
                        onClick={deleteThisDocument}
                        disabled={isPending}
                        className="rounded bg-rose-700 px-3 py-2 text-sm disabled:opacity-50"
                        type="button"
                      >
                        {docLabel} löschen
                      </button>
                    )}
                  </div>
                </div>

                {doc.docType === "INVOICE" && (
                  <div className="rounded border border-slate-700 bg-slate-800 p-3">
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
            </div>
          )}
        </div>

        {doc.docType === "INVOICE" && doc.status === "PAID" && (
          <div className="rounded-lg border border-slate-700 bg-slate-800/60">
            <button
              type="button"
              onClick={() => setStep(5)}
              className="flex w-full items-center justify-between border-b border-slate-800 px-4 py-3 text-left text-sm font-semibold text-slate-200 hover:bg-slate-900/60"
            >
              <span>Storno &amp; Gutschriften</span>
              <span className="text-xs text-slate-400">Nur bei bezahlten Rechnungen</span>
            </button>

            {step === 5 && (
              <div className="p-4 space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="rounded border border-slate-700 bg-slate-800 p-3">
                    <div className="text-sm font-semibold text-slate-300">Storno‑Beleg</div>
                    <div className="mt-1 text-xs text-slate-500">
                      Storno bedeutet: komplette Rechnung. Erstellt einen Storno‑Beleg (PDF) und
                      storniert die Originalrechnung.
                    </div>
                    <button
                      onClick={createStorno}
                      disabled={isPending || (doc.lines ?? []).length === 0}
                      className="mt-3 rounded bg-rose-700 px-3 py-2 text-sm disabled:opacity-50"
                      type="button"
                    >
                      Storno‑Beleg erstellen
                    </button>
                  </div>

                  <div className="rounded border border-slate-700 bg-slate-800 p-3">
                    <div className="text-sm font-semibold text-slate-300">Gutschrift (Teil‑)</div>
                    <div className="mt-1 text-xs text-slate-500">
                      Wähle einzelne Positionen (und Menge) für eine Gutschrift.
                    </div>

                    <div className="mt-3 max-h-56 space-y-2 overflow-auto rounded border border-slate-800 p-2">
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
                                disabled={isPending}
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
                              disabled={isPending}
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
                        Object.values(creditSelection).filter((v) => v.selected && v.qty > 0).length ===
                          0
                      }
                      className="mt-3 rounded bg-slate-800 px-3 py-2 text-sm hover:bg-slate-700 disabled:opacity-50"
                      type="button"
                    >
                      Gutschrift erstellen
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setStep(4)}
                    className="rounded bg-slate-800 px-3 py-2 text-sm hover:bg-slate-700"
                  >
                    Zurück
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* RECHTS: PDF Vorschau */}
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
  locked,
  onChanged,
  active,
  onOpen,
  onNext,
  onPrev,
}: {
  documentId: string;
  currentCustomer: any;
  currentVehicle: any;
  locked: boolean;
  onChanged: () => void;
  active: boolean;
  onOpen: () => void;
  onNext: () => void;
  onPrev: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const disabled = locked || isPending;

  // Kunde
  const [customerQuery, setCustomerQuery] = useState("");
  const [customerResults, setCustomerResults] = useState<any[]>([]);
  const [showCustomerResults, setShowCustomerResults] = useState(false);
  const [showCustomerCreate, setShowCustomerCreate] = useState(false);
  const [customerIsBusiness, setCustomerIsBusiness] = useState(false);

  // Fahrzeug
  const [vehicleQuery, setVehicleQuery] = useState("");
  const [vehicleResults, setVehicleResults] = useState<any[]>([]);
  const [showVehicleResults, setShowVehicleResults] = useState(false);
  const [showVehicleCreate, setShowVehicleCreate] = useState(false);

  // Kunden suchen (debounced light)
  useEffect(() => {
    if (!showCustomerResults) return;

    let cancelled = false;
    const t = setTimeout(async () => {
      const res = await searchCustomers(customerQuery.trim());
      if (cancelled) return;
      setCustomerResults(res);
    }, 200);

    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [customerQuery, showCustomerResults]);

  // Wenn ein Kunde gewählt ist: Name im Suchfeld anzeigen
  useEffect(() => {
    if (!currentCustomer) {
      setCustomerQuery("");
      return;
    }

    const label =
      currentCustomer.name || (currentCustomer.isBusiness ? "Gewerbekunde" : "Ohne Name");
    setCustomerQuery(label);
  }, [currentCustomer?.id]);

  // Fahrzeuge suchen
  useEffect(() => {
    if (!showVehicleResults) return;
    if (!currentCustomer) return;

    let cancelled = false;
    const t = setTimeout(async () => {
      const res = await searchVehicles(vehicleQuery.trim(), currentCustomer?.id ?? null);
      if (cancelled) return;
      setVehicleResults(res);
    }, 200);

    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [vehicleQuery, currentCustomer?.id, showVehicleResults]);

  // Wenn ein Fahrzeug gewählt ist: Anzeige im Suchfeld
  useEffect(() => {
    if (!currentVehicle) {
      setVehicleQuery("");
      return;
    }

    const makeModel = `${currentVehicle.make ?? ""} ${currentVehicle.model ?? ""}`.trim();
    const label = makeModel || (currentVehicle.vin ? `VIN: ${currentVehicle.vin}` : "Fahrzeug");
    setVehicleQuery(label);
  }, [currentVehicle?.id]);

  function pickCustomer(id: string) {
    if (locked) return;
    setShowCustomerResults(false);
    startTransition(async () => {
      await setDocumentCustomer(documentId, id);
      onChanged();
    });
  }

  function clearCustomer() {
    if (locked) return;
    setShowCustomerResults(false);
    setCustomerQuery("");
    startTransition(async () => {
      await setDocumentCustomer(documentId, null);
      onChanged();
    });
  }

  function pickVehicle(id: string) {
    if (locked) return;
    setShowVehicleResults(false);
    startTransition(async () => {
      await setDocumentVehicle(documentId, id);
      onChanged();
    });
  }

  function clearVehicle() {
    if (locked) return;
    setShowVehicleResults(false);
    setVehicleQuery("");
    startTransition(async () => {
      await setDocumentVehicle(documentId, null);
      onChanged();
    });
  }

  async function submitNewCustomer(formData: FormData) {
    if (locked) return;
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
    if (locked) return;
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
    <div className="rounded-lg border border-slate-700 bg-slate-800/60">
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
          {locked && (
            <div className="rounded border border-amber-700/40 bg-amber-900/20 p-3 text-sm text-amber-200">
              Diese Rechnung ist bezahlt oder storniert und kann nicht mehr bearbeitet werden.
            </div>
          )}
          <div className="grid grid-cols-[1fr_auto_1fr] items-start gap-4">
            <div>
              <div className="mb-2 text-sm text-slate-300">Suche nach Kunden</div>
              <div className="flex gap-2">
                <input
                  value={customerQuery}
                  onChange={(e) => {
                    setCustomerQuery(e.target.value);
                    setShowCustomerResults(true);
                  }}
                  placeholder="Suche"
                  disabled={disabled}
                  className="w-full rounded bg-slate-800 p-2"
                />
                <button
                  type="button"
                  className="rounded bg-cyan-600 px-3 py-2 text-sm text-white"
                  onClick={() => setShowCustomerResults((v) => !v)}
                  disabled={disabled}
                >
                  ≡
                </button>
              </div>

              <div
                className={`mt-2 max-h-40 overflow-auto rounded border border-slate-800 bg-slate-900 ${
                  showCustomerResults ? "" : "hidden"
                }`}
              >
                {customerResults.length === 0 ? (
                  <div className="p-3 text-sm text-slate-500">
                    {customerQuery.trim() ? "Keine Treffer" : "Vorschläge werden geladen…"}
                  </div>
                ) : (
                  customerResults.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => pickCustomer(c.id)}
                      disabled={disabled}
                      className="flex w-full items-start justify-between gap-2 border-b border-slate-800 p-3 text-left hover:bg-slate-900 disabled:opacity-50"
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
                  disabled={disabled}
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
                    disabled={disabled}
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
                    disabled={disabled}
                  />
                  <span className="h-6 w-11 rounded-full bg-slate-700 transition peer-checked:bg-cyan-600" />
                  <span className="absolute left-1 top-1 h-4 w-4 rounded-full bg-white transition peer-checked:translate-x-5" />
                </span>
              </label>

              <input
                name="name"
                placeholder={customerIsBusiness ? "Firma (optional)" : "Name *"}
                disabled={disabled}
                className="col-span-2 rounded bg-slate-900 p-2"
                required={!customerIsBusiness}
              />
              <input
                name="street"
                placeholder="Straße"
                disabled={disabled}
                className="col-span-2 rounded bg-slate-900 p-2"
              />
              <input name="zip" placeholder="PLZ" disabled={disabled} className="rounded bg-slate-900 p-2" />
              <input name="city" placeholder="Ort" disabled={disabled} className="rounded bg-slate-900 p-2" />
              <input
                name="email"
                placeholder="E-Mail"
                disabled={disabled}
                className="rounded bg-slate-900 p-2"
              />
              <input
                name="phone"
                placeholder="Telefon"
                disabled={disabled}
                className="rounded bg-slate-900 p-2"
              />
              <input
                name="vatId"
                placeholder="USt-IdNr."
                disabled={disabled}
                className="col-span-2 rounded bg-slate-900 p-2"
              />

              <button
                className="col-span-2 rounded bg-cyan-700 px-3 py-2 disabled:opacity-50"
                disabled={disabled}
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
                  onChange={(e) => {
                    setVehicleQuery(e.target.value);
                    setShowVehicleResults(true);
                  }}
                  placeholder="Suche"
                  className="w-full rounded bg-slate-800 p-2"
                  disabled={disabled || !currentCustomer}
                />
                <button
                  type="button"
                  className="rounded bg-cyan-600 px-3 py-2 text-sm text-white"
                  disabled={disabled || !currentCustomer}
                  onClick={() => setShowVehicleResults((v) => !v)}
                >
                  ≡
                </button>
              </div>

              <div
                className={`mt-2 max-h-40 overflow-auto rounded border border-slate-800 bg-slate-900 ${
                  showVehicleResults ? "" : "hidden"
                }`}
              >
                {!currentCustomer ? (
                  <div className="p-3 text-sm text-slate-500">Bitte zuerst Kunden auswählen</div>
                ) : vehicleResults.length === 0 ? (
                  <div className="p-3 text-sm text-slate-500">
                    {vehicleQuery.trim() ? "Keine Treffer" : "Vorschläge werden geladen…"}
                  </div>
                ) : (
                  vehicleResults.map((v) => (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => pickVehicle(v.id)}
                      disabled={disabled}
                      className="flex w-full items-start justify-between gap-2 border-b border-slate-800 p-3 text-left hover:bg-slate-900 disabled:opacity-50"
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
                  disabled={disabled}
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
                disabled={disabled || !currentCustomer}
                className="rounded bg-slate-800 px-3 py-2 text-sm hover:bg-slate-700 disabled:opacity-50"
              >
                {showVehicleCreate ? "Schließen" : "Neues Fahrzeug anlegen"}
              </button>
            </div>
          </div>

          {showVehicleCreate && currentCustomer && (
            <form action={submitNewVehicle} className="grid grid-cols-2 gap-2">
              <input name="make" placeholder="Marke" disabled={disabled} className="rounded bg-slate-900 p-2" />
              <input name="model" placeholder="Modell" disabled={disabled} className="rounded bg-slate-900 p-2" />
              <input
                name="vin"
                placeholder="VIN"
                disabled={disabled}
                className="col-span-2 rounded bg-slate-900 p-2"
              />
              <input name="year" placeholder="Baujahr" disabled={disabled} className="rounded bg-slate-900 p-2" />
              <input name="mileage" placeholder="KM" disabled={disabled} className="rounded bg-slate-900 p-2" />

              <button
                className="col-span-2 rounded bg-cyan-700 px-3 py-2 disabled:opacity-50"
                disabled={disabled}
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
              className="rounded bg-cyan-700 px-4 py-2 text-sm hover:bg-cyan-600"
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

