"use client";

import { useEffect, useState } from "react";
import { searchVehicles } from "@/app/documents/serverActions";

type VehicleSuggestion = {
  id: string;
  make: string | null;
  model: string | null;
  vin: string | null;
  year: number | null;
  mileage: number | null;
};

function getVehicleLabel(vehicle: VehicleSuggestion): string {
  const makeModel = `${String(vehicle.make ?? "").trim()} ${String(vehicle.model ?? "").trim()}`.trim();
  if (makeModel && vehicle.vin) return `${makeModel} (${vehicle.vin})`;
  return makeModel || vehicle.vin || "Fahrzeug";
}

export default function VehicleSearchField() {
  const [vehicleQuery, setVehicleQuery] = useState("");
  const [vehicleResults, setVehicleResults] = useState<VehicleSuggestion[]>([]);
  const [showVehicleResults, setShowVehicleResults] = useState(false);
  const [selectedVehicleId, setSelectedVehicleId] = useState("");
  const [selectedVehicleLabel, setSelectedVehicleLabel] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!showVehicleResults) return;

    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        setLoading(true);
        const results = await searchVehicles(vehicleQuery.trim());
        if (cancelled) return;
        setVehicleResults(results as VehicleSuggestion[]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 180);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [vehicleQuery, showVehicleResults]);

  function handleQueryChange(value: string) {
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
    setSelectedVehicleId("");
    setSelectedVehicleLabel("");
    setVehicleQuery("");
    setShowVehicleResults(false);
  }

  return (
    <div className="space-y-2">
      <input type="hidden" name="vehicleId" value={selectedVehicleId} />
      <label className="mb-1 block text-sm text-slate-300">Fahrzeug suchen</label>
      <div className="flex gap-2">
        <input
          value={vehicleQuery}
          onChange={(event) => handleQueryChange(event.target.value)}
          onFocus={() => setShowVehicleResults(true)}
          placeholder="Suche Fahrzeug"
          className="w-full rounded border border-slate-700 bg-slate-800 p-2"
        />
        <button
          type="button"
          className="rounded bg-cyan-600 px-3 py-2 text-sm text-white hover:bg-cyan-500"
          onClick={() => setShowVehicleResults((value) => !value)}
          aria-label="Fahrzeugliste ein- oder ausklappen"
        >
          \u2261
        </button>
      </div>

      <div
        className={`max-h-40 overflow-auto rounded border border-slate-700 bg-slate-900 ${
          showVehicleResults ? "" : "hidden"
        }`}
      >
        {loading ? (
          <div className="p-3 text-sm text-slate-500">{"Suche l\u00e4uft..."}</div>
        ) : vehicleResults.length === 0 ? (
          <div className="p-3 text-sm text-slate-500">
            {vehicleQuery.trim() ? "Keine Treffer" : "Vorschl\u00e4ge werden geladen..."}
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
                    VIN: {vehicle.vin ?? "-"} | Jahr: {vehicle.year ?? "-"} | KM: {vehicle.mileage ?? "-"}
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
      ) : null}
    </div>
  );
}
