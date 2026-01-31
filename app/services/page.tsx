import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { centsToEuros } from "@/lib/money";
import { minutesToHHMM } from "@/lib/time";

function calcDefaultPriceCents(s: any): number {
  if (s.pricingType === "AW") {
    const qty = typeof s.awDefaultQty === "number" ? s.awDefaultQty : 1;
    const unit = s.awUnitPriceCents ?? 0;
    return Math.round(unit * qty);
  }
  // HOURLY
  const rate = s.hourlyRateCents ?? 0;
  const mins = s.defaultMinutes ?? 0;
  return Math.round(rate * (mins / 60));
}

export default async function ServicesPage() {
  const services = await prisma.serviceItem.findMany({
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Dienstleistungen</h1>

        <Link
          href="/services/new"
          className="bg-emerald-600 hover:bg-emerald-500 px-3 py-2 rounded"
        >
          + Neu
        </Link>
      </div>

      <div className="mt-6 bg-slate-900 rounded p-4">
        <table className="w-full text-left">
          <thead className="text-slate-400">
            <tr>
              <th className="py-2">Service</th>
              <th>Preis</th>
              <th>Zeit</th>
              <th>Kategorie</th>
              <th>Material</th>
              <th>Erstellt</th>
            </tr>
          </thead>

          <tbody>
            {services.map((s) => {
              const priceCents = calcDefaultPriceCents(s);

              const timeText =
                s.pricingType === "AW"
                  ? `${s.awDefaultQty ?? 1}x ${s.awDurationMinutes ?? 60}min (AW)`
                  : `${minutesToHHMM(s.defaultMinutes ?? 0)} (Std)`;

              const materialText =
                (s.materialPercent ?? 0) > 0 || (s.materialFixedCents ?? 0) > 0
                  ? `${s.materialPercent ?? 0}% + ${centsToEuros(s.materialFixedCents ?? 0)}€`
                  : "—";

              return (
                <tr key={s.id} className="border-t border-slate-800">
                  <td className="py-3">
                    <Link
                      href={`/services/${s.id}`}
                      className="text-emerald-400 hover:underline"
                    >
                      {s.name}
                    </Link>
                  </td>
                  <td>{centsToEuros(priceCents)} €</td>
                  <td>{timeText}</td>
                  <td>{s.category ?? "—"}</td>
                  <td>{materialText}</td>
                  <td className="text-slate-300">
                    {new Date(s.createdAt).toLocaleDateString("de-DE")}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {services.length === 0 && (
          <div className="text-slate-400 py-6">
            Noch keine Dienstleistungen vorhanden. Klicke auf „Neu“.
          </div>
        )}
      </div>
    </div>
  );
}