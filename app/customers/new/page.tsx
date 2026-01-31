import { createCustomer } from "./serverActions";

export default function NewCustomerPage() {
  return (
    <div className="max-w-xl">
      <h1 className="text-2xl font-bold mb-6">Neuer Kunde</h1>

      <form
        action={createCustomer}
        className="flex flex-col gap-3 bg-slate-900 p-4 rounded"
      >
        <input
          name="name"
          placeholder="Name"
          className="p-2 rounded bg-slate-800"
          required
        />
        <input
          name="email"
          placeholder="E-Mail"
          className="p-2 rounded bg-slate-800"
        />
        <input
          name="phone"
          placeholder="Telefon"
          className="p-2 rounded bg-slate-800"
        />

        <input
          name="vatId"
          placeholder="USt-IdNr (optional)"
          className="p-2 rounded bg-slate-800"
        />
        <input
          name="street"
          placeholder="Straße (optional)"
          className="p-2 rounded bg-slate-800"
        />

        <div className="flex gap-2">
          <input
            name="zip"
            placeholder="PLZ"
            className="p-2 rounded bg-slate-800 w-32"
          />
          <input
            name="city"
            placeholder="Ort"
            className="p-2 rounded bg-slate-800 flex-1"
          />
        </div>

        <textarea
          name="notes"
          placeholder="Notizen"
          className="p-2 rounded bg-slate-800"
        />

        <button className="mt-2 bg-emerald-600 hover:bg-emerald-500 p-2 rounded">
          Speichern
        </button>
      </form>
    </div>
  );
}