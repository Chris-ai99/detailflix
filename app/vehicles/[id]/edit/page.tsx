// app/vehicles/[id]/edit/page.tsx
import Link from "next/link";
import { getVehicle, updateVehicle } from "../serverActions";

export default async function EditVehiclePage({
  params,
}: {
  params: { id: string };
}) {
  const v = await getVehicle(params.id);

  const purchaseEuro =
    v.purchaseCents != null ? (v.purchaseCents / 100).toFixed(2).replace(".", ",") : "";

  async function action(formData: FormData) {
    "use server";
    await updateVehicle(params.id, formData);
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Fahrzeug bearbeiten</h1>
        <Link className="rounded px-3 py-2 hover:bg-slate-800" href={`/vehicles/${v.id}`}>
          Zurück
        </Link>
      </div>

      <form action={action} className="space-y-4 rounded-lg border border-slate-800 bg-slate-900/40 p-6">
        <div className="grid grid-cols-2 gap-4">
          <Field label="VIN" name="vin" defaultValue={v.vin ?? ""} />
          <Field label="Baujahr" name="year" type="number" defaultValue={v.year?.toString() ?? ""} />
          <Field label="Marke" name="make" defaultValue={v.make ?? ""} />
          <Field label="Modell" name="model" defaultValue={v.model ?? ""} />
          <Field label="Kilometerstand" name="mileage" type="number" defaultValue={v.mileage?.toString() ?? ""} />
          <Field label="Einkaufspreis (€)" name="purchaseEuro" defaultValue={purchaseEuro} />
        </div>

        <div>
          <label className="mb-1 block text-sm text-slate-300">Notizen</label>
          <textarea
            name="notes"
            defaultValue={v.notes ?? ""}
            className="w-full rounded border border-slate-700 bg-slate-950 p-2"
            rows={4}
          />
        </div>

        <button className="rounded bg-emerald-600 px-4 py-2 text-sm font-medium hover:bg-emerald-700">
          Änderungen speichern
        </button>
      </form>
    </div>
  );
}

function Field({
  label,
  name,
  defaultValue,
  type = "text",
}: {
  label: string;
  name: string;
  defaultValue?: string;
  type?: string;
}) {
  return (
    <div>
      <label className="mb-1 block text-sm text-slate-300">{label}</label>
      <input
        name={name}
        type={type}
        defaultValue={defaultValue}
        className="w-full rounded border border-slate-700 bg-slate-950 p-2"
      />
    </div>
  );
}