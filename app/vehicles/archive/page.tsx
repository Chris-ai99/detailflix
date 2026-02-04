import Link from "next/link";
import { listArchivedVehicles } from "../serverActions";

export default async function ArchivedVehiclesPage() {
  const vehicles = await listArchivedVehicles();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Fahrzeuge Archiv</h1>
        <Link
          href="/vehicles"
          className="rounded bg-slate-800 px-4 py-2 text-sm font-medium hover:bg-slate-700"
        >
          Zurück zu Kundenfahrzeugen
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
                <td className="p-3">{v.make ?? "—"}</td>
                <td className="p-3">{v.model ?? "—"}</td>
                <td className="p-3">{v.vin ?? "—"}</td>
                <td className="p-3">{v.mileage ?? "—"}</td>
                <td className="p-3">{v.year ?? "—"}</td>
                <td className="p-3 text-right">
                  <Link
                    className="rounded px-3 py-1 hover:bg-slate-800"
                    href={`/vehicles/${v.id}`}
                  >
                    Anzeigen
                  </Link>
                </td>
              </tr>
            ))}

            {vehicles.length === 0 && (
              <tr>
                <td className="p-6 text-slate-400" colSpan={6}>
                  Keine archivierten Fahrzeuge vorhanden.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
