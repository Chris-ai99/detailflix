// app/vehicles/page.tsx
import Link from "next/link";
import { listVehicles } from "./serverActions";
import DeleteVehicleButton from "./ui/DeleteVehicleButton";

export default async function VehiclesPage() {
  const vehicles = await listVehicles();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Fahrzeuge Kunden</h1>
        <Link
          href="/vehicles/new"
          className="rounded bg-emerald-600 px-4 py-2 text-sm font-medium hover:bg-emerald-700"
        >
          + Neues Fahrzeug
        </Link>
      </div>

      <div className="rounded-lg border border-slate-800 bg-slate-900/40">
        <table className="w-full text-sm">
          <thead className="text-slate-300">
            <tr className="border-b border-slate-800">
              <th className="p-3 text-left">Marke</th>
              <th className="p-3 text-left">Modell</th>
              <th className="p-3 text-left">VIN</th>
              <th className="p-3 text-left">KM</th>
              <th className="p-3 text-left">Baujahr</th>
              <th className="p-3 text-right">Aktion</th>
            </tr>
          </thead>
          <tbody>
            {vehicles.map((v) => (
              <tr key={v.id} className="border-b border-slate-800 last:border-b-0">
                <td className="p-3">
                  <Link className="text-emerald-300 hover:underline" href={`/vehicles/${v.id}`}>
                    {v.make ?? "—"}
                  </Link>
                </td>
                <td className="p-3">{v.model ?? "—"}</td>
                <td className="p-3">{v.vin ?? "—"}</td>
                <td className="p-3">{v.mileage ?? "—"}</td>
                <td className="p-3">{v.year ?? "—"}</td>
                <td className="p-3 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <Link
                      className="rounded px-3 py-1 hover:bg-slate-800"
                      href={`/vehicles/${v.id}/edit`}
                    >
                      Bearbeiten
                    </Link>
                    <DeleteVehicleButton id={v.id} />
                  </div>
                </td>
              </tr>
            ))}

            {vehicles.length === 0 && (
              <tr>
                <td className="p-6 text-slate-400" colSpan={6}>
                  Noch keine Fahrzeuge vorhanden.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

