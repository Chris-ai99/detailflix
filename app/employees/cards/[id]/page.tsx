import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSessionFromCookies } from "@/lib/auth";
import { listMemberUsersInWorkspace } from "@/lib/auth-db";
import { ensureWorkspaceDatabase } from "@/lib/tenant-db";
import {
  closeEmployeeWorkCard,
  createInvoiceFromEmployeeWorkCard,
  reopenEmployeeWorkCard,
  startEmployeeWorkStep,
  stopEmployeeWorkStep,
} from "../../serverActions";
import ConvertWorkCardToInvoiceButton from "../../ui/ConvertWorkCardToInvoiceButton";

const PLAN_STEP_OPTIONS = ["Innen", "Au\u00dfen", "Polieren", "Sonstiges"] as const;
type PlanStepName = (typeof PLAN_STEP_OPTIONS)[number];

type EmployeeCardDetailPageProps = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ back?: string }>;
};

function getEmployeeLabel(account: { username: string; fullName: string | null }): string {
  const fullName = String(account.fullName ?? "").trim();
  if (fullName) return `${fullName} (${account.username})`;
  return account.username;
}

function safeBackPath(path?: string): string {
  const value = String(path ?? "").trim();
  if (!value) return "/employees?module=cards&view=employee";
  if (!value.startsWith("/") || value.startsWith("//")) return "/employees?module=cards&view=employee";
  return value;
}

