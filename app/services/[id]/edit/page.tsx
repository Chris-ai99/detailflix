import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { updateService } from "./serverActions";
import { centsToEuros } from "@/lib/money";
import { minutesToHHMM } from "@/lib/time";

export default async function EditServicePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const s = await prisma.serviceItem.findUnique({ where: { id } });
  if (!s) return notFound();

  return (
    <div className="max-w-3xl space-y-4">
      <h1 className="mb-6 text-2xl font-bold">Dienstleistung bearbeiten</h1>

      <form action={updateService} className="bg-slate-900 p-4 rounded space-y-4">
        <input type="hidden" name="id" value={s.id} />

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
          <span className="text-slate-300">Typ:</span>

          <label className="flex items-center gap-2">
            <input type="radio" name="pricingType" value="AW" defaultChecked={s.pricingType === "AW"} />
            Arbeitswert (AW)
          </label>

          <label className="flex items-center gap-2">
            <input type="radio" name="pricingType" value="HOURLY" defaultChecked={s.pricingType === "HOURLY"} />
            Stundenlohn
          </label>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <input name="name" defaultValue={s.name} className="p-2 rounded bg-slate-800" required />
          <input name="category" defaultValue={s.category ?? ""} className="p-2 rounded bg-slate-800" placeholder="Kategorie" />
        </div>

        <div className="border border-slate-800 rounded p-3">
          <div className="text-slate-300 font-semibold mb-2">AW</div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <input name="awDurationMinutes" defaultValue={String(s.awDurationMinutes ?? 60)} className="p-2 rounded bg-slate-800" />
            <input name="awUnitPrice" defaultValue={centsToEuros(s.awUnitPriceCents ?? 0)} className="p-2 rounded bg-slate-800" />
            <input name="awDefaultQty" defaultValue={String(s.awDefaultQty ?? 1)} className="p-2 rounded bg-slate-800" />
          </div>
        </div>

        <div className="border border-slate-800 rounded p-3">
          <div className="text-slate-300 font-semibold mb-2">Stundenlohn</div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <input name="hourlyRate" defaultValue={centsToEuros(s.hourlyRateCents ?? 0)} className="p-2 rounded bg-slate-800" />
            <input name="defaultTime" defaultValue={minutesToHHMM(s.defaultMinutes ?? 0)} className="p-2 rounded bg-slate-800" />
            <input name="vatRate" defaultValue={String(s.vatRate)} className="p-2 rounded bg-slate-800" />
          </div>

          <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
            <input name="materialPercent" defaultValue={String(s.materialPercent ?? 0)} className="p-2 rounded bg-slate-800" />
            <input name="materialFixed" defaultValue={centsToEuros(s.materialFixedCents ?? 0)} className="p-2 rounded bg-slate-800" />
          </div>
        </div>

        <textarea
          name="shortText"
          defaultValue={s.shortText ?? ""}
          placeholder="Kurzbeschreibung"
          className="p-2 rounded bg-slate-800 w-full"
        />

        <label className="flex items-center gap-2 text-slate-200">
          <input type="checkbox" name="active" defaultChecked={s.active} />
          aktiv
        </label>

        <button className="bg-cyan-600 hover:bg-cyan-500 px-4 py-2 rounded">
          Speichern
        </button>
      </form>
    </div>
  );
}
