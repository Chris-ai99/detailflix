"use client";

import { useEffect, useRef, useState } from "react";
import { saveSignedPrivacyAgreement } from "./serverActions";

type PrivacyAgreementClientProps = {
  customerId: string;
  company: {
    name: string;
    ownerName: string;
    street: string;
    zip: string;
    city: string;
    phone: string;
    email: string;
    logoDataUrl: string;
  };
  customer: {
    firstName: string;
    lastName: string;
    company: string;
    street: string;
    zipCity: string;
    email: string;
    phone: string;
    vehicle: string;
    plate: string;
  };
  placeDateDefault: string;
};

function FieldLine({
  label,
  name,
  defaultValue,
  placeholder,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  placeholder?: string;
}) {
  return (
    <label className="grid grid-cols-[120px_1fr] items-center gap-3 text-sm">
      <span className="font-medium">{label}</span>
      <input
        name={name}
        defaultValue={defaultValue ?? ""}
        placeholder={placeholder}
        className="border-b border-black bg-transparent px-1 py-1 outline-none"
      />
    </label>
  );
}

export default function PrivacyAgreementClient(props: PrivacyAgreementClientProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const signatureInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState("");
  const [hasSignature, setHasSignature] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const drawingRef = useRef(false);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ratio = Math.max(1, Math.floor(window.devicePixelRatio || 1));
    const width = canvas.clientWidth || 640;
    const height = canvas.clientHeight || 170;
    canvas.width = width * ratio;
    canvas.height = height * ratio;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.scale(ratio, ratio);
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, width, height);
    ctx.strokeStyle = "#111";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
  }, []);

  function getPosition(event: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }

  function handlePointerDown(event: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    drawingRef.current = true;
    lastPointRef.current = getPosition(event);
    canvas.setPointerCapture(event.pointerId);
  }

  function handlePointerMove(event: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawingRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const from = lastPointRef.current ?? getPosition(event);
    const to = getPosition(event);

    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.stroke();

    lastPointRef.current = to;
    if (!hasSignature) setHasSignature(true);
  }

  function handlePointerUp(event: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    drawingRef.current = false;
    lastPointRef.current = null;
    if (canvas?.hasPointerCapture(event.pointerId)) {
      canvas.releasePointerCapture(event.pointerId);
    }
  }

  function clearSignature() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, canvas.clientWidth, canvas.clientHeight);
    setHasSignature(false);
    setError("");
  }

  function printAgreement() {
    window.print();
  }

  function submitSigned() {
    const form = formRef.current;
    const canvas = canvasRef.current;
    if (!form || !canvas) return;

    if (!accepted) {
      setError("Bitte Zustimmung aktivieren.");
      return;
    }
    if (!hasSignature) {
      setError("Bitte zuerst unterschreiben.");
      return;
    }

    if (signatureInputRef.current) {
      signatureInputRef.current.value = canvas.toDataURL("image/png");
    }
    setError("");
    form.requestSubmit();
  }

  return (
    <>
      <style jsx global>{`
        @media print {
          .no-print {
            display: none !important;
          }
          body {
            background: #fff !important;
          }
          .print-sheet {
            box-shadow: none !important;
            border: 0 !important;
            margin: 0 !important;
          }
        }
      `}</style>

      <form ref={formRef} action={saveSignedPrivacyAgreement} className="space-y-4">
        <input type="hidden" name="customerId" value={props.customerId} />
        <input type="hidden" name="signatureDataUrl" ref={signatureInputRef} />
        <input type="hidden" name="companyName" value={props.company.name} />
        <input type="hidden" name="companyOwner" value={props.company.ownerName} />
        <input type="hidden" name="companyStreet" value={props.company.street} />
        <input type="hidden" name="companyZip" value={props.company.zip} />
        <input type="hidden" name="companyCity" value={props.company.city} />
        <input type="hidden" name="companyPhone" value={props.company.phone} />
        <input type="hidden" name="companyEmail" value={props.company.email} />
        <input type="hidden" name="companyLogoDataUrl" value={props.company.logoDataUrl} />

        <div className="no-print rounded border border-slate-700 bg-slate-900/70 p-3 text-sm text-slate-300">
          Dieses Formular ist druckbar und kann auch direkt online unterschrieben werden.
        </div>

        <div className="print-sheet rounded border border-slate-700 bg-white p-6 text-black shadow">
          <div className="mb-5 flex items-start justify-between gap-4">
            <div className="text-lg leading-7">
              <div className="font-semibold">{props.company.name || "Unternehmen"}</div>
              <div>{props.company.street || "-"}</div>
              <div>
                {[props.company.zip, props.company.city].filter(Boolean).join(" ") || "-"}
              </div>
              {props.company.phone ? <div>Tel: {props.company.phone}</div> : null}
              {props.company.email ? <div>E-Mail: {props.company.email}</div> : null}
            </div>

            <div className="text-right">
              {props.company.logoDataUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={props.company.logoDataUrl}
                  alt="Firmenlogo"
                  className="ml-auto max-h-24 max-w-[220px] object-contain"
                />
              ) : null}
              <div className="mt-1 text-lg tracking-wide">{props.company.name}</div>
            </div>
          </div>

          <h1 className="mb-2 text-4xl font-bold underline underline-offset-4">
            Datenschutzerklaerung / Einverstaendniserklaerung Nutzung von Fotos
          </h1>
          <p className="mb-5 text-center text-3xl font-semibold text-red-700">
            Bitte leserlich und in Druckschrift schreiben
          </p>

          <p className="mb-3 text-xl font-semibold">Persoenliche Informationen:</p>

          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-4">
              <FieldLine label="Vorname:" name="firstName" defaultValue={props.customer.firstName} />
              <FieldLine label="Nachname:" name="lastName" defaultValue={props.customer.lastName} />
            </div>
            <FieldLine
              label="Unternehmen:"
              name="customerCompany"
              defaultValue={props.customer.company}
            />
            <div className="grid grid-cols-2 gap-4">
              <FieldLine label="Strasse, Nr.:" name="street" defaultValue={props.customer.street} />
              <FieldLine label="PLZ, Ort:" name="zipCity" defaultValue={props.customer.zipCity} />
            </div>
            <FieldLine label="E-Mail:" name="email" defaultValue={props.customer.email} />
            <FieldLine label="Telefon:" name="phone" defaultValue={props.customer.phone} />
            <div className="grid grid-cols-2 gap-4">
              <FieldLine label="Fahrzeug:" name="vehicle" defaultValue={props.customer.vehicle} />
              <FieldLine label="Kennzeichen:" name="plate" defaultValue={props.customer.plate} />
            </div>
          </div>

          <div className="mt-8 text-center">
            <h2 className="text-xl font-bold">
              Einverstaendniserklaerung zur Nutzung von Fotos des Fahrzeugs
            </h2>
            <p className="mx-auto mt-2 max-w-[980px] text-sm leading-relaxed">
              Ich gewaehre dem oben genannten Unternehmen hiermit das uneingeschraenkte und
              unwiderrufliche Recht sowie die Erlaubnis, Fotos zu erstellen, zu dokumentieren, zu
              veroeffentlichen und fuer Werbezwecke zu verwenden. Das Kennzeichen kann dabei auf Wunsch
              unkenntlich gemacht werden.
            </p>
          </div>

          <div className="mt-6 text-center">
            <h2 className="text-xl font-bold">Datenschutzerklaerung</h2>
          </div>
          <div className="mt-2 space-y-1 text-sm leading-relaxed">
            <p>
              <strong>1. Verantwortlicher:</strong> {props.company.name}, {props.company.ownerName || "-"},{" "}
              {props.company.street || "-"}, {[props.company.zip, props.company.city].filter(Boolean).join(" ") || "-"}
            </p>
            <p>
              <strong>2. Zweck:</strong> Datenverarbeitung zur Auftragsabwicklung, Kommunikation,
              Terminverwaltung, Rechnungsstellung und Erfuellung gesetzlicher Pflichten.
            </p>
            <p>
              <strong>3. Rechtsgrundlagen:</strong> Art. 6 Abs. 1 lit. b, c und f DSGVO.
            </p>
            <p>
              <strong>4. Speicherdauer:</strong> Speicherung nur so lange wie erforderlich bzw. gesetzlich
              vorgeschrieben.
            </p>
            <p>
              <strong>5. Ihre Rechte:</strong> Auskunft, Berichtigung, Loeschung, Einschraenkung,
              Datenuebertragbarkeit und Widerspruch gemaess DSGVO.
            </p>
            <p>
              <strong>6. Kontakt:</strong> {props.company.email || "-"}
              {props.company.phone ? `, ${props.company.phone}` : ""}
            </p>
          </div>

          <div className="mt-10">
            <label className="flex items-center gap-3 text-lg">
              <input
                type="checkbox"
                name="accepted"
                checked={accepted}
                onChange={(event) => setAccepted(event.target.checked)}
                className="h-6 w-6"
              />
              Ich habe die oben genannten Bedingungen gelesen und akzeptiert.
            </label>
          </div>

          <div className="mt-8 grid grid-cols-2 gap-5">
            <FieldLine
              label="Datum und Ort:"
              name="placeDate"
              defaultValue={props.placeDateDefault}
              placeholder="z. B. Bielefeld, 09.02.2026"
            />
            <div />
          </div>

          <div className="mt-6">
            <p className="mb-2 text-sm font-medium">Digitale Unterschrift (Kunde):</p>
            <canvas
              ref={canvasRef}
              className="h-[170px] w-full rounded border border-slate-500 bg-white touch-none"
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
            />
          </div>

          <div className="mt-2 text-sm">
            <span className="border-b border-black pb-1">Unterschrift des Fahrzeughalters / Fahrers</span>
          </div>
        </div>

        <div className="no-print flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={printAgreement}
            className="rounded bg-slate-800 px-4 py-2 text-sm font-semibold text-slate-100 hover:bg-slate-700"
          >
            Drucken / als PDF
          </button>
          <button
            type="button"
            onClick={clearSignature}
            className="rounded border border-slate-600 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800"
          >
            Unterschrift loeschen
          </button>
          <button
            type="button"
            onClick={submitSigned}
            className="rounded bg-cyan-600 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-500"
          >
            Online signieren & speichern
          </button>
        </div>

        {error ? (
          <div className="no-print rounded border border-red-500/50 bg-red-500/10 px-3 py-2 text-sm text-red-200">
            {error}
          </div>
        ) : null}
      </form>
    </>
  );
}
