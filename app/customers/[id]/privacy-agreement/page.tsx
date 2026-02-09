import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import PrivacyAgreementClient from "./PrivacyAgreementClient";

function splitName(fullName?: string | null): { firstName: string; lastName: string } {
  const name = (fullName || "").trim();
  if (!name) return { firstName: "", lastName: "" };
  const parts = name.split(/\s+/);
  if (parts.length === 1) return { firstName: parts[0], lastName: "" };
  return { firstName: parts[0], lastName: parts.slice(1).join(" ") };
}

function combineZipCity(zip?: string | null, city?: string | null): string {
  return [zip, city].map((v) => (v || "").trim()).filter(Boolean).join(" ");
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

export default async function PrivacyAgreementPage({
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
  const zipCity = combineZipCity(customer.zip, customer.city);
  const customerCompany = split.lastName ? "" : split.firstName;
  const firstName = split.lastName ? split.firstName : "";
  const lastName = split.lastName || "";
  const vehicleName = combineVehicleLabel(latestVehicle?.make, latestVehicle?.model);

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
    company: customerCompany,
    street: (customer.street || "").trim(),
    zipCity,
    email: (customer.email || "").trim(),
    phone: (customer.phone || "").trim(),
    vehicle: vehicleName,
    plate: (latestVehicle?.vin || "").trim(),
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Datenschutzvereinbarung</h1>
        <Link
          href={`/customers/${customer.id}`}
          className="rounded bg-slate-800 px-3 py-2 text-sm text-slate-200 hover:bg-slate-700"
        >
          Zurueck zum Kundenprofil
        </Link>
      </div>

      <PrivacyAgreementClient
        customerId={customer.id}
        company={company}
        customer={customerInitial}
        placeDateDefault={defaultPlaceDate(company.city || customer.city)}
      />
    </div>
  );
}
