import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { centsToEuros } from "@/lib/money";
import { minutesToHHMM } from "@/lib/time";
import { deleteService } from "./serverActions";

export default async function ServiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const s = await prisma.serviceItem.findUnique({ where: { id } });
  if (!s) return notFound();

  const priceText =
    s.pricingType === "AW"
      ? `${centsToEuros(s.awUnitPriceCents ?? 0)} € pro AW (x ${s.awDefaultQty ?? 1})`
      : `${centsToEuros(s.hourlyRateCents ?? 0)} €/h, Zeit: ${minutesToHHMM(s.defaultMinutes ?? 0)}`;

  const materialText =
    (s.materialPercent ?? 0) > 0 || (s.materialFixedCents ?? 0) > 0
      ? `${s.materialPercent ?? 0}% + ${centsToEuros(s.materialFixedCents ?? 0)}€`
      : "—";

  return (
    <div className="max-w-2xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{s.name}</h1>

        <div className="flex gap-2">
          <Link
            href={`/services/${s.id}/edit`}
            className="bg-slate-800 hover:bg-slate-700 px-3 py-2 rounded"
          >
            Bearbeiten
          </Link>

          <Link
            href="/services"
            className="bg-slate-800 hover:bg-slate-700 px-3 py-2 rounded"
          >
            Zurück
          </Link>
        </div>
      </div>

      <div className="mt-6 bg-slate-900 rounded p-4 space-y-2">
        <div><span className="text-slate-400">Typ:</span> {s.pricingType}</div>
        <div><span className="text-slate-400">Preis:</span> {priceText}</div>
        <div><span className="text-slate-400">Kategorie:</span> {s.category ?? "—"}</div>
        <div><span className="text-slate-400">Material:</span> {materialText}</div>
        <div><span className="text-slate-400">MwSt:</span> {s.vatRate}%</div>
        <div>
          <span className="text-slate-400">Status:</span>{" "}
          {s.active ? <span className="text-cyan-400">aktiv</span> : <span className="text-slate-400">inaktiv</span>}
        </div>
      </div>

      <div className="mt-6">
        <form action={deleteService}>
          <input type="hidden" name="id" value={s.id} />
          <button className="bg-red-600 hover:bg-red-500 px-3 py-2 rounded">
            Löschen
          </button>
        </form>
      </div>
    </div>
  );
}
