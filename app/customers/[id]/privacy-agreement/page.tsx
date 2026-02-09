import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";

export default async function PrivacyAgreementPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const customer = await prisma.customer.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
    },
  });

  if (!customer) return notFound();

  const pdfUrl = `/api/customers/${customer.id}/privacy-agreement/pdf`;
  const customerLabel = customer.name || "Ohne Namen";

  return (
    <div className="space-y-5">
      <section className="rounded-xl border border-slate-700 bg-slate-900/70 p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-xs uppercase tracking-[0.12em] text-slate-400">Kundenprofil</div>
            <h1 className="mt-1 text-2xl font-semibold text-slate-100">Datenschutzvereinbarung</h1>
            <p className="mt-1 text-sm text-slate-400">{customerLabel}</p>
          </div>
          <Link
            href={`/customers/${customer.id}`}
            className="rounded border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-200 hover:bg-slate-700"
          >
            Zurück zum Kundenprofil
          </Link>
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_560px]">
        <div className="space-y-4">
          <article className="rounded-xl border border-slate-700 bg-slate-900/60 p-5">
            <h2 className="text-base font-semibold text-slate-100">Dokumentstatus</h2>
            <p className="mt-1 text-sm text-slate-400">
              Die aktuelle Vorlage kann direkt geöffnet, heruntergeladen oder online signiert werden.
            </p>
            <div className="mt-3 flex flex-wrap gap-2 text-xs">
              <span className="rounded border border-slate-600 bg-slate-800/60 px-2 py-1 text-slate-300">
                Format: PDF
              </span>
              <span className="rounded border border-cyan-500/40 bg-cyan-500/10 px-2 py-1 text-cyan-200">
                Kunde: {customerLabel}
              </span>
            </div>
          </article>

          <article className="rounded-xl border border-slate-700 bg-slate-900/60 p-5">
            <h2 className="text-base font-semibold text-slate-100">Aktionen</h2>
            <p className="mt-1 text-sm text-slate-400">
              Wählen Sie direkt aus, was als Nächstes passieren soll.
            </p>
            <div className="mt-3 grid gap-2">
              <Link
                href={`/customers/${customer.id}/privacy-agreement/sign`}
                className="rounded bg-cyan-600 px-3 py-2 text-sm font-semibold text-white hover:bg-cyan-500"
              >
                Online unterschreiben
              </Link>
              <a
                className="rounded border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100 hover:bg-slate-700"
                href={pdfUrl}
                target="_blank"
                rel="noreferrer"
              >
                PDF öffnen
              </a>
              <a
                className="rounded border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100 hover:bg-slate-700"
                href={`${pdfUrl}?download=1`}
              >
                PDF herunterladen
              </a>
            </div>
          </article>

          <article className="rounded-xl border border-slate-700 bg-slate-900/60 p-5">
            <h2 className="text-base font-semibold text-slate-100">Hinweis</h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-400">
              Die Vorschau rechts zeigt den aktuellen PDF-Stand. Nach einer Online-Signatur wird die
              signierte Version automatisch als Dokument im Kundenprofil abgelegt.
            </p>
          </article>
        </div>

        <div className="rounded-xl border border-slate-700 bg-slate-900/60 p-3">
          <div className="mb-3 flex items-center justify-between px-1">
            <div className="text-sm font-semibold text-slate-200">Vorschau</div>
            <a
              className="rounded border border-slate-600 bg-slate-800 px-3 py-1 text-xs text-slate-200 hover:bg-slate-700"
              href={pdfUrl}
              target="_blank"
              rel="noreferrer"
            >
              PDF öffnen
            </a>
          </div>
          <iframe
            title="Datenschutzvereinbarung PDF"
            src={pdfUrl}
            className="h-[76vh] min-h-[680px] w-full rounded bg-white"
          />
        </div>
      </section>
    </div>
  );
}
