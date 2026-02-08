import { prisma } from "@/lib/prisma";
import SidebarClient from "./SidebarClient";

export default async function Sidebar() {
  const [
    orders,
    invoices,
    offers,
    customers,
    services,
    vehiclesCustomer,
    vehiclesForSale,
    vehiclesArchive,
    creditNotes,
    stornos,
  ] = await Promise.all([
    prisma.document.count({ where: { docType: "PURCHASE_CONTRACT" } }),
    prisma.document.count({ where: { docType: "INVOICE" } }),
    prisma.document.count({ where: { docType: "OFFER" } }),
    prisma.customer.count(),
    prisma.serviceItem.count(),
    prisma.vehicle.count({ where: { isStock: false, isSold: false } }),
    prisma.vehicle.count({ where: { isStock: true, isForSale: true, isSold: false } }),
    prisma.vehicle.count({ where: { isSold: true } }),
    prisma.document.count({ where: { docType: "CREDIT_NOTE" } }),
    prisma.document.count({ where: { docType: "STORNO" } }),
  ]);
  const vehiclesTotal = vehiclesCustomer + vehiclesForSale + vehiclesArchive;

  return (
    <SidebarClient
      counts={{
        orders,
        invoices,
        offers,
        customers,
        services,
        vehiclesCustomer,
        vehiclesForSale,
        vehiclesArchive,
        vehiclesTotal,
        creditNotes,
        stornos,
      }}
    />
  );
}
