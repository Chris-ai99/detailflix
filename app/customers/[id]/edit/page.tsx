import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { updateCustomer } from "./serverActions";

export default async function EditCustomerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  // ✅ Next.js 15: params ist Promise -> awaiten
  const { id } = await params; // [1](https://dev.to/lachiamine/getting-started-with-prisma-sqlite-and-express-620)[2](https://github.com/prisma/prisma/discussions/13458)

  const customer = await prisma.customer.findUnique({
    where: { id },
  });

  if (!customer) return notFound();

  return (
    <div className="max-w-xl">
      <h1 className="text-2xl font-bold mb-6">Kunde bearbeiten</h1>

      <form
        action={updateCustomer}
        className="flex flex-col gap-3 bg-slate-900 p-4 rounded"
      >
        <input type="hidden" name="id" value={customer.id} />

        <label className="flex items-center gap-2 text-sm text-slate-300">
          <input
            type="checkbox"
            name="isBusiness"
            className="h-4 w-4"
            defaultChecked={customer.isBusiness}
          />
          Gewerbekunde
        </label>

        <input
          name="name"
          defaultValue={customer.name ?? ""}
          placeholder="Name / Firma"
          className="p-2 rounded bg-slate-800"
        />

        <input
          name="email"
          defaultValue={customer.email ?? ""}
          placeholder="E-Mail"
          className="p-2 rounded bg-slate-800"
        />

        <input
          name="phone"
          defaultValue={customer.phone ?? ""}
          placeholder="Telefon"
          className="p-2 rounded bg-slate-800"
        />

        <input
          name="vatId"
          defaultValue={customer.vatId ?? ""}
          placeholder="USt-IdNr"
          className="p-2 rounded bg-slate-800"
        />

        <input
          name="street"
          defaultValue={customer.street ?? ""}
          placeholder="Straße"
          className="p-2 rounded bg-slate-800"
        />

        <div className="flex gap-2">
          <input
            name="zip"
            defaultValue={customer.zip ?? ""}
            placeholder="PLZ"
            className="p-2 rounded bg-slate-800 w-32"
          />
          <input
            name="city"
            defaultValue={customer.city ?? ""}
            placeholder="Ort"
            className="p-2 rounded bg-slate-800 flex-1"
          />
        </div>

        <textarea
          name="notes"
          defaultValue={customer.notes ?? ""}
          placeholder="Notizen"
          className="p-2 rounded bg-slate-800"
        />

        <button className="mt-2 bg-cyan-600 hover:bg-cyan-500 p-2 rounded">
          Speichern
        </button>
      </form>
    </div>
  );
}

