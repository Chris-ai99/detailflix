import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSessionFromCookies } from "@/lib/auth";
import { listMemberUsersInWorkspace } from "@/lib/auth-db";
import { ensureWorkspaceDatabase } from "@/lib/tenant-db";
import { updateEmployeeWorkCard } from "../../../serverActions";

const PLAN_STEP_OPTIONS = ["Innen", "Außen", "Polieren", "Sonstiges"] as const;
type PlanStepName = (typeof PLAN_STEP_OPTIONS)[number];

type EmployeeCardEditPageProps = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ back?: string; card?: string }>;
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

function formatInputDateLocal(value: Date): string {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
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
    if (normalized === "Außen" || normalized === "Aussen") mapped = "Außen";
    if (normalized === "Polieren") mapped = "Polieren";
    if (normalized === "Sonstiges") mapped = "Sonstiges";
    if (!mapped || seen.has(mapped)) continue;
    seen.add(mapped);
    planned.push(mapped);
  }
  return planned;
}

function getEditStatusMessage(code?: string) {
  switch (code) {
    case "updated":
      return {
        tone: "success" as const,
        text: "Arbeitskarte wurde gespeichert.",
      };
    case "invalid":
      return {
        tone: "error" as const,
        text: "Bitte alle Pflichtfelder korrekt ausfüllen.",
      };
    case "invalid-assignee":
      return {
        tone: "error" as const,
        text: "Mitarbeiter-Zuweisung ist ungültig.",
      };
    case "forbidden":
      return {
        tone: "error" as const,
        text: "Keine Berechtigung zum Bearbeiten dieser Arbeitskarte.",
      };
    case "not-found":
      return {
        tone: "error" as const,
        text: "Arbeitskarte wurde nicht gefunden.",
      };
    case "invoiced-lock":
      return {
        tone: "error" as const,
        text: "Abgerechnete Arbeitskarten können nicht mehr bearbeitet werden.",
      };
    case "archived-lock":
      return {
        tone: "error" as const,
        text: "Archivierte Arbeitskarten bitte zuerst wiederherstellen.",
      };
    case "error":
      return {
        tone: "error" as const,
        text: "Arbeitskarte konnte nicht gespeichert werden.",
      };
    default:
      return null;
  }
}

