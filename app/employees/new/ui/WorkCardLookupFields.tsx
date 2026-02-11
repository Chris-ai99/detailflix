"use client";

import { useEffect, useState } from "react";
import { searchCustomers, searchVehicles } from "@/app/documents/serverActions";

type CustomerSuggestion = {
  id: string;
  name: string | null;
  companyName: string | null;
  contactFirstName: string | null;
  contactLastName: string | null;
  isBusiness: boolean;
  email: string | null;
  phone: string | null;
  city: string | null;
};

type VehicleSuggestion = {
  id: string;
  make: string | null;
  model: string | null;
  vin: string | null;
  year: number | null;
  mileage: number | null;
  customerId: string | null;
  customerDisplayName: string | null;
};

function getCustomerLabel(customer: CustomerSuggestion): string {
  const byName = String(customer.name ?? "").trim();
  if (byName) return byName;

  const company = String(customer.companyName ?? "").trim();
  if (company) return company;

  const contact = `${String(customer.contactFirstName ?? "").trim()} ${String(
    customer.contactLastName ?? ""
  ).trim()}`.trim();
  if (contact) return contact;

  return customer.isBusiness ? "Gewerbekunde" : "Privatkunde";
}

function getVehicleLabel(vehicle: VehicleSuggestion): string {
  const makeModel = `${String(vehicle.make ?? "").trim()} ${String(vehicle.model ?? "").trim()}`.trim();
  const vin = String(vehicle.vin ?? "").trim();
  if (makeModel && vin) return `${makeModel} (${vin})`;
  return makeModel || vin || "Fahrzeug";
}

function getVehicleCustomerLabel(vehicle: VehicleSuggestion): string {
  const display = String(vehicle.customerDisplayName ?? "").trim();
  if (display) return display;
  return "Kein Kunde zugeordnet";
}

