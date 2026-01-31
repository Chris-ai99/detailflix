export function hhmmToMinutes(input: string): number {
  // erwartet "HH:MM" (z.B. "05:00")
  const val = input.trim();
  const m = /^(\d{1,3}):([0-5]\d)$/.exec(val);
  if (!m) return 0;
  const hours = Number(m[1]);
  const mins = Number(m[2]);
  return hours * 60 + mins;
}

export function minutesToHHMM(totalMinutes: number): string {
  const m = Math.max(0, Math.round(totalMinutes));
  const hours = Math.floor(m / 60);
  const mins = m % 60;
  return String(hours).padStart(2, "0") + ":" + String(mins).padStart(2, "0");
}