import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import PrivacyAgreementClient from "../PrivacyAgreementClient";

function splitName(fullName?: string | null): { firstName: string; lastName: string } {
  const name = (fullName || "").trim();
  if (!name) return { firstName: "", lastName: "" };
  const parts = name.split(/\s+/);
  if (parts.length === 1) return { firstName: parts[0], lastName: "" };
  return { firstName: parts[0], lastName: parts.slice(1).join(" ") };
}

function combineVehicleLabel(make?: string | null, model?: string | null): string {
  return [make, model].map((v) => (v || "").trim()).filter(Boolean).join(" ");
}

function defaultPlaceDate(city?: string | null): string {
  const date = new Date().toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
  const place = (city || "").trim();
  return place ? `${place}, ${date}` : date;
}

export default async function PrivacyAgreementSignPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [customer, settings, latestVehicle] = await Promise.all([
    prisma.customer.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        isBusiness: true,
        companyName: true,
        contactFirstName: true,
        contactLastName: true,
        contactUseZh: true,
        street: true,
        zip: true,
        city: true,
        country: true,
        email: true,
        phone: true,
      },
    }),
    prisma.companySettings.findUnique({ where: { id: "default" } }),
    prisma.vehicle.findFirst({
      where: { customerId: id },
      orderBy: { updatedAt: "desc" },
      select: {
        make: true,
        model: true,
        vin: true,
      },
    }),
  ]);

  if (!customer) return notFound();

  const split = splitName(customer.name);
  const customerCompany = (customer.companyName || (customer.isBusiness ? customer.name : "") || "").trim();
  const firstName = (customer.contactFirstName || (!customer.isBusiness ? split.firstName : "")).trim();
  const lastName = (customer.contactLastName || (!customer.isBusiness ? split.lastName : "")).trim();
  const vehicleName = combineVehicleLabel(latestVehicle?.make, latestVehicle?.model);

  const contactPrefix =
    customer.contactUseZh && (firstName || lastName) ? "z. H. " : "";
  const contactCombined = [firstName, lastName].filter(Boolean).join(" ").trim();

  const company = {
    name: (settings?.companyName || "Unternehmen").trim(),
    ownerName: (settings?.ownerName || "").trim(),
    street: (settings?.street || "").trim(),
    zip: (settings?.zip || "").trim(),
    city: (settings?.city || "").trim(),
    phone: (settings?.phone || "").trim(),
    email: (settings?.email || "").trim(),
    logoDataUrl: (settings?.logoDataUrl || "").trim(),
  };

  const customerInitial = {
    firstName,
    lastName,
    company: [customerCompany, contactPrefix ? `${contactPrefix}${contactCombined}` : ""]
      .filter(Boolean)
      .join(", "),
    street: (customer.street || "").trim(),
    postalCode: (customer.zip || "").trim(),
    city: (customer.city || "").trim(),
    email: (customer.email || "").trim(),
    phone: (customer.phone || "").trim(),
    vehicle: vehicleName,
    plate: (latestVehicle?.vin || "").trim(),
  };

  return (
    <div className="space-y-5">
      <section className="rounded-xl border border-slate-700 bg-slate-900/70 p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-xs uppercase tracking-[0.12em] text-slate-400">Kundenprofil</div>
            <h1 className="mt-1 text-2xl font-semibold text-slate-100">
              Datenschutzvereinbarung online signieren
            </h1>
            <p className="mt-1 text-sm text-slate-400">Kunde: {customer.name || "Ohne Namen"}</p>
          </div>
          <Link
            href={`/customers/${customer.id}/privacy-agreement`}
            className="w-fit rounded border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-200 hover:bg-slate-700"
          >
            Zurück zur PDF-Ansicht
          </Link>
        </div>
      </section>

      <PrivacyAgreementClient
        customerId={customer.id}
        company={company}
        customer={customerInitial}
        placeDateDefault={defaultPlaceDate(company.city || customer.city)}
      />
    </div>
  );
}
