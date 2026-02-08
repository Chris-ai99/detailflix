import { createService } from "./serverActions";

export default function NewServicePage() {
  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-bold mb-6">Dienstleistung anlegen</h1>

      <form action={createService} className="bg-slate-900 p-4 rounded space-y-4">
        {/* Typ */}
        <div className="flex gap-3 items-center">
          <span className="text-slate-300">Typ:</span>

          <label className="flex items-center gap-2">
            <input type="radio" name="pricingType" value="AW" defaultChecked />
            Arbeitswert (AW)
          </label>

          <label className="flex items-center gap-2">
            <input type="radio" name="pricingType" value="HOURLY" />
            Stundenlohn
          </label>
        </div>

        {/* Basis */}
        <div className="grid grid-cols-2 gap-3">
          <input
            name="name"
            placeholder="Bezeichnung (z.B. Handwäsche)"
            className="p-2 rounded bg-slate-800"
            required
          />
          <input
            name="category"
            placeholder="Kategorie (optional)"
            className="p-2 rounded bg-slate-800"
          />
        </div>

        {/* AW Felder */}
        <div className="border border-slate-800 rounded p-3">
          <div className="text-slate-300 font-semibold mb-2">Arbeitswert (AW)</div>

          <div className="grid grid-cols-3 gap-3">
            <input
              name="awDurationMinutes"
              placeholder="AW-Dauer (min) z.B. 60"
              defaultValue="60"
              className="p-2 rounded bg-slate-800"
            />
            <input
              name="awUnitPrice"
              placeholder="AW-Preis (z.B. 58,82)"
              className="p-2 rounded bg-slate-800"
            />
            <input
              name="awDefaultQty"
              placeholder="AW-Anzahl (z.B. 1.0)"
              defaultValue="1"
              className="p-2 rounded bg-slate-800"
            />
          </div>

          <p className="text-slate-400 text-sm mt-2">
            AW-Preis = Preis pro 1 AW (für die AW-Dauer). In Angeboten kannst du die AW-Anzahl ändern.
          </p>
        </div>

        {/* Stundenlohn Felder */}
        <div className="border border-slate-800 rounded p-3">
          <div className="text-slate-300 font-semibold mb-2">Stundenlohn</div>

          <div className="grid grid-cols-3 gap-3">
            <input
              name="hourlyRate"
              placeholder="Stundenlohn (z.B. 42,02)"
              className="p-2 rounded bg-slate-800"
            />
            <input
              name="defaultTime"
              placeholder="Zeit (HH:MM) z.B. 05:00"
              className="p-2 rounded bg-slate-800"
            />
            <input
              name="vatRate"
              placeholder="MwSt % (z.B. 19)"
              defaultValue="19"
              className="p-2 rounded bg-slate-800"
            />
          </div>

          <div className="grid grid-cols-2 gap-3 mt-3">
            <input
              name="materialPercent"
              placeholder="Material % (optional) z.B. 10"
              defaultValue="0"
              className="p-2 rounded bg-slate-800"
            />
            <input
              name="materialFixed"
              placeholder="Material Fix € (optional) z.B. 5,00"
              defaultValue="0"
              className="p-2 rounded bg-slate-800"
            />
          </div>
        </div>

        {/* Texte */}
        <textarea
          name="shortText"
          placeholder="Kurzbeschreibung (optional)"
          className="p-2 rounded bg-slate-800 w-full"
        />

        <label className="flex items-center gap-2 text-slate-200">
          <input type="checkbox" name="active" defaultChecked />
          aktiv
        </label>

        <button className="bg-cyan-600 hover:bg-cyan-500 px-4 py-2 rounded">
          Speichern
        </button>
      </form>

      <p className="text-slate-400 mt-4 text-sm">
        Hinweis: Für den Anfang lassen wir die Felder beider Typen im Formular sichtbar.
        Später können wir per UI (JS) abhängig vom Typ Felder ein-/ausblenden.
      </p>
    </div>
  );
}
