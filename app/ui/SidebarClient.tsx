"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

type CountKey =
  | "orders"
  | "invoices"
  | "offers"
  | "customers"
  | "services"
  | "vehiclesCustomer"
  | "vehiclesForSale"
  | "vehiclesArchive"
  | "vehiclesTotal"
  | "creditNotes"
  | "stornos";

type SidebarCounts = Record<CountKey, number>;

type MenuRowProps = {
  label: string;
  icon:
    | "bolt"
    | "receipt"
    | "tag"
    | "grid"
    | "users"
    | "tool"
    | "calendar"
    | "car"
    | "chip"
    | "bell"
    | "briefcase"
    | "gear";
  count?: number;
  href?: string;
  placeholder?: boolean;
  onToggle?: () => void;
  isOpen?: boolean;
  className?: string;
};

function Icon({ name }: { name: MenuRowProps["icon"] }) {
  const common = "h-4 w-4";
  switch (name) {
    case "bolt":
      return (
        <svg viewBox="0 0 20 20" className={common} fill="currentColor" aria-hidden="true">
          <path d="M11 1 3 11h5l-1 8 8-10h-5l1-8Z" />
        </svg>
      );
    case "receipt":
      return (
        <svg viewBox="0 0 20 20" className={common} fill="currentColor" aria-hidden="true">
          <path d="M5 2h10a1 1 0 0 1 1 1v15l-2-1-2 1-2-1-2 1-2-1-2 1V3a1 1 0 0 1 1-1Z" />
        </svg>
      );
    case "tag":
      return (
        <svg viewBox="0 0 20 20" className={common} fill="currentColor" aria-hidden="true">
          <path d="M2 10l8 8 8-8-8-8H4a2 2 0 0 0-2 2v6Z" />
        </svg>
      );
    case "users":
      return (
        <svg viewBox="0 0 20 20" className={common} fill="currentColor" aria-hidden="true">
          <path d="M7 10a3 3 0 1 0-3-3 3 3 0 0 0 3 3Zm6 0a3 3 0 1 0-3-3 3 3 0 0 0 3 3ZM2 17a4 4 0 0 1 8 0ZM10 17a4 4 0 0 1 8 0Z" />
        </svg>
      );
    case "tool":
      return (
        <svg viewBox="0 0 20 20" className={common} fill="currentColor" aria-hidden="true">
          <path d="M2 3h6v2H4v10h4v2H2V3Zm10-1 3 3-2 2 3 3-2 2-3-3-2 2-3-3 2-2-3-3 2-2 3 3 2-2Z" />
        </svg>
      );
    case "calendar":
      return (
        <svg viewBox="0 0 20 20" className={common} fill="currentColor" aria-hidden="true">
          <path d="M6 2a1 1 0 1 1 2 0v1h4V2a1 1 0 1 1 2 0v1h2a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h2V2a1 1 0 1 1 2 0v1Zm10 5H4v9h12V7Z" />
        </svg>
      );
    case "grid":
      return (
        <svg viewBox="0 0 20 20" className={common} fill="currentColor" aria-hidden="true">
          <path d="M2 2h6v6H2V2Zm10 0h6v6h-6V2ZM2 12h6v6H2v-6Zm10 0h6v6h-6v-6Z" />
        </svg>
      );
    case "car":
      return (
        <svg viewBox="0 0 20 20" className={common} fill="currentColor" aria-hidden="true">
          <path d="M3 11l1-3a2 2 0 0 1 2-1h8a2 2 0 0 1 2 1l1 3v5h-2v-2H5v2H3v-5Zm3 0h8l-.6-1.8a1 1 0 0 0-1-.7H7.6a1 1 0 0 0-1 .7L6 11Z" />
        </svg>
      );
    case "chip":
      return (
        <svg viewBox="0 0 20 20" className={common} fill="currentColor" aria-hidden="true">
          <path d="M7 2h6v2h2v6h-2v2H7v-2H5V4h2V2Zm2 4v4h2V6H9Z" />
        </svg>
      );
    case "bell":
      return (
        <svg viewBox="0 0 20 20" className={common} fill="currentColor" aria-hidden="true">
          <path d="M10 2a4 4 0 0 1 4 4v2.5l1.5 3V13H4.5v-1.5l1.5-3V6a4 4 0 0 1 4-4Zm0 16a2 2 0 0 0 2-2H8a2 2 0 0 0 2 2Z" />
        </svg>
      );
    case "briefcase":
      return (
        <svg viewBox="0 0 20 20" className={common} fill="currentColor" aria-hidden="true">
          <path d="M7 3a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v1h4a1 1 0 0 1 1 1v4a3 3 0 0 1-3 3H5a3 3 0 0 1-3-3V5a1 1 0 0 1 1-1h4V3Zm2-1v2h2V2H9Z" />
        </svg>
      );
    case "gear":
      return (
        <svg viewBox="0 0 20 20" className={common} fill="currentColor" aria-hidden="true">
          <path d="M9.87 1.5a1 1 0 0 1 .97.76l.23.94a6.64 6.64 0 0 1 1.3.76l.9-.38a1 1 0 0 1 1.25.46l.95 1.65a1 1 0 0 1-.25 1.3l-.76.62c.06.35.09.7.09 1.06s-.03.71-.09 1.06l.76.62a1 1 0 0 1 .25 1.3l-.95 1.65a1 1 0 0 1-1.25.46l-.9-.38a6.64 6.64 0 0 1-1.3.76l-.23.94a1 1 0 0 1-.97.76H8.13a1 1 0 0 1-.97-.76l-.23-.94a6.64 6.64 0 0 1-1.3-.76l-.9.38a1 1 0 0 1-1.25-.46l-.95-1.65a1 1 0 0 1 .25-1.3l.76-.62A6.9 6.9 0 0 1 3.5 10c0-.36.03-.71.09-1.06l-.76-.62a1 1 0 0 1-.25-1.3l.95-1.65a1 1 0 0 1 1.25-.46l.9.38c.4-.31.83-.57 1.3-.76l.23-.94A1 1 0 0 1 8.13 1.5h1.74Zm.13 5.25a3.25 3.25 0 1 0 0 6.5 3.25 3.25 0 0 0 0-6.5Z" />
        </svg>
      );
    default:
      return null;
  }
}

