"use client";

import { useRef } from "react";

type ConvertWorkCardToInvoiceButtonProps = {
  action: (formData: FormData) => void | Promise<void>;
  cardId: string;
  redirectTo: string;
  label: string;
  className: string;
  companyHourlyRateCents: number;
  customerHourlyRateCents?: number | null;
};

function centsToEuroDisplay(cents: number): string {
  const safe = Math.max(1, Math.round(Number(cents) || 0));
  return (safe / 100).toFixed(2).replace(".", ",");
}

function euroInputToCents(value: string): number | null {
  const normalized = String(value ?? "")
    .trim()
    .replace(/\s+/g, "")
    .replace(",", ".");
  if (!normalized) return null;
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  const cents = Math.round(parsed * 100);
  if (cents <= 0) return null;
  return cents;
}

export default function ConvertWorkCardToInvoiceButton({
  action,
  cardId,
  redirectTo,
  label,
  className,
  companyHourlyRateCents,
  customerHourlyRateCents,
}: ConvertWorkCardToInvoiceButtonProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const hourlyRateRef = useRef<HTMLInputElement>(null);

  const hasCustomerRate = Number(customerHourlyRateCents ?? 0) > 0;
  const effectiveDefaultCents = hasCustomerRate
    ? Math.round(customerHourlyRateCents as number)
    : Math.max(1, Math.round(companyHourlyRateCents || 0));

  return (
    <form ref={formRef} action={action}>
      <input type="hidden" name="cardId" value={cardId} />
      <input type="hidden" name="redirectTo" value={redirectTo} />
      <input ref={hourlyRateRef} type="hidden" name="hourlyRateCents" value={effectiveDefaultCents} />

      <button
        type="button"
        className={className}
        onClick={() => {
          const defaultInput = centsToEuroDisplay(effectiveDefaultCents);
          const customerHint = hasCustomerRate
            ? `Kundensatz: ${centsToEuroDisplay(customerHourlyRateCents as number)} EUR/h netto.`
            : `Kein Kundensatz hinterlegt. Standard: ${centsToEuroDisplay(companyHourlyRateCents)} EUR/h netto.`;
          const answer = window.prompt(
            `Mit welchem Stundenverrechnungssatz soll abgerechnet werden?\n${customerHint}\nBitte EUR pro Stunde (netto) eingeben:`,
            defaultInput
          );
          if (answer === null) return;

          const cents = euroInputToCents(answer);
          if (!cents) {
            window.alert("Bitte einen g\u00fcltigen Stundenverrechnungssatz eingeben (z. B. 60,00).");
            return;
          }
          if (hourlyRateRef.current) {
            hourlyRateRef.current.value = String(cents);
          }
          formRef.current?.requestSubmit();
        }}
      >
        {label}
      </button>
    </form>
  );
}