function formatDate(value?: Date | string | null) {
  if (!value) return "\u2014";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "\u2014";
  return date.toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatDateTime(value?: Date | string | null) {
  if (!value) return "\u2014";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "\u2014";
  return date.toLocaleString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDuration(totalSeconds: number) {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const seconds = safe % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(
    seconds
  ).padStart(2, "0")}`;
}

function parseStoredPlannedSteps(value?: string | null): PlanStepName[] {
  const raw = String(value ?? "").trim();
  if (!raw) return [];

  const seen = new Set<PlanStepName>();
  const planned: PlanStepName[] = [];
  for (const token of raw.split("|")) {
    const normalized = token.trim();
    let mapped: PlanStepName | null = null;
    if (normalized === "Innen") mapped = "Innen";
    if (normalized === "Au\u00dfen" || normalized === "Aussen") mapped = "Au\u00dfen";
    if (normalized === "Polieren") mapped = "Polieren";
    if (normalized === "Sonstiges") mapped = "Sonstiges";
    if (!mapped || seen.has(mapped)) continue;
    seen.add(mapped);
    planned.push(mapped);
  }
  return planned;
}

function getPlanStepBadgeClass(stepName: PlanStepName): string {
  if (stepName === "Innen") return "border-sky-500/50 bg-sky-500/10 text-sky-200";
  if (stepName === "Au\u00dfen") return "border-emerald-500/50 bg-emerald-500/10 text-emerald-200";
  if (stepName === "Polieren") return "border-violet-500/50 bg-violet-500/10 text-violet-200";
  return "border-amber-500/50 bg-amber-500/10 text-amber-200";
}

function getPlanStepButtonClass(stepName: PlanStepName, isPlanned: boolean): string {
  const emphasis = isPlanned ? "ring-1 ring-cyan-300/60" : "";
  if (stepName === "Innen") {
    return `border-sky-500/70 bg-sky-500/15 text-sky-100 hover:bg-sky-500/25 ${emphasis}`.trim();
  }
  if (stepName === "Au\u00dfen") {
    return `border-emerald-500/70 bg-emerald-500/15 text-emerald-100 hover:bg-emerald-500/25 ${emphasis}`.trim();
  }
  if (stepName === "Polieren") {
    return `border-violet-500/70 bg-violet-500/15 text-violet-100 hover:bg-violet-500/25 ${emphasis}`.trim();
  }
  return `border-amber-500/70 bg-amber-500/15 text-amber-100 hover:bg-amber-500/25 ${emphasis}`.trim();
}

export default async function EmployeeCardDetailPage({
  params,
  searchParams,
}: EmployeeCardDetailPageProps) {
  const { id } = await params;
  const resolvedSearch = searchParams ? await searchParams : undefined;
  const backHref = safeBackPath(resolvedSearch?.back);
  const session = await getSessionFromCookies();
  if (session?.workspaceId) {
    ensureWorkspaceDatabase(session.workspaceId);
  }
  const card = await prisma.employeeWorkCard.findUnique({
    where: { id },
    include: {
      steps: {
        orderBy: { startedAt: "desc" },
      },
    },
  });

  if (!card) return notFound();
  const isOwner = session?.role === "OWNER";
  const canViewCard =
    isOwner ||
    (session?.userId
      ? card.assignedToUserId === session.userId ||
        (!card.assignedToUserId && card.createdByUserId === session.userId)
      : false);
  if (!canViewCard) return notFound();

  const [settings, customerRate] = await Promise.all([
    prisma.companySettings.findUnique({
      where: { id: "default" },
      select: { workCardHourlyRateCents: true },
    }),
    card.customerId
      ? prisma.customer.findUnique({
          where: { id: card.customerId },
          select: { hourlyRateCents: true },
        })
      : Promise.resolve(null),
  ]);
  const companyHourlyRateCents = Math.max(1, settings?.workCardHourlyRateCents ?? 6000);
  const customerHourlyRateCents = customerRate?.hourlyRateCents ?? null;

  const runningStep = card.steps.find((step) => !step.endedAt) ?? null;
  const totalSeconds = card.steps.reduce((sum, step) => sum + step.durationSeconds, 0);
  const canManageBilling = isOwner;
  const readyForBilling = card.status === "CLOSED" && !card.invoiceDocumentId && totalSeconds > 0;
  const plannedSteps = parseStoredPlannedSteps(card.plannedSteps);
  const plannedNote = card.plannedNote?.trim() || null;

  const vehicleLabel =
    [card.vehicleMake || "", card.vehicleModel || ""].join(" ").trim() ||
    card.licensePlate ||
    "Fahrzeug ohne Bezeichnung";
  const assignedMember =
    session?.workspaceId && card.assignedToUserId
      ? listMemberUsersInWorkspace(session.workspaceId).find(
          (member) => member.userId === card.assignedToUserId
        ) ?? null
      : null;
  const assignedToDisplay =
    assignedMember?.username
      ? getEmployeeLabel(assignedMember)
      : card.assignedToLabel?.trim() || null;

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-2 rounded border border-slate-800 bg-slate-900/50 px-4 py-3 text-xs text-slate-200 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-sm font-semibold">
          Arbeitskarte AK-{card.id.slice(-8).toUpperCase()}
        </div>
        <Link
          href={backHref}
          className="inline-flex items-center gap-2 rounded border border-slate-600 bg-slate-800 px-3 py-1 text-xs text-slate-200 hover:bg-slate-700"
        >
          {"Zur\u00fcck"}
        </Link>
      </div>

      <div className="grid gap-3 rounded border border-slate-800 bg-slate-800/60 p-4 md:grid-cols-3">
        <div>
          <div className="text-xs text-slate-400">Fahrzeug</div>
          <div className="mt-1 text-sm text-slate-100">{vehicleLabel}</div>
        </div>
        <div>
          <div className="text-xs text-slate-400">Kunde</div>
          <div className="mt-1 text-sm text-slate-100">{card.customerName || "\u2014"}</div>
        </div>
        <div>
          <div className="text-xs text-slate-400">Arbeitstag</div>
          <div className="mt-1 text-sm text-slate-100">{formatDate(card.workDate)}</div>
        </div>
        <div>
          <div className="text-xs text-slate-400">Zugewiesen an</div>
          <div className="mt-1 text-sm text-slate-100">{assignedToDisplay || "\u2014"}</div>
        </div>
        <div>
          <div className="text-xs text-slate-400">Erstellt von</div>
          <div className="mt-1 text-sm text-slate-100">{card.createdByEmail || "\u2014"}</div>
        </div>
        <div>
          <div className="text-xs text-slate-400">Plan-Reihenfolge</div>
          <div className="mt-1 text-sm text-slate-100">
            {card.planRank ? `#${card.planRank}` : "\u2014"}
          </div>
        </div>
        <div>
          <div className="text-xs text-slate-400">Geplante Schritte</div>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {(plannedSteps.length > 0 ? plannedSteps : PLAN_STEP_OPTIONS).map((stepName) => (
              <span
                key={`detail-plan-${stepName}`}
                className={`rounded border px-2 py-1 text-[11px] font-semibold ${getPlanStepBadgeClass(stepName)}`}
              >
                {stepName}
              </span>
            ))}
          </div>
        </div>
        <div>
          <div className="text-xs text-slate-400">Planhinweis</div>
          <div className="mt-1 text-sm text-slate-100">{plannedNote || "\u2014"}</div>
        </div>
        <div>
          <div className="text-xs text-slate-400">Status</div>
          <div className="mt-1 text-sm text-slate-100">
            {card.status === "OPEN"
              ? "Offen"
              : card.invoiceDocumentId
                ? "Abgerechnet"
                : readyForBilling
                  ? "Bereit zur Abrechnung"
                  : "Abgeschlossen"}
          </div>
        </div>
        <div>
          <div className="text-xs text-slate-400">Gesamtzeit</div>
          <div className="mt-1 text-sm font-semibold text-cyan-200">{formatDuration(totalSeconds)}</div>
        </div>
        <div>
          <div className="text-xs text-slate-400">Abrechnung</div>
          <div className="mt-1 text-sm text-slate-100">
            {card.invoiceDocumentId ? (
              <Link
                href={`/documents/${card.invoiceDocumentId}/edit`}
                className="text-cyan-300 hover:underline"
              >
                {"Rechnung \u00f6ffnen"}
              </Link>
            ) : readyForBilling ? (
              `bereit seit ${formatDateTime(card.billingReadyAt ?? card.closedAt ?? card.workDate)}`
            ) : (
              "\u2014"
            )}
          </div>
        </div>
      </div>

      {runningStep ? (
        <div className="rounded border border-emerald-500/40 bg-emerald-500/10 px-4 py-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-xs uppercase tracking-wide text-emerald-100/80">Aktiver Schritt</div>
              <div className="text-sm font-semibold text-emerald-100">{runningStep.name}</div>
              <div className="text-xs text-emerald-100/80">
                Start: {formatDateTime(runningStep.startedAt)}
              </div>
            </div>
            <form action={stopEmployeeWorkStep}>
              <input type="hidden" name="stepId" value={runningStep.id} />
              <button className="rounded bg-emerald-500 px-3 py-2 text-xs font-semibold text-slate-900 hover:bg-emerald-400">
                Schritt stoppen
              </button>
            </form>
          </div>
        </div>
      ) : null}

      {card.status === "OPEN" ? (
        <div className="rounded border border-slate-800 bg-slate-800/60 p-4">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <h2 className="text-sm font-semibold text-slate-100">Arbeitsschritt starten</h2>
            <span className="text-xs text-slate-400">
              Geplante Schritte sind markiert.
            </span>
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {PLAN_STEP_OPTIONS.map((stepName) => {
              const isPlanned = plannedSteps.includes(stepName);
              return (
                <form key={`quick-start-${stepName}`} action={startEmployeeWorkStep}>
                  <input type="hidden" name="cardId" value={card.id} />
                  <input type="hidden" name="stepName" value={stepName} />
                  <button
                    className={`w-full rounded border px-3 py-2 text-xs font-semibold transition ${getPlanStepButtonClass(stepName, isPlanned)}`}
                  >
                    {isPlanned ? `${stepName} (Plan)` : stepName}
                  </button>
                </form>
              );
            })}
          </div>
          <p className="mt-2 text-xs text-slate-400">
            {"Wenn bereits ein Schritt l\u00e4uft, wird dieser beim Start eines neuen Schritts automatisch beendet."}
          </p>
        </div>
      ) : null}

      <div className="rounded border border-slate-800 bg-slate-800/60 p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-100">Zeiterfassung</h2>
          <div className="flex items-center gap-2">
            {canManageBilling && readyForBilling ? (
              <ConvertWorkCardToInvoiceButton
                action={createInvoiceFromEmployeeWorkCard}
                cardId={card.id}
                redirectTo={backHref}
                companyHourlyRateCents={companyHourlyRateCents}
                customerHourlyRateCents={customerHourlyRateCents}
                label="In Rechnung umwandeln"
                className="rounded border border-cyan-500/60 bg-cyan-500/10 px-3 py-1 text-xs text-cyan-200 hover:bg-cyan-500/20"
              />
            ) : null}
            {card.status === "OPEN" ? (
              <form action={closeEmployeeWorkCard}>
                <input type="hidden" name="cardId" value={card.id} />
                <button className="rounded border border-amber-500/60 bg-amber-500/10 px-3 py-1 text-xs text-amber-200 hover:bg-amber-500/20">
                  {"Karte abschlie\u00dfen"}
                </button>
              </form>
            ) : card.invoiceDocumentId ? (
              <span className="rounded border border-slate-700 bg-slate-900/70 px-3 py-1 text-xs text-slate-400">
                Karte bereits abgerechnet
              </span>
            ) : (
              <form action={reopenEmployeeWorkCard}>
                <input type="hidden" name="cardId" value={card.id} />
                <button className="rounded border border-cyan-500/60 bg-cyan-500/10 px-3 py-1 text-xs text-cyan-200 hover:bg-cyan-500/20">
                  {"Karte wieder \u00f6ffnen"}
                </button>
              </form>
            )}
          </div>
        </div>

        <div className="mt-3 overflow-x-auto rounded border border-slate-700 bg-slate-900/50">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="text-slate-300">
              <tr className="border-b border-slate-700">
                <th className="p-3 text-left">Schritt</th>
                <th className="p-3 text-left">Start</th>
                <th className="p-3 text-left">Ende</th>
                <th className="p-3 text-right">Dauer</th>
              </tr>
            </thead>
            <tbody>
              {card.steps.map((step) => {
                const seconds = step.durationSeconds;
                return (
                  <tr key={step.id} className="border-b border-slate-700 last:border-b-0">
                    <td className="p-3 text-slate-100">{step.name}</td>
                    <td className="p-3 text-slate-300">{formatDateTime(step.startedAt)}</td>
                    <td className="p-3 text-slate-300">
                      {step.endedAt ? formatDateTime(step.endedAt) : "l\u00e4uft"}
                    </td>
                    <td className="p-3 text-right text-slate-200">{formatDuration(seconds)}</td>
                  </tr>
                );
              })}
              {card.steps.length === 0 ? (
                <tr>
                  <td className="p-6 text-slate-400" colSpan={4}>
                    Noch keine Schritte erfasst.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