export default async function EmployeeCardEditPage({
  params,
  searchParams,
}: EmployeeCardEditPageProps) {
  const { id } = await params;
  const resolvedSearch = searchParams ? await searchParams : undefined;
  const backHref = safeBackPath(resolvedSearch?.back);
  const session = await getSessionFromCookies();

  if (session?.workspaceId) {
    ensureWorkspaceDatabase(session.workspaceId);
  }

  const card = await prisma.employeeWorkCard.findUnique({
    where: { id },
    select: {
      id: true,
      workDate: true,
      customerName: true,
      vehicleMake: true,
      vehicleModel: true,
      licensePlate: true,
      notes: true,
      plannedSteps: true,
      plannedNote: true,
      assignedToUserId: true,
      assignedToLabel: true,
      createdByUserId: true,
      invoiceDocumentId: true,
      archivedAt: true,
    },
  });
  if (!card) return notFound();

  const isOwner = session?.role === "OWNER";
  const canEdit =
    isOwner ||
    (session?.userId
      ? card.assignedToUserId === session.userId ||
        (!card.assignedToUserId && card.createdByUserId === session.userId)
      : false);
  if (!canEdit) return notFound();

  const workspaceMembers =
    session?.workspaceId ? listMemberUsersInWorkspace(session.workspaceId) : [];
  const employeeAccounts = isOwner ? workspaceMembers : [];
  const assignedAccount =
    card.assignedToUserId
      ? workspaceMembers.find((member) => member.userId === card.assignedToUserId) ?? null
      : null;
  const assignedToDisplay =
    assignedAccount?.username
      ? getEmployeeLabel(assignedAccount)
      : card.assignedToLabel?.trim() || "Nicht zugewiesen";

  const plannedSteps = parseStoredPlannedSteps(card.plannedSteps);
  const isLocked = Boolean(card.invoiceDocumentId || card.archivedAt);
  const statusMessage = getEditStatusMessage(resolvedSearch?.card);
  const redirectTo = `/employees/cards/${id}/edit?back=${encodeURIComponent(backHref)}`;

  return (
    <div className="max-w-4xl space-y-4">
      <div className="flex flex-col gap-2 rounded border border-slate-800 bg-slate-900/50 px-4 py-3 text-xs text-slate-200 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="text-[11px] text-slate-400">Arbeitskarte</div>
          <div className="text-sm font-semibold">AK-{card.id.slice(-8).toUpperCase()} bearbeiten</div>
        </div>
        <Link
          href={backHref}
          className="inline-flex items-center rounded border border-slate-600 bg-slate-800 px-3 py-1 text-xs text-slate-200 hover:bg-slate-700"
        >
          Zurück
        </Link>
      </div>

      {statusMessage ? (
        <div
          className={`rounded border px-3 py-2 text-sm ${
            statusMessage.tone === "success"
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
              : "border-rose-500/30 bg-rose-500/10 text-rose-200"
          }`}
        >
          {statusMessage.text}
        </div>
      ) : null}

      {isLocked ? (
        <div className="rounded border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-200">
          Diese Arbeitskarte ist bereits abgerechnet oder archiviert und kann nicht mehr bearbeitet werden.
        </div>
      ) : null}

      <form action={updateEmployeeWorkCard} className="space-y-4 rounded border border-slate-800 bg-slate-800/60 p-4">
        <input type="hidden" name="cardId" value={card.id} />
        <input type="hidden" name="redirectTo" value={redirectTo} />

        <div className="grid gap-3 md:grid-cols-2">
          <label className="text-sm text-slate-300">
            Arbeitstag
            <input
              name="workDate"
              type="date"
              required
              defaultValue={formatInputDateLocal(card.workDate)}
              disabled={isLocked}
              className="mt-1 w-full rounded border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
            />
          </label>

          {isOwner ? (
            <label className="text-sm text-slate-300">
              Zugewiesener Mitarbeiter
              <select
                name="assignedToUserId"
                defaultValue={card.assignedToUserId ?? ""}
                disabled={isLocked}
                className="mt-1 w-full rounded border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <option value="">Nicht zugewiesen</option>
                {employeeAccounts.map((account) => (
                  <option key={`edit-assignee-${account.userId}`} value={account.userId}>
                    {getEmployeeLabel(account)}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <div>
              <div className="text-sm text-slate-300">Zugewiesen an</div>
              <div className="mt-1 rounded border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-200">
                {assignedToDisplay}
              </div>
            </div>
          )}
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <label className="text-sm text-slate-300">
            Kunde
            <input
              name="customerName"
              defaultValue={card.customerName ?? ""}
              disabled={isLocked}
              className="mt-1 w-full rounded border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
            />
          </label>
          <label className="text-sm text-slate-300">
            Kennzeichen / VIN
            <input
              name="licensePlate"
              defaultValue={card.licensePlate ?? ""}
              disabled={isLocked}
              className="mt-1 w-full rounded border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
            />
          </label>
          <label className="text-sm text-slate-300">
            Fahrzeug Marke
            <input
              name="vehicleMake"
              defaultValue={card.vehicleMake ?? ""}
              disabled={isLocked}
              className="mt-1 w-full rounded border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
            />
          </label>
          <label className="text-sm text-slate-300">
            Fahrzeug Modell
            <input
              name="vehicleModel"
              defaultValue={card.vehicleModel ?? ""}
              disabled={isLocked}
              className="mt-1 w-full rounded border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
            />
          </label>
        </div>

        <div className="rounded border border-slate-700 bg-slate-900/50 p-3">
          <div className="text-sm text-slate-300">Geplante Schritte</div>
          <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {PLAN_STEP_OPTIONS.map((stepName) => (
              <label key={`edit-step-${stepName}`} className="cursor-pointer">
                <input
                  type="checkbox"
                  name="plannedSteps"
                  value={stepName}
                  defaultChecked={plannedSteps.includes(stepName)}
                  disabled={isLocked}
                  className="peer sr-only"
                />
                <span className="inline-flex w-full items-center justify-center rounded border border-slate-700 bg-slate-950 px-2 py-2 text-xs font-semibold text-slate-300 transition peer-checked:border-cyan-500 peer-checked:bg-cyan-500/15 peer-checked:text-cyan-100 peer-disabled:cursor-not-allowed peer-disabled:opacity-50">
                  {stepName}
                </span>
              </label>
            ))}
          </div>
          <label className="mt-3 block text-sm text-slate-300">
            Planhinweis
            <input
              name="plannedNote"
              maxLength={300}
              defaultValue={card.plannedNote ?? ""}
              disabled={isLocked}
              className="mt-1 w-full rounded border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
            />
          </label>
        </div>

        <label className="block text-sm text-slate-300">
          Notizen
          <textarea
            name="notes"
            rows={4}
            defaultValue={card.notes ?? ""}
            disabled={isLocked}
            className="mt-1 w-full rounded border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
          />
        </label>

        <div className="flex items-center justify-between gap-2">
          <Link
            href={backHref}
            className="rounded border border-slate-600 bg-slate-800 px-3 py-2 text-xs text-slate-200 hover:bg-slate-700"
          >
            Abbrechen
          </Link>
          <button
            disabled={isLocked}
            className="rounded bg-cyan-600 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Änderungen speichern
          </button>
        </div>
      </form>
    </div>
  );
}