function MenuRow({
  label,
  icon,
  count,
  href,
  placeholder,
  onToggle,
  className,
}: MenuRowProps) {
  const body = (
    <div
      className={`flex items-center justify-between rounded px-3 py-2 text-sm transition ${
        placeholder ? "opacity-70" : "hover:bg-slate-700/60"
      } ${className ?? ""}`}
    >
      <div className="flex items-center gap-2 text-slate-200">
        <span className="text-slate-400">
          <Icon name={icon} />
        </span>
        <span>{label}</span>
      </div>
      <div className="flex items-center gap-2">
        {typeof count === "number" ? (
          <span className="rounded bg-slate-800/80 px-2 py-0.5 text-xs text-slate-300">
            {count}
          </span>
        ) : null}
      </div>
    </div>
  );

  if (onToggle) {
    return (
      <button type="button" onClick={onToggle} className="w-full text-left">
        {body}
      </button>
    );
  }

  if (placeholder) {
    return <div className="cursor-not-allowed">{body}</div>;
  }

  if (!href) return body;
  return <Link href={href}>{body}</Link>;
}

function formatClock(date: Date) {
  const datePart = date.toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
  const timePart = date.toLocaleTimeString("de-DE", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  return `${datePart}, ${timePart}`;
}

function formatDuration(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  return {
    hours: String(hours).padStart(2, "0"),
    minutes: String(minutes).padStart(2, "0"),
    seconds: String(seconds).padStart(2, "0"),
  };
}

export default function SidebarClient({ counts }: { counts: SidebarCounts }) {
  const [now, setNow] = useState<Date | null>(null);
  const [mounted, setMounted] = useState(false);
  const [timeOpen, setTimeOpen] = useState(false);
  const [tracking, setTracking] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [invoicesOpen, setInvoicesOpen] = useState(false);
  const [comingSoonOpen, setComingSoonOpen] = useState(false);
  const [vehiclesSalesOpen, setVehiclesSalesOpen] = useState(false);

  const vehiclesSalesTotal = counts.vehiclesForSale + counts.vehiclesArchive;

  useEffect(() => {
    setMounted(true);
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const totalMs = useMemo(() => {
    if (!tracking || startedAt === null || !now) return elapsedMs;
    return elapsedMs + (now.getTime() - startedAt);
  }, [elapsedMs, tracking, startedAt, now]);

  const duration = useMemo(() => formatDuration(totalMs), [totalMs]);

  return (
    <aside className="w-64 bg-slate-800 min-h-screen border-r border-slate-700/60 flex flex-col">
      <div className="p-4">
        <div className="flex items-center">
          <img src="/detailix-wordmark.svg" alt="Autosello" className="h-6 w-auto" />
        </div>
      </div>

      <div className="px-4 pb-4">
        <div className="flex items-center justify-between text-base font-semibold text-slate-300">
          <div className="font-mono" suppressHydrationWarning>
            {mounted && now ? formatClock(now) : "\u2014"}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setTimeOpen((v) => !v)}
              className="h-6 w-6 rounded-full bg-slate-700 text-xs text-slate-200 transition hover:bg-slate-600"
              aria-label="Zeiterfassung ein- oder ausklappen"
              aria-expanded={timeOpen}
            >
              {timeOpen ? "-" : "+"}
            </button>
            <span className="h-2.5 w-2.5 rounded-full bg-slate-500" />
          </div>
        </div>

        {timeOpen && (
          <>
            <div className="mt-4 grid grid-cols-3 gap-4 text-center">
              {[
                { label: "Stunden", value: duration.hours },
                { label: "Minuten", value: duration.minutes },
                { label: "Sekunden", value: duration.seconds },
              ].map((t) => (
                <div key={t.label}>
                  <div className="rounded-full border border-slate-600/80 bg-slate-900/80 px-4 py-4 text-2xl font-semibold tracking-widest shadow-sm transition-all duration-200 font-mono">
                    {t.value}
                  </div>
                  <div className="mt-1 text-[11px] text-slate-400">{t.label}</div>
                </div>
              ))}
            </div>

            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={() => {
                  if (tracking || !now) return;
                  setTracking(true);
                  setStartedAt(now.getTime());
                }}
                className="flex-1 rounded bg-emerald-500/90 px-2 py-1 text-xs font-semibold text-slate-900"
              >
                Kommen
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!tracking || startedAt === null || !now) return;
                  setElapsedMs((prev) => prev + (now.getTime() - startedAt));
                  setStartedAt(null);
                  setTracking(false);
                }}
                className="flex-1 rounded bg-slate-700 px-2 py-1 text-xs text-slate-200"
              >
                Gehen
              </button>
            </div>
          </>
        )}
      </div>
      <nav className="flex flex-col gap-1 px-2 text-slate-200">
        <Link href="/dashboard" className="rounded px-3 py-2 text-sm hover:bg-slate-700/60">
          Dashboard
        </Link>

        <div className="mt-1 border-t border-slate-700/60 pt-2" />

        <MenuRow label="Kunden anlegen" icon="users" href="/customers" count={counts.customers} />
        <MenuRow
          label="Angebot erstellen"
          icon="tag"
          href="/offers"
          count={counts.offers}
        />
        <MenuRow label="Auftrag erstellen" icon="bolt" href="/orders" count={counts.orders} />
        <MenuRow label="Termin erstellen" icon="calendar" placeholder />
        <MenuRow
          label="Rechnungen"
          icon="receipt"
          count={counts.invoices}
          onToggle={() => setInvoicesOpen((v) => !v)}
          isOpen={invoicesOpen}
        />
        {invoicesOpen && (
          <div className="space-y-1">
            <MenuRow
              label="Rechnung erstellen"
              icon="receipt"
              href="/invoices/new"
              className="pl-8 text-xs"
            />
            <MenuRow
              label="Rechnungen"
              icon="receipt"
              href="/invoices"
              count={counts.invoices}
              className="pl-8 text-xs"
            />
            <MenuRow
              label="Gutschriften"
              icon="receipt"
              href="/credit-notes"
              count={counts.creditNotes}
              className="pl-8 text-xs"
            />
            <MenuRow
              label="Stornos"
              icon="receipt"
              href="/stornos"
              count={counts.stornos}
              className="pl-8 text-xs"
            />
          </div>
        )}
        <MenuRow label="Leistungen" icon="tool" href="/services" count={counts.services} />

        <div className="mt-1 border-t border-slate-700/60 pt-2" />

        <MenuRow
          label="Coming Soon"
          icon="chip"
          onToggle={() => {
            setComingSoonOpen((v) => {
              const next = !v;
              if (!next) setVehiclesSalesOpen(false);
              return next;
            });
          }}
          isOpen={comingSoonOpen}
        />
        {comingSoonOpen && (
          <div className="space-y-1">
            <MenuRow
              label="E-Rechnung Mailbox"
              icon="receipt"
              placeholder
              className="pl-8 text-xs"
            />
            <MenuRow
              label="Fahrzeuge Kunden"
              icon="car"
              href="/vehicles"
              count={counts.vehiclesCustomer}
              className="pl-8 text-xs"
            />
            <MenuRow
              label="Fahrzeug Verkauf"
              icon="car"
              count={vehiclesSalesTotal}
              onToggle={() => setVehiclesSalesOpen((v) => !v)}
              isOpen={vehiclesSalesOpen}
              className="pl-8 text-xs"
            />
            {vehiclesSalesOpen && (
              <div className="space-y-1">
                <MenuRow
                  label="Fahrzeuge Verkauf"
                  icon="car"
                  href="/vehicles/for-sale"
                  count={counts.vehiclesForSale}
                  className="pl-12 text-xs"
                />
                <MenuRow
                  label="Fahrzeuge Archiv"
                  icon="car"
                  href="/vehicles/archive"
                  count={counts.vehiclesArchive}
                  className="pl-12 text-xs"
                />
              </div>
            )}
            <MenuRow label="Dellenkalkulation" icon="grid" placeholder className="pl-8 text-xs" />
            <MenuRow label="Mitarbeiter" icon="users" placeholder className="pl-8 text-xs" />
            <MenuRow label="Geraetemiete" icon="briefcase" placeholder className="pl-8 text-xs" />
            <MenuRow label="APPs" icon="chip" placeholder className="pl-8 text-xs" />
            <MenuRow label="Updates" icon="bell" placeholder className="pl-8 text-xs" />
          </div>
        )}

        <MenuRow label="Einstellungen" icon="gear" href="/settings" />
      </nav>

      <div className="mt-auto px-4 py-4 text-xs text-slate-300">
        <div className="text-cyan-300">Hilfe &amp; Service</div>
        <a
          href="/api/auth/logout"
          className="mt-3 inline-flex rounded border border-slate-600 px-2 py-1 text-slate-200 transition hover:bg-slate-700/60"
        >
          Abmelden
        </a>
      </div>
    </aside>
  );
}
