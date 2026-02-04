import Link from "next/link";
import { listForSaleVehicles } from "../serverActions";
import MarkVehicleSoldButton from "../ui/MarkVehicleSoldButton";

export default async function ForSaleVehiclesPage() {
  const vehicles = await listForSaleVehicles();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Fahrzeuge zum Verkauf</h1>
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
              <th className="p-3 text-left">Preis (EK)</th>
              <th className="p-3 text-right">Aktion</th>
            </tr>
          </thead>
          <tbody>
            {vehicles.map((v) => (
              <tr key={v.id} className="border-b border-slate-800 last:border-b-0">
                <td className="p-3">{v.make ?? "—"}</td>
                <td className="p-3">{v.model ?? "—"}</td>
                <td className="p-3">{v.vin ?? "—"}</td>
                <td className="p-3">
                  {typeof v.purchaseCents === "number"
                    ? (v.purchaseCents / 100).toFixed(2) + " €"
                    : "—"}
                </td>
                <td className="p-3 text-right">
                  <div className="flex justify-end gap-2">
                    <Link
                      className="rounded bg-slate-800 px-3 py-2 text-xs hover:bg-slate-700"
                      href={`/vehicles/${v.id}/edit`}
                    >
                      Bearbeiten
                    </Link>
                    <MarkVehicleSoldButton id={v.id} />
                  </div>
                </td>
              </tr>
            ))}

            {vehicles.length === 0 && (
              <tr>
                <td className="p-6 text-slate-400" colSpan={5}>
                  Keine Fahrzeuge zum Verkauf vorhanden.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
