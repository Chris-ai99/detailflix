import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";

function todayLabel() {
  return new Date().toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

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
      street: true,
      zip: true,
      city: true,
      country: true,
      email: true,
    },
  });

  if (!customer) return notFound();

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Datenschutzvereinbarung</h1>
        <Link href={`/customers/${customer.id}`} className="rounded bg-slate-800 px-3 py-2 hover:bg-slate-700">
          Zurueck zum Kunden
        </Link>
      </div>

      <div className="rounded border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
        Druckansicht: Bitte mit Strg+P drucken oder als PDF speichern. Anschliessend das unterschriebene
        Dokument als "Datenschutz (signiert)" im Kundenprofil hochladen.
      </div>

      <div className="rounded bg-white p-8 text-black print:rounded-none print:p-0">
        <div className="space-y-4 text-sm leading-6">
          <h2 className="text-xl font-semibold">Einwilligung zur Datenverarbeitung</h2>
          <p>
            Kunde: <strong>{customer.name || "-"}</strong>
            <br />
            Anschrift: {customer.street || "-"}
            {customer.zip || customer.city ? `, ${customer.zip ?? ""} ${customer.city ?? ""}` : ""}
            {customer.country ? `, ${customer.country}` : ""}
            <br />
            E-Mail: {customer.email || "-"}
          </p>
          <p>
            Hiermit wird eingewilligt, dass die im Rahmen der Auftragsabwicklung erforderlichen
            personenbezogenen Daten gespeichert und verarbeitet werden.
          </p>
          <p>
            Die Datenverarbeitung erfolgt ausschliesslich zu den vereinbarten Zwecken sowie unter
            Beachtung der jeweils gueltigen Datenschutzgesetze.
          </p>
          <div className="pt-8">
            Ort, Datum: _________________________ ({todayLabel()})
          </div>
          <div className="pt-8">Unterschrift Kunde: _________________________</div>
          <div className="pt-8">Unterschrift Betrieb: _________________________</div>
        </div>
      </div>
    </div>
  );
}
