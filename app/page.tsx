import Link from "next/link";

export default function Home() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center space-y-4">
        <h1 className="text-3xl font-bold">AUTOBIZ</h1>
        <p className="text-slate-400">Coming Soon</p>

        <div className="flex gap-3 justify-center">
          <Link className="rounded bg-slate-800 px-4 py-2 hover:bg-slate-700" href="/dashboard">
            Dashboard
          </Link>
          <Link className="rounded bg-slate-800 px-4 py-2 hover:bg-slate-700" href="/invoices">
            Rechnungen
          </Link>
          <Link className="rounded bg-slate-800 px-4 py-2 hover:bg-slate-700" href="/offers">
            Angebote
          </Link>
        </div>
      </div>
    </div>
  );
}
