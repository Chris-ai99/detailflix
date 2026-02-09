"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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
    postalCode: string;
    city: string;
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
    <label className="grid gap-1.5 text-base sm:grid-cols-[150px_1fr] sm:items-center sm:gap-3">
      <span className="font-medium text-black">{label}</span>
      <input
        name={name}
        defaultValue={defaultValue ?? ""}
        placeholder={placeholder}
        className="border-b border-black bg-transparent px-1 py-1.5 text-black outline-none ring-cyan-400 transition focus:ring-2"
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
  const companyName = props.company.name.trim() || "Unternehmen";
  const companyOwner = props.company.ownerName.trim();
  const companyStreet = props.company.street.trim();
  const companyZipCity = [props.company.zip, props.company.city]
    .map((value) => value.trim())
    .filter(Boolean)
    .join(" ");
  const companyEmail = props.company.email.trim();
  const companyPhone = props.company.phone.trim();

  const initializeCanvas = useCallback((preserveDrawing: boolean) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const previousDrawing =
      preserveDrawing && canvas.width > 0 && canvas.height > 0 ? canvas.toDataURL("image/png") : "";
    const ratio = Math.max(1, Math.floor(window.devicePixelRatio || 1));
    const width = Math.max(300, Math.floor(canvas.clientWidth || 520));
    const height = Math.max(115, Math.floor(canvas.clientHeight || 145));
    canvas.width = width * ratio;
    canvas.height = height * ratio;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(ratio, ratio);
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, width, height);
    ctx.strokeStyle = "#111";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    if (previousDrawing) {
      const image = new window.Image();
      image.onload = () => {
        ctx.drawImage(image, 0, 0, width, height);
      };
      image.src = previousDrawing;
    }
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    initializeCanvas(false);
    const observer = new ResizeObserver(() => {
      initializeCanvas(true);
    });
    observer.observe(canvas);

    return () => observer.disconnect();
  }, [initializeCanvas]);

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
    initializeCanvas(false);
    setHasSignature(false);
    setError("");
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
          @page {
            size: A4;
            margin: 8mm;
          }
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
            page-break-inside: avoid !important;
          }
        }
      `}</style>

      <form ref={formRef} action={saveSignedPrivacyAgreement} className="mx-auto max-w-6xl space-y-4">
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

        <div className="no-print rounded-lg border border-slate-700 bg-slate-900/70 p-3 text-sm text-slate-300">
          Dieses Formular ist druckbar und kann auch direkt online unterschrieben werden.
        </div>

        <div className="print-sheet min-h-[248mm] rounded-xl border border-slate-300 bg-[#f5f5f5] px-4 py-4 text-black shadow sm:px-6 sm:py-5">
          <div>
            <div className="mb-5 flex flex-col items-start justify-between gap-4 sm:flex-row">
              <div className="text-lg leading-7">
                <div className="font-semibold">{companyName}</div>
                <div>{companyStreet || "-"}</div>
                <div>{companyZipCity || "-"}</div>
                {companyPhone ? <div>Tel: {companyPhone}</div> : null}
                {companyEmail ? <div>E-Mail: {companyEmail}</div> : null}
              </div>

              <div className="w-full text-left sm:w-auto sm:text-right">
                {props.company.logoDataUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={props.company.logoDataUrl}
                    alt="Firmenlogo"
                    className="max-h-20 max-w-[180px] object-contain sm:ml-auto sm:max-h-24 sm:max-w-[220px]"
                  />
                ) : null}
                <div className="mt-1 text-base tracking-[0.18em] text-slate-600 sm:text-2xl">{companyName}</div>
              </div>
            </div>

            <p className="mb-4 text-4xl font-bold leading-tight">Persönliche Informationen:</p>

            <div className="space-y-3 pt-1">
              <div className="grid gap-4 sm:grid-cols-2 sm:gap-5">
                <FieldLine label="Vorname:" name="firstName" defaultValue={props.customer.firstName} />
                <FieldLine label="Nachname:" name="lastName" defaultValue={props.customer.lastName} />
              </div>
              <FieldLine
                label="Unternehmen:"
                name="customerCompany"
                defaultValue={props.customer.company}
              />
              <div className="grid gap-4 sm:grid-cols-2 sm:gap-5">
                <FieldLine label="Straße, Nr.:" name="street" defaultValue={props.customer.street} />
                <FieldLine label="Postleitzahl:" name="postalCode" defaultValue={props.customer.postalCode} />
              </div>
              <FieldLine label="Stadt:" name="city" defaultValue={props.customer.city} />
              <FieldLine label="E-Mail:" name="email" defaultValue={props.customer.email} />
              <FieldLine label="Telefon:" name="phone" defaultValue={props.customer.phone} />
              <div className="grid gap-4 sm:grid-cols-2 sm:gap-5">
                <FieldLine label="Fahrzeug:" name="vehicle" defaultValue={props.customer.vehicle} />
                <FieldLine label="Kennzeichen:" name="plate" defaultValue={props.customer.plate} />
              </div>
            </div>

            <div className="mt-5 rounded border-2 border-emerald-700 px-4 py-4">
              <h2 className="text-center text-[15px] font-bold">
                Einverständniserklärung zur Nutzung von Fotos des Fahrzeugs:
              </h2>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-[13px] leading-[1.55]">
                <li>
                  Ich gewähre {companyName} das uneingeschränkte und unwiderrufliche Recht und die
                  Erlaubnis, Fotos meines Fahrzeugs zu erstellen und für Dokumentation, Präsentation und
                  Werbung zu verwenden.
                </li>
                <li>Das Kennzeichen kann auf Wunsch unkenntlich gemacht werden.</li>
                <li>
                  Ich bin einverstanden, dass Bilder in Print- und Online-Publikationen, auf Webseiten und
                  in sozialen Medien verwendet werden dürfen.
                </li>
                <li>
                  Ich verzichte auf gesonderte Vergütung für die Nutzung dieser Fotoaufnahmen.
                </li>
              </ul>

              <h2 className="mt-3 text-center text-[15px] font-bold">Datenschutzerklärung:</h2>
              <ul className="mt-2 space-y-1.5 text-[12px] leading-[1.48]">
                <li>
                  <strong>1. Verantwortlicher:</strong> {companyName}
                  {companyOwner ? `, Inhaber ${companyOwner}` : ""}
                  {companyStreet ? `, ${companyStreet}` : ""}
                  {companyZipCity ? `, ${companyZipCity}` : ""}
                </li>
                <li>
                  <strong>2. Verarbeitete Daten:</strong> Name, Anschrift, Telefonnummer, E-Mail-Adresse
                  und Fahrzeugdaten.
                </li>
                <li>
                  <strong>3. Zweck der Datenverarbeitung:</strong> Werkstattleistungen, Terminplanung,
                  Kundenkommunikation, Rechnungsstellung und Zahlungsabwicklung.
                </li>
                <li>
                  <strong>4. Kontakt/Newsletter-Einwilligung:</strong> Ich willige ein, dass mich {companyName}{" "}
                  per E-Mail, Telefon oder Messenger zu Rückfragen, Servicehinweisen, Angeboten und einem
                  Newsletter kontaktieren darf. Diese Einwilligung kann ich jederzeit mit Wirkung für die
                  Zukunft widerrufen.
                </li>
                <li>
                  <strong>5. Rechtsgrundlagen:</strong> Art. 6 Abs. 1 lit. b, c, f DSGVO sowie lit. a DSGVO
                  für Kontakt/Newsletter.
                </li>
                <li>
                  <strong>6. Weitergabe/Speicherung:</strong> Weitergabe nur wenn nötig oder gesetzlich
                  vorgeschrieben. Speicherung nur solange erforderlich.
                </li>
                <li>
                  <strong>7. Ihre Rechte:</strong> Auskunft, Berichtigung, Löschung, Einschränkung,
                  Datenübertragbarkeit und Widerspruch.
                </li>
                <li>
                  <strong>8. Kontakt:</strong> {companyName}
                  {companyOwner ? `, ${companyOwner}` : ""}
                  {companyStreet ? `, ${companyStreet}` : ""}
                  {companyZipCity ? `, ${companyZipCity}` : ""}
                  {companyEmail ? `, ${companyEmail}` : ""}
                  {companyPhone ? `, ${companyPhone}` : ""}
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-4">
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2.5 text-lg font-medium">
                <input
                  type="checkbox"
                  name="accepted"
                  checked={accepted}
                  onChange={(event) => setAccepted(event.target.checked)}
                  className="h-5 w-5"
                />
                Ich habe die Bedingungen gelesen und akzeptiert, inkl. Kontakt/Newsletter-Einwilligung.
              </label>
            </div>

            <div className="mt-3 grid gap-3 sm:max-w-xl sm:grid-cols-2 sm:gap-4">
              <FieldLine
                label="Datum und Ort:"
                name="placeDate"
                defaultValue={props.placeDateDefault}
                placeholder="z. B. Bielefeld, 09.02.2026"
              />
              <div />
            </div>

            <div className="mt-3">
              <p className="mb-2 text-sm font-medium">Digitale Unterschrift (Kunde):</p>
              <div className="max-w-[520px]">
                <canvas
                  ref={canvasRef}
                  className="h-[135px] w-full rounded-md border border-slate-400 bg-white touch-none sm:h-[145px]"
                  onPointerDown={handlePointerDown}
                  onPointerMove={handlePointerMove}
                  onPointerUp={handlePointerUp}
                  onPointerCancel={handlePointerUp}
                />
              </div>
              <p className="mt-2 text-xs text-slate-600">
                Das Unterschriftsfeld passt sich automatisch der Bildschirmbreite an.
              </p>
            </div>

            <div className="mt-1 text-xs">
              <span className="border-b border-black pb-1">Unterschrift des Fahrzeughalters / Fahrers</span>
            </div>
          </div>
        </div>

        <div className="no-print flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={clearSignature}
            className="rounded border border-slate-600 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800"
          >
            Unterschrift löschen
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