export default function WorkCardLookupFields() {
  const [customerQuery, setCustomerQuery] = useState("");
  const [customerResults, setCustomerResults] = useState<CustomerSuggestion[]>([]);
  const [showCustomerResults, setShowCustomerResults] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [selectedCustomerLabel, setSelectedCustomerLabel] = useState("");
  const [loadingCustomers, setLoadingCustomers] = useState(false);

  const [vehicleQuery, setVehicleQuery] = useState("");
  const [vehicleResults, setVehicleResults] = useState<VehicleSuggestion[]>([]);
  const [showVehicleResults, setShowVehicleResults] = useState(false);
  const [selectedVehicleId, setSelectedVehicleId] = useState("");
  const [selectedVehicleLabel, setSelectedVehicleLabel] = useState("");
  const [loadingVehicles, setLoadingVehicles] = useState(false);
  const [vehicleEntryMode, setVehicleEntryMode] = useState<"search" | "manual">("search");
  const [manualVehicleMake, setManualVehicleMake] = useState("");
  const [manualVehicleModel, setManualVehicleModel] = useState("");
  const [manualLicensePlate, setManualLicensePlate] = useState("");

  useEffect(() => {
    if (!showCustomerResults) return;

    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        setLoadingCustomers(true);
        const results = await searchCustomers(customerQuery.trim());
        if (cancelled) return;
        setCustomerResults(results as CustomerSuggestion[]);
      } finally {
        if (!cancelled) setLoadingCustomers(false);
      }
    }, 180);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [customerQuery, showCustomerResults]);

  useEffect(() => {
    if (!showVehicleResults || vehicleEntryMode !== "search") return;

    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        setLoadingVehicles(true);
        const customerFilter = selectedCustomerId.trim() || null;
        const results = await searchVehicles(vehicleQuery.trim(), customerFilter, {
          requireCustomerLink: true,
        });
        if (cancelled) return;
        setVehicleResults(results as VehicleSuggestion[]);
      } finally {
        if (!cancelled) setLoadingVehicles(false);
      }
    }, 180);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [vehicleQuery, selectedCustomerId, showVehicleResults, vehicleEntryMode]);

  function clearSelectedVehicleOnly() {
    setSelectedVehicleId("");
    setSelectedVehicleLabel("");
    setVehicleQuery("");
    setVehicleResults([]);
    setShowVehicleResults(false);
  }

  function handleCustomerQueryChange(value: string) {
    setCustomerQuery(value);
    setShowCustomerResults(true);

    const normalizedValue = value.trim();
    const normalizedSelected = selectedCustomerLabel.trim();
    if (selectedCustomerId && normalizedValue !== normalizedSelected) {
      setSelectedCustomerId("");
      setSelectedCustomerLabel("");
    }
  }

  function pickCustomer(customer: CustomerSuggestion) {
    const label = getCustomerLabel(customer);
    const nextCustomerId = customer.id;

    if (selectedVehicleId && nextCustomerId !== selectedCustomerId) {
      clearSelectedVehicleOnly();
    }

    setSelectedCustomerId(nextCustomerId);
    setSelectedCustomerLabel(label);
    setCustomerQuery(label);
    setShowCustomerResults(false);
  }

  function clearCustomer() {
    setSelectedCustomerId("");
    setSelectedCustomerLabel("");
    setCustomerQuery("");
    setShowCustomerResults(false);
  }

  function handleVehicleQueryChange(value: string) {
    setVehicleQuery(value);
    setShowVehicleResults(true);

    const normalizedValue = value.trim();
    const normalizedSelected = selectedVehicleLabel.trim();
    if (selectedVehicleId && normalizedValue !== normalizedSelected) {
      setSelectedVehicleId("");
      setSelectedVehicleLabel("");
    }
  }

  function pickVehicle(vehicle: VehicleSuggestion) {
    const label = getVehicleLabel(vehicle);
    setSelectedVehicleId(vehicle.id);
    setSelectedVehicleLabel(label);
    setVehicleQuery(label);
    setShowVehicleResults(false);
  }

  function clearVehicle() {
    clearSelectedVehicleOnly();
  }

  function switchToManualVehicleEntry() {
    clearSelectedVehicleOnly();
    setVehicleEntryMode("manual");
  }

  function switchToVehicleSearch() {
    setVehicleEntryMode("search");
  }

  const hasCustomerInput = Boolean(selectedCustomerId || customerQuery.trim());
  const requiresLicensePlate = !hasCustomerInput;

  return (
    <div className="space-y-4">
      <input type="hidden" name="customerId" value={selectedCustomerId} />
      <input type="hidden" name="vehicleId" value={selectedVehicleId} />
      <input type="hidden" name="vehicleCreationMode" value={vehicleEntryMode} />

      <div className="space-y-2">
        <label className="mb-1 block text-sm text-slate-300">Kunde (optional)</label>
        <div className="flex gap-2">
          <input
            name="customerName"
            value={customerQuery}
            onChange={(event) => handleCustomerQueryChange(event.target.value)}
            onFocus={() => setShowCustomerResults(true)}
            placeholder="Suche oder Freitext"
            className="w-full rounded border border-slate-700 bg-slate-800 p-2"
          />
          <button
            type="button"
            className="rounded border border-cyan-500/60 bg-cyan-500/10 px-3 py-2 text-sm text-cyan-100 hover:bg-cyan-500/20"
            onClick={() => setShowCustomerResults((value) => !value)}
            aria-label={"Kundenliste ein- oder ausklappen"}
          >
            v
          </button>
        </div>

        <div
          className={`max-h-40 overflow-auto rounded border border-slate-700 bg-slate-900 ${
            showCustomerResults ? "" : "hidden"
          }`}
        >
          {loadingCustomers ? (
            <div className="p-3 text-sm text-slate-500">{"Suche laeuft..."}</div>
          ) : customerResults.length === 0 ? (
            <div className="p-3 text-sm text-slate-500">
              {customerQuery.trim() ? "Keine Treffer" : "Vorschlaege werden geladen..."}
            </div>
          ) : (
            customerResults.map((customer) => {
              const label = getCustomerLabel(customer);
              return (
                <button
                  key={customer.id}
                  type="button"
                  onClick={() => pickCustomer(customer)}
                  className="flex w-full items-start justify-between gap-2 border-b border-slate-800 p-3 text-left hover:bg-slate-800/60"
                >
                  <div>
                    <div className="font-semibold text-slate-100">{label}</div>
                    <div className="text-xs text-slate-400">
                      {customer.city ?? ""}
                      {customer.email ? ` | ${customer.email}` : ""}
                      {customer.phone ? ` | ${customer.phone}` : ""}
                    </div>
                  </div>
                  <div className="text-xs text-slate-500">{customer.id.slice(0, 6)}...</div>
                </button>
              );
            })
          )}
        </div>

        {selectedCustomerId ? (
          <button
            type="button"
            onClick={clearCustomer}
            className="rounded bg-rose-700 px-3 py-1 text-xs text-white hover:bg-rose-600"
          >
            Kunde entfernen
          </button>
        ) : null}
      </div>

      {vehicleEntryMode === "search" ? (
        <div className="space-y-2">
          <label className="mb-1 block text-sm text-slate-300">
            Fahrzeug suchen
            <span className="ml-2 text-xs text-slate-500">
              {selectedCustomerId
                ? "(nur Fahrzeuge vom gewaehlten Kunden)"
                : "(globale Suche nach Marke, Modell oder Kennzeichen)"}
            </span>
          </label>
          {!hasCustomerInput ? (
            <div className="text-xs text-amber-200">
              Hinweis: Ohne Kundenangabe ist Kennzeichen/VIN Pflicht.
            </div>
          ) : null}
          <div className="flex gap-2">
            <input
              value={vehicleQuery}
              onChange={(event) => handleVehicleQueryChange(event.target.value)}
              onFocus={() => setShowVehicleResults(true)}
              placeholder="Fahrzeug suchen"
              className="w-full rounded border border-slate-700 bg-slate-800 p-2"
            />
            <button
              type="button"
              className="rounded border border-cyan-500/60 bg-cyan-500/10 px-3 py-2 text-sm text-cyan-100 hover:bg-cyan-500/20"
              onClick={() => setShowVehicleResults((value) => !value)}
              aria-label={"Fahrzeugliste ein- oder ausklappen"}
            >
              v
            </button>
          </div>

          <div
            className={`max-h-40 overflow-auto rounded border border-slate-700 bg-slate-900 ${
              showVehicleResults ? "" : "hidden"
            }`}
          >
            {loadingVehicles ? (
              <div className="p-3 text-sm text-slate-500">{"Suche laeuft..."}</div>
            ) : vehicleResults.length === 0 ? (
              <div className="p-3 text-sm text-slate-500">
                {vehicleQuery.trim() ? "Keine Treffer" : "Vorschlaege werden geladen..."}
              </div>
            ) : (
              vehicleResults.map((vehicle) => (
                <button
                  key={vehicle.id}
                  type="button"
                  onClick={() => pickVehicle(vehicle)}
                  className="flex w-full items-start justify-between gap-2 border-b border-slate-800 p-3 text-left hover:bg-slate-800/60"
                >
                  <div>
                    <div className="font-semibold text-slate-100">{getVehicleLabel(vehicle)}</div>
                    <div className="text-xs text-slate-400">
                      VIN: {vehicle.vin ?? "-"} | Jahr: {vehicle.year ?? "-"} | KM:{" "}
                      {vehicle.mileage ?? "-"}
                    </div>
                    <div className="text-xs text-amber-200">
                      Kunde: {getVehicleCustomerLabel(vehicle)}
                    </div>
                  </div>
                  <div className="text-xs text-slate-500">{vehicle.id.slice(0, 6)}...</div>
                </button>
              ))
            )}
          </div>

          {selectedVehicleId ? (
            <button
              type="button"
              onClick={clearVehicle}
              className="rounded bg-rose-700 px-3 py-1 text-xs text-white hover:bg-rose-600"
            >
              Fahrzeug entfernen
            </button>
          ) : (
            <div className="space-y-1">
              <button
                type="button"
                onClick={switchToManualVehicleEntry}
                disabled={loadingVehicles}
                className="rounded border border-amber-500/60 bg-amber-500/10 px-3 py-1.5 text-xs text-amber-100 hover:bg-amber-500/20 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loadingVehicles
                  ? "Suche laeuft..."
                  : vehicleQuery.trim()
                    ? vehicleResults.length === 0
                      ? "Kein Treffer? Fahrzeug anlegen"
                      : "Fahrzeug trotzdem neu anlegen"
                    : "Fahrzeug direkt anlegen"}
              </button>
              <div className="text-xs text-slate-500">
                Suche ist optional. Du kannst das Fahrzeug auch sofort neu anlegen.
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-3 rounded border border-slate-700 bg-slate-900/40 p-3">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-semibold text-slate-100">Neues Fahrzeug anlegen</h3>
              <p className="text-xs text-slate-400">
                Mindestens ein Feld ausfuellen (Kennzeichen/VIN, Marke oder Modell).
              </p>
            </div>
            <button
              type="button"
              onClick={switchToVehicleSearch}
              className="rounded border border-slate-600 bg-slate-800 px-2 py-1 text-xs text-slate-200 hover:bg-slate-700"
            >
              Zur Suche
            </button>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <label className="text-sm text-slate-300">
              {requiresLicensePlate ? "Kennzeichen / VIN *" : "Kennzeichen / VIN"}
              <input
                name="licensePlate"
                value={manualLicensePlate}
                onChange={(event) => setManualLicensePlate(event.target.value)}
                required={requiresLicensePlate}
                className="mt-1 w-full rounded border border-slate-700 bg-slate-800 p-2"
              />
            </label>
            <label className="text-sm text-slate-300">
              Marke
              <input
                name="vehicleMake"
                value={manualVehicleMake}
                onChange={(event) => setManualVehicleMake(event.target.value)}
                className="mt-1 w-full rounded border border-slate-700 bg-slate-800 p-2"
              />
            </label>
            <label className="text-sm text-slate-300 md:col-span-2">
              Modell
              <input
                name="vehicleModel"
                value={manualVehicleModel}
                onChange={(event) => setManualVehicleModel(event.target.value)}
                className="mt-1 w-full rounded border border-slate-700 bg-slate-800 p-2"
              />
            </label>
          </div>
        </div>
      )}
    </div>
  );
}
