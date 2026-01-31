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