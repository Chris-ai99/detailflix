import Link from "next/link";

export default function CustomersOverviewPage() {
  return (
    <div className="space-y-4">
      <div className="text-sm text-slate-300">Kunden &#220;bersicht</div>
      <div className="rounded border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-amber-100">
        <div className="text-sm font-semibold">Platzhalter</div>
        <div className="mt-1 text-xs">
          Dieser Bereich ist noch nicht aktiviert. Hier k&#246;nnen sp&#228;ter KPIs und
          Kundenanalysen dargestellt werden.
        </div>
      </div>
      <Link
        href="/dashboard"
        className="inline-flex rounded bg-slate-800 px-3 py-2 text-xs text-slate-200 hover:bg-slate-700"
      >
        Zur&#252;ck zum Dashboard
      </Link>
    </div>
  );
}
