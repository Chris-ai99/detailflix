export function eurosToCents(input: string): number {
  // erlaubt "60", "60.00", "60,00"
  const normalized = input.replace(",", ".").trim();
  const value = Number(normalized);
  if (Number.isNaN(value)) return 0;
  return Math.round(value * 100);
}

export function centsToEuros(cents: number): string {
  return (cents / 100).toFixed(2).replace(".", ",");
}

export const toCents = (eur: number) => Math.round((Number(eur) || 0) * 100);
export const fromCents = (cents: number) => (Number(cents) || 0) / 100;

export function computeLine({
  qty,
  unitNetCents,
  discountPct,
  vatRate,
}: {
  qty: number;
  unitNetCents: number;
  discountPct: number;
  vatRate: number;
}) {
  const raw = Math.round(qty * unitNetCents);
  const afterDiscount = Math.round(raw * (1 - (discountPct || 0) / 100));
  const vat = Math.round(afterDiscount * (vatRate || 0) / 100);
  const gross = afterDiscount + vat;
  return {
    lineNetCents: afterDiscount,
    lineVatCents: vat,
    lineGrossCents: gross,
  };
}

export function sumDoc(lines: {
  lineNetCents: number;
  lineVatCents: number;
  lineGrossCents: number;
}[]) {
  let net = 0, vat = 0, gross = 0;
  for (const l of lines) {
    net += l.lineNetCents || 0;
    vat += l.lineVatCents || 0;
    gross += l.lineGrossCents || 0;
  }
  return { netTotalCents: net, vatTotalCents: vat, grossTotalCents: gross };
}