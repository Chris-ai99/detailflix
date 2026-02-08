// app/vehicles/new/page.tsx
import Link from "next/link";
import { createVehicle } from "./serverActions";

export default function NewVehiclePage() {
  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Neues Fahrzeug</h1>
        <Link className="rounded px-3 py-2 hover:bg-slate-700/60" href="/vehicles">
          Zurück
        </Link>
      </div>

      <form
        action={createVehicle}
        className="space-y-4 rounded-lg border border-slate-700 bg-slate-800/60 p-6"
      >
        <div className="grid grid-cols-2 gap-4">
          <Field label="VIN" name="vin" />
          <Field label="Baujahr" name="year" type="number" />
          <Field label="Marke" name="make" />
          <Field label="Modell" name="model" />
          <Field label="Kilometerstand" name="mileage" type="number" />
          <Field label="Einkaufspreis (€)" name="purchaseEuro" />
        </div>

        <div className="flex flex-wrap items-center gap-4 text-sm text-slate-300">
          <label className="flex items-center gap-2">
            <input type="checkbox" name="isStock" className="h-4 w-4" />
            Fahrzeug ist Bestand (Handel)
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" name="isForSale" className="h-4 w-4" />
            Zum Verkauf anbieten
          </label>
        </div>

        <div>
          <label className="mb-1 block text-sm text-slate-300">Notizen</label>
          <textarea
            name="notes"
            className="w-full rounded border border-slate-700 bg-slate-800 p-2"
            rows={4}
          />
        </div>

        <button className="rounded bg-cyan-600 px-4 py-2 text-sm font-medium hover:bg-cyan-700">
          Speichern
        </button>
      </form>
    </div>
  );
}

function Field({
  label,
  name,
  type = "text",
}: {
  label: string;
  name: string;
  type?: string;
}) {
  return (
    <div>
      <label className="mb-1 block text-sm text-slate-300">{label}</label>
      <input
        name={name}
        type={type}
        className="w-full rounded border border-slate-700 bg-slate-800 p-2"
      />
    </div>
  );
}

