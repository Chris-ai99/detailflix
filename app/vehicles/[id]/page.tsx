// app/vehicles/[id]/page.tsx
import Link from "next/link";
import { getVehicle } from "./serverActions";

export default async function VehicleDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const v = await getVehicle(params.id);
  // ...

  const purchaseEuro =
    v.purchaseCents != null ? (v.purchaseCents / 100).toFixed(2).replace(".", ",") : "—";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">
          Fahrzeug: {v.make ?? "—"} {v.model ?? ""}
        </h1>
        <div className="flex gap-2">
          <Link className="rounded px-3 py-2 hover:bg-slate-800" href="/vehicles">
            Zurück
          </Link>
          <Link
            className="rounded bg-slate-800 px-3 py-2 hover:bg-slate-700"
            href={`/vehicles/${v.id}/edit`}
          >
            Bearbeiten
          </Link>
        </div>
      </div>

      <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-6">
        <dl className="grid grid-cols-2 gap-4 text-sm">
          <Item label="VIN" value={v.vin ?? "—"} />
          <Item label="Baujahr" value={v.year?.toString() ?? "—"} />
          <Item label="Kilometer" value={v.mileage?.toString() ?? "—"} />
          <Item label="Einkaufspreis" value={purchaseEuro === "—" ? "—" : `${purchaseEuro} €`} />
        </dl>

        {v.notes && (
          <div className="mt-6">
            <div className="mb-1 text-sm text-slate-300">Notizen</div>
            <div className="rounded border border-slate-800 bg-slate-950 p-3 text-slate-200">
              {v.notes}
            </div>
          </div>
        )}
      </div>
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