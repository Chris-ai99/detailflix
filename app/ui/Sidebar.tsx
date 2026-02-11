import { prisma } from "@/lib/prisma";
import { getSessionFromCookies, getWorkspaceIdFromCookies } from "@/lib/auth";
import { unstable_cache } from "next/cache";
import SidebarClient from "./SidebarClient";

type SidebarCounts = {
  orders: number;
  invoices: number;
  offers: number;
  customers: number;
  services: number;
  vehiclesCustomer: number;
  vehiclesForSale: number;
  vehiclesArchive: number;
  vehiclesTotal: number;
  creditNotes: number;
  stornos: number;
};

const ZERO_COUNTS: SidebarCounts = {
  orders: 0,
  invoices: 0,
  offers: 0,
  customers: 0,
  services: 0,
  vehiclesCustomer: 0,
  vehiclesForSale: 0,
  vehiclesArchive: 0,
  vehiclesTotal: 0,
  creditNotes: 0,
  stornos: 0,
};

function toCount(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "bigint") return Number(value);
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

async function readSidebarCounts(): Promise<SidebarCounts> {
  const rows = await prisma.$queryRaw<
    Array<{
      orders: number | bigint | null;
      invoices: number | bigint | null;
      offers: number | bigint | null;
      customers: number | bigint | null;
      services: number | bigint | null;
      vehiclesCustomer: number | bigint | null;
      vehiclesForSale: number | bigint | null;
      vehiclesArchive: number | bigint | null;
      creditNotes: number | bigint | null;
      stornos: number | bigint | null;
    }>
  >`
    SELECT
      (SELECT COUNT(*) FROM "Document" WHERE "docType" = 'PURCHASE_CONTRACT') AS "orders",
      (SELECT COUNT(*) FROM "Document" WHERE "docType" = 'INVOICE') AS "invoices",
      (SELECT COUNT(*) FROM "Document" WHERE "docType" = 'OFFER') AS "offers",
      (SELECT COUNT(*) FROM "Customer") AS "customers",
      (SELECT COUNT(*) FROM "ServiceItem") AS "services",
      (SELECT COUNT(*) FROM "Vehicle" WHERE "isStock" = 0 AND "isSold" = 0) AS "vehiclesCustomer",
      (SELECT COUNT(*) FROM "Vehicle" WHERE "isStock" = 1 AND "isForSale" = 1 AND "isSold" = 0) AS "vehiclesForSale",
      (SELECT COUNT(*) FROM "Vehicle" WHERE "isSold" = 1) AS "vehiclesArchive",
      (SELECT COUNT(*) FROM "Document" WHERE "docType" = 'CREDIT_NOTE') AS "creditNotes",
      (SELECT COUNT(*) FROM "Document" WHERE "docType" = 'STORNO') AS "stornos"
  `;

  const row = rows[0];
  if (!row) return ZERO_COUNTS;

  const vehiclesCustomer = toCount(row.vehiclesCustomer);
  const vehiclesForSale = toCount(row.vehiclesForSale);
  const vehiclesArchive = toCount(row.vehiclesArchive);

  return {
    orders: toCount(row.orders),
    invoices: toCount(row.invoices),
    offers: toCount(row.offers),
    customers: toCount(row.customers),
    services: toCount(row.services),
    vehiclesCustomer,
    vehiclesForSale,
    vehiclesArchive,
    vehiclesTotal: vehiclesCustomer + vehiclesForSale + vehiclesArchive,
    creditNotes: toCount(row.creditNotes),
    stornos: toCount(row.stornos),
  };
}

const readSidebarCountsCached = unstable_cache(
  async (_workspaceId: string) => readSidebarCounts(),
  ["sidebar-counts"],
  { revalidate: 20 }
);

export default async function Sidebar() {
  try {
    const session = await getSessionFromCookies();
    const role = session?.role ?? "OWNER";
    const workspaceId = await getWorkspaceIdFromCookies();
    if (!workspaceId) {
      return <SidebarClient counts={ZERO_COUNTS} role={role} />;
    }

    const counts = await readSidebarCountsCached(workspaceId);
    return <SidebarClient counts={counts} role={role} />;
  } catch (error) {
    console.error("[sidebar] count load failed", error);
    return <SidebarClient counts={ZERO_COUNTS} role="OWNER" />;
  }
}
