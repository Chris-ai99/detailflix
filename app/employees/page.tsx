import Link from "next/link";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getSessionFromCookies } from "@/lib/auth";
import { listMemberUsersInWorkspace } from "@/lib/auth-db";
import { ensureWorkspaceDatabase } from "@/lib/tenant-db";
import {
  archiveEmployeeWorkCard,
  closeEmployeeWorkCard,
  createInvoiceFromEmployeeWorkCard,
  createEmployeeLoginAccount,
  removeEmployeeLoginAccount,
  reopenEmployeeWorkCard,
  restoreEmployeeWorkCardFromArchive,
  saveEmployeeWorkPlan,
  startEmployeeWorkStep,
  setEmployeeLoginPassword,
  moveEmployeeWorkCardPlan,
  updateEmployeeWorkCardPlan,
  updateEmployeeLoginAccount,
} from "./serverActions";
import ConvertWorkCardToInvoiceButton from "./ui/ConvertWorkCardToInvoiceButton";
import AutoSubmitSelect from "./ui/AutoSubmitSelect";

export const dynamic = "force-dynamic";

const DASH = "\u2014";
const WORK_PLAN_DAYS: Array<{ dayOfWeek: number; label: string }> = [
  { dayOfWeek: 1, label: "Montag" },
  { dayOfWeek: 2, label: "Dienstag" },
  { dayOfWeek: 3, label: "Mittwoch" },
  { dayOfWeek: 4, label: "Donnerstag" },
  { dayOfWeek: 5, label: "Freitag" },
  { dayOfWeek: 6, label: "Samstag" },
  { dayOfWeek: 7, label: "Sonntag" },
];
const PLAN_STEP_OPTIONS = ["Innen", "Au\u00dfen", "Polieren", "Sonstiges"] as const;
type PlanStepName = (typeof PLAN_STEP_OPTIONS)[number];

type ViewMode = "employee" | "employer";
type EmployeesModuleMode = "cards" | "staff";
type CardsScopeMode = "active" | "archive";
type CardsSortMode = "date" | "number";

type EmployeesSearchParams =
  | {
      from?: string;
      to?: string;
      status?: string;
      q?: string;
      view?: string;
      module?: string;
      employeeUser?: string;
      memberUser?: string;
      sort?: string;
      card?: string;
      workPlan?: string;
      cardPlan?: string;
      scope?: string;
      cardArchive?: string;
      assignedTo?: string;
    }
  | Promise<{
      from?: string;
      to?: string;
      status?: string;
      q?: string;
      view?: string;
      module?: string;
      employeeUser?: string;
      memberUser?: string;
      sort?: string;
      card?: string;
      workPlan?: string;
      cardPlan?: string;
      scope?: string;
      cardArchive?: string;
      assignedTo?: string;
    }>;

function formatDate(value?: Date | string | null) {
  if (!value) return DASH;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return DASH;
  return date.toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatDateTime(value?: Date | string | null) {
  if (!value) return DASH;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return DASH;
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

function formatTimeInputValue(value?: string | null): string {
  const raw = String(value ?? "").trim();
  if (!raw) return "";
  const withColon = raw.match(/^(\d{2}):(\d{2})/);
  if (!withColon) return "";
  return `${withColon[1]}:${withColon[2]}`;
}

function parseStoredPlannedSteps(value?: string | null): PlanStepName[] {
  const raw = String(value ?? "").trim();
  if (!raw) return [];

  const supported = new Set<PlanStepName>(PLAN_STEP_OPTIONS);
  const seen = new Set<PlanStepName>();
  const result: PlanStepName[] = [];

  for (const token of raw.split("|")) {
    const normalized = token.trim();
    if (!normalized) continue;

    let mapped: PlanStepName | null = null;
    if (normalized === "Innen") mapped = "Innen";
    if (normalized === "Au\u00dfen" || normalized === "Aussen") mapped = "Au\u00dfen";
    if (normalized === "Polieren") mapped = "Polieren";
    if (normalized === "Sonstiges") mapped = "Sonstiges";
    if (!mapped || !supported.has(mapped) || seen.has(mapped)) continue;
    seen.add(mapped);
    result.push(mapped);
  }

  return result;
}

function getPlanStepBadgeClass(stepName: PlanStepName): string {
  if (stepName === "Innen") return "border-sky-500/50 bg-sky-500/10 text-sky-200";
  if (stepName === "Au\u00dfen") return "border-emerald-500/50 bg-emerald-500/10 text-emerald-200";
  if (stepName === "Polieren") return "border-violet-500/50 bg-violet-500/10 text-violet-200";
  return "border-amber-500/50 bg-amber-500/10 text-amber-200";
}

function getPlanStepButtonClass(stepName: PlanStepName): string {
  if (stepName === "Innen") {
    return "border-sky-500/70 bg-sky-500/15 text-sky-100 hover:bg-sky-500/25";
  }
  if (stepName === "Au\u00dfen") {
    return "border-emerald-500/70 bg-emerald-500/15 text-emerald-100 hover:bg-emerald-500/25";
  }
  if (stepName === "Polieren") {
    return "border-violet-500/70 bg-violet-500/15 text-violet-100 hover:bg-violet-500/25";
  }
  return "border-amber-500/70 bg-amber-500/15 text-amber-100 hover:bg-amber-500/25";
}

function getEmployeeLabel(account: { username: string; fullName: string | null }): string {
  const fullName = String(account.fullName ?? "").trim();
  if (fullName) return `${fullName} (${account.username})`;
  return account.username;
}

function formatInputDateLocal(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseInputDate(value: unknown): string | null {
  const raw = String(value ?? "").trim();
  const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
  if (Number.isNaN(date.getTime())) return null;
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() + 1 !== month ||
    date.getUTCDate() !== day
  ) {
    return null;
  }
  return raw;
}

function inputDateToUtcStart(input: string): Date {
  const [yearRaw, monthRaw, dayRaw] = input.split("-");
  const year = Number(yearRaw);
  const month = Number(monthRaw);
  const day = Number(dayRaw);
  return new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
}

function inputDateToUtcEnd(input: string): Date {
  const [yearRaw, monthRaw, dayRaw] = input.split("-");
  const year = Number(yearRaw);
  const month = Number(monthRaw);
  const day = Number(dayRaw);
  return new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999));
}

function getCurrentWeekInputs(): { from: string; to: string } {
  const now = new Date();
  const day = (now.getDay() + 6) % 7;
  const monday = new Date(now);
  monday.setDate(now.getDate() - day);
  monday.setHours(0, 0, 0, 0);

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(0, 0, 0, 0);

  return {
    from: formatInputDateLocal(monday),
    to: formatInputDateLocal(sunday),
  };
}

function buildListHref(params: {
  from: string;
  to: string;
  status: string;
  q: string;
  assignedTo?: string;
  memberUser?: string;
  sort?: CardsSortMode;
  scope: CardsScopeMode;
  moduleMode: EmployeesModuleMode;
  viewMode?: ViewMode;
  canSwitchView: boolean;
}) {
  const sp = new URLSearchParams();
  sp.set("from", params.from);
  sp.set("to", params.to);
  sp.set("module", params.moduleMode);
  if (params.status !== "all") sp.set("status", params.status);
  if (params.scope === "archive") sp.set("scope", "archive");
  if (params.q) sp.set("q", params.q);
  if (params.assignedTo) sp.set("assignedTo", params.assignedTo);
  if (params.memberUser) sp.set("memberUser", params.memberUser);
  if (params.sort === "number") sp.set("sort", "number");
  if (params.canSwitchView && params.viewMode) {
    sp.set("view", params.viewMode);
  }
  return `/employees?${sp.toString()}`;
}

function getCardStatusMessage(code?: string) {
  switch (code) {
    case "created":
      return "Arbeitskarte wurde angelegt.";
    case "invalid-vehicle":
      return "Bitte Fahrzeug angeben: bestehendes Fahrzeug w\u00e4hlen oder Marke/Modell/Kennzeichen eintragen.";
    case "vin-required-no-customer":
      return "Ohne Kundenangabe ist Kennzeichen/VIN Pflicht.";
    case "invalid":
      return "Eingaben sind unvollst\u00e4ndig.";
    case "invalid-assignee":
      return "Mitarbeiter-Zuweisung ist ungueltig.";
    case "forbidden":
      return "Nur der Inhaber darf Arbeitskarten abrechnen.";
    case "not-found":
      return "Arbeitskarte wurde nicht gefunden.";
    case "not-closed":
      return "Arbeitskarte muss abgeschlossen sein, bevor sie berechnet wird.";
    case "no-time":
      return "Arbeitskarte enth\u00e4lt noch keine erfassbare Zeit.";
    case "conflict":
      return "Abrechnung konnte nicht gestartet werden, weil parallel bereits eine Rechnung erzeugt wurde. Bitte Karte neu laden.";
    case "missing-relation":
      return "Abrechnung nicht m\u00f6glich: Kunde oder Fahrzeug der Arbeitskarte existiert nicht mehr. Bitte Karte pr\u00fcfen und erneut versuchen.";
    case "reference-not-found":
      return "Abrechnung nicht m\u00f6glich: Verkn\u00fcpfte Daten wurden nicht gefunden. Bitte Arbeitskarte pr\u00fcfen.";
    case "schema-mismatch":
      return "Abrechnung ist aktuell technisch blockiert (Datenmodell-Update). Bitte Seite neu laden und erneut versuchen.";
    case "error":
      return "Arbeitskarte konnte nicht in Rechnung umgewandelt werden. Ursache: technischer Fehler oder fehlende Stammdaten.";
    case "invalid-rate":
      return "Bitte einen g\u00fcltigen Stundenverrechnungssatz f\u00fcr die Abrechnung eingeben.";
    default:
      return null;
  }
}

function getEmployeeUserStatusMessage(code?: string) {
  switch (code) {
    case "created":
      return "Mitarbeiter-Login wurde angelegt.";
    case "exists":
      return "Benutzername ist bereits systemweit vergeben.";
    case "updated":
      return "Mitarbeiter-Zugang wurde aktualisiert.";
    case "password-updated":
      return "Passwort wurde aktualisiert.";
    case "removed":
      return "Mitarbeiter-Zugang wurde entfernt.";
    case "not-found":
      return "Mitarbeiter-Konto wurde nicht gefunden.";
    case "invalid":
      return "Bitte g\u00fcltigen Benutzernamen nutzen (3-32 Zeichen: a-z, 0-9, . _ -) und Passwort mit mindestens 8 Zeichen.";
    case "forbidden":
      return "Nur der Inhaber darf Mitarbeiter-Zug\u00e4nge verwalten.";
    case "error":
      return "Mitarbeiter-Login konnte nicht angelegt werden.";
    default:
      return null;
  }
}

function getWorkPlanStatusMessage(code?: string) {
  switch (code) {
    case "saved":
      return "Arbeitsplan wurde gespeichert.";
    case "cleared":
      return "Arbeitsplantag wurde geleert.";
    case "invalid":
      return "Arbeitsplan konnte nicht gespeichert werden (ungueltige Eingaben).";
    case "forbidden":
      return "Nur der Inhaber darf Arbeitsplaene bearbeiten.";
    case "member-not-found":
      return "Mitarbeiter wurde im aktuellen Workspace nicht gefunden.";
    case "time-pair":
      return "Bitte Start- und Endzeit gemeinsam angeben.";
    case "time-order":
      return "Endzeit muss nach der Startzeit liegen.";
    case "error":
      return "Arbeitsplan konnte technisch nicht gespeichert werden. Bitte erneut versuchen.";
    default:
      return null;
  }
}

function getCardPlanStatusMessage(code?: string) {
  switch (code) {
    case "saved":
      return "Arbeitsplan der Karte wurde gespeichert.";
    case "moved":
      return "Reihenfolge wurde aktualisiert.";
    case "not-found":
      return "Arbeitskarte wurde nicht gefunden.";
    case "invalid":
      return "Arbeitsplan konnte nicht gespeichert werden (ungueltige Eingaben).";
    case "member-not-found":
      return "Zugewiesener Mitarbeiter wurde nicht gefunden.";
    case "forbidden":
      return "Nur der Inhaber darf den Arbeitsplan bearbeiten.";
    case "error":
      return "Arbeitsplan konnte technisch nicht gespeichert werden. Bitte erneut versuchen.";
    default:
      return null;
  }
}

function getCardArchiveStatusMessage(code?: string) {
  switch (code) {
    case "archived":
      return "Arbeitskarte wurde ins Archiv verschoben.";
    case "restored":
      return "Arbeitskarte wurde aus dem Archiv wiederhergestellt.";
    case "not-billed":
      return "Nur bereits abgerechnete Arbeitskarten koennen archiviert werden.";
    case "not-found":
      return "Arbeitskarte wurde nicht gefunden.";
    case "invalid":
      return "Arbeitskarte konnte nicht archiviert werden (ungueltige Eingaben).";
    case "forbidden":
      return "Nur der Inhaber darf Arbeitskarten archivieren.";
    case "error":
      return "Archiv-Aktion konnte technisch nicht ausgefuehrt werden. Bitte erneut versuchen.";
    default:
      return null;
  }
}

function StatusBadge({
  status,
  invoiceDocumentId,
  readyForBilling,
}: {
  status: "OPEN" | "CLOSED";
  invoiceDocumentId?: string | null;
  readyForBilling?: boolean;
}) {
  if (status === "OPEN") return <span className="text-xs text-emerald-300">Offen</span>;
  if (invoiceDocumentId) return <span className="text-xs text-cyan-300">Abgerechnet</span>;
  if (readyForBilling) return <span className="text-xs text-amber-300">Bereit zur Abrechnung</span>;
  return <span className="text-xs text-slate-300">Abgeschlossen</span>;
}

function ActionLink({
  href,
  title,
  tone,
  children,
}: {
  href: string;
  title: string;
  tone: "cyan" | "indigo";
  children: React.ReactNode;
}) {
  const toneClass =
    tone === "cyan"
      ? "border-cyan-500/60 text-cyan-300 hover:bg-cyan-500/10"
      : "border-indigo-400/60 text-indigo-300 hover:bg-indigo-500/10";

  return (
    <Link
      href={href}
      title={title}
      className={`inline-flex h-8 w-8 items-center justify-center rounded border text-xs transition ${toneClass}`}
    >
      {children}
    </Link>
  );
}

function IconSearch() {
  return (
    <svg viewBox="0 0 20 20" className="h-4 w-4" fill="currentColor" aria-hidden="true">
      <path
        fillRule="evenodd"
        d="M8.5 3a5.5 5.5 0 1 0 3.53 9.7l3.63 3.64a.75.75 0 1 0 1.06-1.06l-3.64-3.63A5.5 5.5 0 0 0 8.5 3ZM4.5 8.5a4 4 0 1 1 8 0 4 4 0 0 1-8 0Z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function IconPencil() {
  return (
    <svg viewBox="0 0 20 20" className="h-4 w-4" fill="currentColor" aria-hidden="true">
      <path
        fillRule="evenodd"
        d="M13.586 3.586a2 2 0 1 1 2.828 2.828l-9.1 9.1a2 2 0 0 1-.878.503l-2.353.588a.5.5 0 0 1-.606-.606l.588-2.353a2 2 0 0 1 .503-.878l9.1-9.1ZM15.707 5l-.707-.707a1 1 0 0 0-1.414 0L12.5 5.379l2.121 2.121 1.086-1.086a1 1 0 0 0 0-1.414Z"
        clipRule="evenodd"
      />
    </svg>
  );
}

export default async function EmployeesPage({
  searchParams,
}: {
  searchParams?: EmployeesSearchParams;
}) {
  const session = await getSessionFromCookies();
  const resolved = searchParams ? await searchParams : {};

  const week = getCurrentWeekInputs();
  const fromInput = parseInputDate(resolved?.from) ?? week.from;
  const toInput = parseInputDate(resolved?.to) ?? week.to;
  const todayInput = formatInputDateLocal(new Date());
  const statusFilter = String(resolved?.status ?? "all").toLowerCase();
  const q = String(resolved?.q ?? "").trim();
  const requestedAssignedTo = String(resolved?.assignedTo ?? "").trim();
  const requestedMemberUser = String(resolved?.memberUser ?? "").trim();
  const requestedSort = String(resolved?.sort ?? "").trim().toLowerCase();
  const sortMode: CardsSortMode = requestedSort === "number" ? "number" : "date";

  const canSwitchView = session?.role === "OWNER";
  const requestedModule = String(resolved?.module ?? "").trim().toLowerCase();
  const moduleMode: EmployeesModuleMode =
    canSwitchView && requestedModule === "staff" ? "staff" : "cards";
  const requestedView = String(resolved?.view ?? "").trim().toLowerCase();
  const viewMode: ViewMode =
    moduleMode === "staff"
      ? "employer"
      : canSwitchView
        ? requestedView === "employee"
        ? "employee"
        : "employer"
        : "employee";
  const requestedScope = String(resolved?.scope ?? "").trim().toLowerCase();
  const cardsScope: CardsScopeMode =
    canSwitchView && viewMode === "employer" && requestedScope === "archive"
      ? "archive"
      : "active";
  const employeeAccounts =
    canSwitchView && session
      ? listMemberUsersInWorkspace(session.workspaceId)
      : [];
  const employeeAccountById = new Map(employeeAccounts.map((account) => [account.userId, account] as const));
  const canFilterEmployeeViewByMember =
    canSwitchView && moduleMode === "cards" && viewMode === "employee";
  const memberUserFilter =
    canFilterEmployeeViewByMember && employeeAccountById.has(requestedMemberUser)
      ? requestedMemberUser
      : "";
  const selectedMemberAccount = memberUserFilter ? employeeAccountById.get(memberUserFilter) ?? null : null;
  const employeeViewUserId =
    moduleMode !== "cards" || viewMode !== "employee"
      ? null
      : session?.role === "MEMBER"
        ? session.userId
        : memberUserFilter || null;
  const canFilterByAssignment =
    canSwitchView && moduleMode === "cards" && viewMode === "employer" && cardsScope === "active";
  const assignedToFilter =
    canFilterByAssignment &&
    (requestedAssignedTo === "unassigned" || employeeAccountById.has(requestedAssignedTo))
      ? requestedAssignedTo
      : "";
  const shouldLoadWorkPlans = canSwitchView && moduleMode === "staff" && Boolean(session);
  const shouldEnsureCardsSchema = moduleMode === "cards" && Boolean(session);
  const shouldLoadTodayPlanCards = moduleMode === "cards" && cardsScope === "active";

  if ((shouldLoadWorkPlans || shouldEnsureCardsSchema) && session) {
    ensureWorkspaceDatabase(session.workspaceId);
  }

  const where: Prisma.EmployeeWorkCardWhereInput = {
    workDate: {
      gte: inputDateToUtcStart(fromInput),
      lte: inputDateToUtcEnd(toInput),
    },
    archivedAt: cardsScope === "archive" ? { not: null } : null,
  };

  if (statusFilter === "open") where.status = "OPEN";
  if (statusFilter === "closed") where.status = "CLOSED";
  if (statusFilter === "billing-ready") {
    where.status = "CLOSED";
  }
  if (viewMode === "employee") {
    where.invoiceDocumentId = null;
  }
  if (assignedToFilter === "unassigned") {
    where.assignedToUserId = null;
  } else if (assignedToFilter) {
    where.assignedToUserId = assignedToFilter;
  }
  const andFilters: Prisma.EmployeeWorkCardWhereInput[] = [];
  if (employeeViewUserId) {
    andFilters.push({
      OR: [
        { assignedToUserId: employeeViewUserId },
        {
          AND: [{ assignedToUserId: null }, { createdByUserId: employeeViewUserId }],
        },
      ],
    });
  }
  if (q) {
    andFilters.push({
      OR: [
        { customerName: { contains: q } },
        { vehicleMake: { contains: q } },
        { vehicleModel: { contains: q } },
        { licensePlate: { contains: q } },
        { createdByEmail: { contains: q } },
        { assignedToLabel: { contains: q } },
        { sourceOfferId: { contains: q } },
        { sourceOrderId: { contains: q } },
      ],
    });
  }
  if (andFilters.length > 0) {
    where.AND = andFilters;
  }

  const cardInclude = {
    steps: {
      orderBy: { startedAt: "asc" as const },
      select: {
        id: true,
        name: true,
        startedAt: true,
        endedAt: true,
        durationSeconds: true,
      },
    },
  };
  type EmployeeWorkCardWithSteps = Prisma.EmployeeWorkCardGetPayload<{ include: typeof cardInclude }>;

  let todayPlanWhere: Prisma.EmployeeWorkCardWhereInput | null = null;
  if (shouldLoadTodayPlanCards) {
    todayPlanWhere = {
      workDate: {
        gte: inputDateToUtcStart(todayInput),
        lte: inputDateToUtcEnd(todayInput),
      },
      status: "OPEN",
      invoiceDocumentId: null,
      archivedAt: null,
    };
    if (canFilterByAssignment && assignedToFilter === "unassigned") {
      todayPlanWhere.assignedToUserId = null;
    } else if (canFilterByAssignment && assignedToFilter) {
      todayPlanWhere.assignedToUserId = assignedToFilter;
    }
  }

  const todayPlanCardsPromise: Promise<EmployeeWorkCardWithSteps[]> = todayPlanWhere
    ? prisma.employeeWorkCard.findMany({
        where: todayPlanWhere,
        orderBy: [{ workDate: "asc" }, { createdAt: "desc" }],
        include: cardInclude,
      })
    : Promise.resolve([]);

  const [cards, settings, todayPlanCards] = await Promise.all([
    prisma.employeeWorkCard.findMany({
      where,
      orderBy: [{ workDate: "asc" }, { createdAt: "desc" }],
      include: cardInclude,
    }),
    prisma.companySettings.findUnique({
      where: { id: "default" },
      select: { workCardHourlyRateCents: true },
    }),
    todayPlanCardsPromise,
  ]);
  const companyHourlyRateCents = Math.max(1, settings?.workCardHourlyRateCents ?? 6000);

  const customerIds = Array.from(
    new Set(cards.map((card) => card.customerId).filter((id): id is string => Boolean(id)))
  );
  const customerRates = customerIds.length
    ? await prisma.customer.findMany({
        where: { id: { in: customerIds } },
        select: { id: true, hourlyRateCents: true },
      })
    : [];
  const customerRateById = new Map(customerRates.map((customer) => [customer.id, customer.hourlyRateCents]));
  const employeeWorkPlans =
    shouldLoadWorkPlans && employeeAccounts.length > 0
      ? await prisma.employeeWorkPlan.findMany({
          where: { memberUserId: { in: employeeAccounts.map((account) => account.userId) } },
          select: {
            memberUserId: true,
            dayOfWeek: true,
            startTime: true,
            endTime: true,
            note: true,
          },
          orderBy: [{ memberUserId: "asc" }, { dayOfWeek: "asc" }],
        })
      : [];
  const workPlanByMemberDay = new Map(
    employeeWorkPlans.map((entry) => [`${entry.memberUserId}:${entry.dayOfWeek}`, entry] as const)
  );

  const mapCardToRow = (card: (typeof cards)[number]) => {
    const totalSeconds = card.steps.reduce((sum, step) => sum + step.durationSeconds, 0);

    const activeStep = card.steps.find((step) => !step.endedAt) ?? null;
    const vehicleLabel = [card.vehicleMake || "", card.vehicleModel || ""].join(" ").trim() || DASH;
    const workDateInput = formatInputDateLocal(card.workDate);
    const readyForBilling = card.status === "CLOSED" && !card.invoiceDocumentId && totalSeconds > 0;
    const assignedAccount = card.assignedToUserId
      ? employeeAccountById.get(card.assignedToUserId) ?? null
      : null;
    const assignedToDisplay =
      assignedAccount?.username
        ? getEmployeeLabel(assignedAccount)
        : card.assignedToLabel?.trim() || null;

    return {
      id: card.id,
      shortId: card.id.slice(-8).toUpperCase(),
      createdAt: card.createdAt,
      customerName: card.customerName || DASH,
      vehicleLabel,
      licensePlate: card.licensePlate || DASH,
      workDate: card.workDate,
      workDateInput,
      createdByEmail: card.createdByEmail || DASH,
      assignedToUserId: card.assignedToUserId ?? null,
      assignedToLabel: card.assignedToLabel ?? null,
      assignedToDisplay,
      status: card.status,
      totalSeconds,
      activeStep,
      invoiceDocumentId: card.invoiceDocumentId,
      billingReadyAt: card.billingReadyAt,
      archivedAt: card.archivedAt,
      readyForBilling,
      planRank: card.planRank,
      plannedSteps: parseStoredPlannedSteps(card.plannedSteps),
      plannedNote: card.plannedNote?.trim() || null,
      customerHourlyRateCents: card.customerId ? (customerRateById.get(card.customerId) ?? null) : null,
    };
  };
  const rows = cards.map(mapCardToRow);
  const todayPlanRows = todayPlanCards.map(mapCardToRow);
  const visibleRowsBase =
    statusFilter === "billing-ready" ? rows.filter((row) => row.readyForBilling) : rows;
  const visibleRows = [...visibleRowsBase].sort((a, b) => {
    if (sortMode === "number") {
      return a.shortId.localeCompare(b.shortId, "de-DE", { numeric: true, sensitivity: "base" });
    }
    const dayDiff = b.workDate.getTime() - a.workDate.getTime();
    if (dayDiff !== 0) return dayDiff;
    return b.createdAt.getTime() - a.createdAt.getTime();
  });

  const todayOpenCount = rows.filter((row) => row.status === "OPEN" && row.workDateInput === todayInput).length;
  const billingReadyCount = rows.filter((row) => row.readyForBilling).length;
  const canManageBilling = canSwitchView && viewMode === "employer";
  const canManageCardPlan = canSwitchView && viewMode === "employer";
  const canManageArchive = canSwitchView && viewMode === "employer";
  const canStartPlanSteps = viewMode === "employer";
  const openPlannedRows = todayPlanRows
    .filter((row) => row.status === "OPEN" && !row.invoiceDocumentId)
    .sort((a, b) => {
      const rankA = a.planRank ?? 9999;
      const rankB = b.planRank ?? 9999;
      if (rankA !== rankB) return rankA - rankB;
      const dayDiff = a.workDate.getTime() - b.workDate.getTime();
      if (dayDiff !== 0) return dayDiff;
      return a.createdAt.getTime() - b.createdAt.getTime();
    });
  const planQueueByCardId = new Map(openPlannedRows.map((row, index) => [row.id, index + 1] as const));
  const employeeViewTitle = selectedMemberAccount
    ? `${getEmployeeLabel(selectedMemberAccount)}`
    : "Mitarbeiteransicht";

  const listHref = buildListHref({
    from: fromInput,
    to: toInput,
    status: statusFilter,
    q,
    assignedTo: assignedToFilter,
    memberUser: memberUserFilter,
    sort: sortMode,
    scope: cardsScope,
    moduleMode,
    viewMode,
    canSwitchView,
  });

  const newHrefParams = new URLSearchParams();
  newHrefParams.set("from", fromInput);
  newHrefParams.set("to", toInput);
  newHrefParams.set("module", "cards");
  if (assignedToFilter) newHrefParams.set("assignedTo", assignedToFilter);
  if (memberUserFilter) newHrefParams.set("memberUser", memberUserFilter);
  if (sortMode === "number") newHrefParams.set("sort", "number");
  if (canSwitchView) newHrefParams.set("view", viewMode);
  const newHref = `/employees/new?${newHrefParams.toString()}`;

  const employeeUserMessage = getEmployeeUserStatusMessage(resolved?.employeeUser);
  const workPlanMessage = getWorkPlanStatusMessage(resolved?.workPlan);
  const cardPlanMessage = getCardPlanStatusMessage(resolved?.cardPlan);
  const cardArchiveMessage = getCardArchiveStatusMessage(resolved?.cardArchive);
  const cardMessage = getCardStatusMessage(resolved?.card);
  const tableColSpan = 10 + (viewMode === "employer" ? 1 : 0) + (canManageBilling ? 1 : 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 rounded border border-slate-800 bg-slate-900/50 px-4 py-2 text-xs text-slate-200 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3 text-sm font-semibold">
          <span>
            {moduleMode === "staff"
              ? "Mitarbeiter verwalten"
              : cardsScope === "archive"
                ? "Arbeitskarten Archiv"
                : viewMode === "employee"
                ? canSwitchView
                  ? `Arbeitskarten (${employeeViewTitle})`
                  : "Meine Arbeitskarten"
                : "Arbeitskarten Team"}
          </span>
          {moduleMode === "cards" ? (
            <>
              <span className="rounded border border-slate-700 bg-slate-800/70 px-2 py-0.5 text-[11px] text-slate-300">
                {cardsScope === "archive" ? `Archiv: ${rows.length}` : `Heute offen: ${todayOpenCount}`}
              </span>
              {canManageBilling && cardsScope === "active" ? (
                <span className="rounded border border-amber-500/40 bg-amber-500/15 px-2 py-0.5 text-[11px] text-amber-200">
                  Bereit zur Abrechnung: {billingReadyCount}
                </span>
              ) : null}
            </>
          ) : null}
        </div>
        <div className="flex flex-col items-start gap-2 sm:items-end">
          {moduleMode === "cards" && canSwitchView ? (
            <div className="flex gap-2">
              <Link
                href={buildListHref({
                  from: fromInput,
                  to: toInput,
                  status: statusFilter,
                  q,
                  assignedTo: assignedToFilter,
                  memberUser: memberUserFilter,
                  sort: sortMode,
                  scope: cardsScope,
                  moduleMode: "cards",
                  viewMode: "employee",
                  canSwitchView: true,
                })}
                className={`rounded px-3 py-1 text-xs ${
                  viewMode === "employee"
                    ? "bg-cyan-600 text-white"
                    : "border border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800"
                }`}
              >
                Mitarbeiter-Ansicht
              </Link>
              <Link
                href={buildListHref({
                  from: fromInput,
                  to: toInput,
                  status: statusFilter,
                  q,
                  assignedTo: assignedToFilter,
                  memberUser: memberUserFilter,
                  sort: sortMode,
                  scope: cardsScope,
                  moduleMode: "cards",
                  viewMode: "employer",
                  canSwitchView: true,
                })}
                className={`rounded px-3 py-1 text-xs ${
                  viewMode === "employer"
                    ? "bg-cyan-600 text-white"
                    : "border border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800"
                }`}
              >
                Arbeitgeber-Ansicht
              </Link>
            </div>
          ) : null}
          <div className="flex items-center gap-2">
          {moduleMode === "cards" && canSwitchView && viewMode === "employer" ? (
            <>
              <Link
                href={buildListHref({
                  from: fromInput,
                  to: toInput,
                  status: statusFilter,
                  q,
                  assignedTo: assignedToFilter,
                  memberUser: memberUserFilter,
                  sort: sortMode,
                  scope: "active",
                  moduleMode: "cards",
                  viewMode: "employer",
                  canSwitchView: true,
                })}
                className={`rounded px-2 py-1 text-[11px] ${
                  cardsScope === "active"
                    ? "bg-cyan-600 text-white"
                    : "border border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800"
                }`}
              >
                Aktiv
              </Link>
              <Link
                href={buildListHref({
                  from: fromInput,
                  to: toInput,
                  status: statusFilter,
                  q,
                  assignedTo: assignedToFilter,
                  memberUser: memberUserFilter,
                  sort: sortMode,
                  scope: "archive",
                  moduleMode: "cards",
                  viewMode: "employer",
                  canSwitchView: true,
                })}
                className={`rounded px-2 py-1 text-[11px] ${
                  cardsScope === "archive"
                    ? "bg-fuchsia-600 text-white"
                    : "border border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800"
                }`}
              >
                Archiv
              </Link>
            </>
          ) : null}
          {moduleMode === "cards" && cardsScope === "active" ? (
            <Link
              href={newHref}
              className="inline-flex items-center gap-2 rounded bg-cyan-600 px-3 py-1 text-xs font-semibold text-white hover:bg-cyan-500"
            >
              + Neu
            </Link>
          ) : null}
          </div>
        </div>
      </div>

      {moduleMode === "cards" && cardMessage ? (
        <div className="rounded border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">
          {cardMessage}
        </div>
      ) : null}
      {moduleMode === "cards" && cardPlanMessage ? (
        <div className="rounded border border-indigo-500/30 bg-indigo-500/10 px-3 py-2 text-sm text-indigo-200">
          {cardPlanMessage}
        </div>
      ) : null}
      {moduleMode === "cards" && cardArchiveMessage ? (
        <div className="rounded border border-fuchsia-500/30 bg-fuchsia-500/10 px-3 py-2 text-sm text-fuchsia-200">
          {cardArchiveMessage}
        </div>
      ) : null}

      {moduleMode === "cards" && cardsScope === "active" && canManageBilling && billingReadyCount > 0 ? (
        <div className="rounded border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-200">
          {billingReadyCount} Arbeitskarte(n) sind bereit zur Abrechnung.
          <Link
            href={buildListHref({
              from: fromInput,
              to: toInput,
              status: "billing-ready",
              q,
              assignedTo: assignedToFilter,
              memberUser: memberUserFilter,
              sort: sortMode,
              scope: cardsScope,
              moduleMode,
              viewMode,
              canSwitchView,
            })}
            className="ml-2 underline decoration-dotted underline-offset-2 hover:text-amber-100"
          >
            Jetzt anzeigen
          </Link>
        </div>
      ) : null}

      {moduleMode === "cards" ? (
        <>
      {cardsScope === "active" ? (
      <div className="rounded border border-slate-800 bg-slate-800/60 p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold text-slate-100">Arbeitsplan heute (Disposition)</h2>
            <p className="text-xs text-slate-400">
              {canStartPlanSteps
                ? "Zeigt nur offene Aufgaben fuer heute. Reihenfolge, Zuweisung und Start direkt hier."
                : "Zeigt nur offene Aufgaben fuer heute (firmenweit) als schnelle Uebersicht."}
            </p>
          </div>
          <span className="rounded border border-slate-700 bg-slate-900/60 px-2 py-0.5 text-[11px] text-slate-300">
            Heute offen: {openPlannedRows.length}
          </span>
        </div>

        {openPlannedRows.length === 0 ? (
          <div className="mt-3 rounded border border-slate-700 bg-slate-900/40 px-3 py-2 text-xs text-slate-400">
            Heute sind keine offenen Arbeitskarten geplant.
          </div>
        ) : (
          <div className="mt-3 max-h-[68vh] space-y-3 overflow-y-auto pr-1">
            {openPlannedRows.map((row, queueIndex) => {
              const detailsHref = `/employees/cards/${row.id}?back=${encodeURIComponent(listHref)}`;
              const queueNumber = queueIndex + 1;
              const quickStartSteps = row.plannedSteps.length > 0 ? row.plannedSteps : PLAN_STEP_OPTIONS;
              return (
                <div
                  key={`plan-${row.id}`}
                  className="grid gap-3 rounded border border-slate-700/80 bg-slate-900/50 p-3 md:grid-cols-[56px_1fr]"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-full border border-cyan-400/60 bg-cyan-500/10 text-sm font-bold text-cyan-200">
                    {queueNumber}
                  </div>

                  <div className="space-y-3">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <div className="text-xs text-slate-400">AK-{row.shortId}</div>
                        <div className="text-sm font-semibold text-slate-100">{row.vehicleLabel}</div>
                        <div className="text-xs text-slate-400">
                          {row.customerName} | {formatDate(row.workDate)}
                        </div>
                        <div className="mt-1 text-[11px] text-slate-300">
                          Zugewiesen: {row.assignedToDisplay ?? "Nicht zugewiesen"}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="rounded border border-slate-700 bg-slate-950/70 px-2 py-0.5 text-[11px] text-slate-300">
                          Platz: #{queueNumber}
                        </span>
                        {canManageCardPlan ? (
                          <>
                            <form action={moveEmployeeWorkCardPlan}>
                              <input type="hidden" name="redirectTo" value={listHref} />
                              <input type="hidden" name="cardId" value={row.id} />
                              <input type="hidden" name="direction" value="up" />
                              <button
                                disabled={queueNumber === 1}
                                className="rounded border border-slate-600 bg-slate-900 px-2 py-1 text-[11px] text-slate-200 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
                              >
                                Hoch
                              </button>
                            </form>
                            <form action={moveEmployeeWorkCardPlan}>
                              <input type="hidden" name="redirectTo" value={listHref} />
                              <input type="hidden" name="cardId" value={row.id} />
                              <input type="hidden" name="direction" value="down" />
                              <button
                                disabled={queueNumber === openPlannedRows.length}
                                className="rounded border border-slate-600 bg-slate-900 px-2 py-1 text-[11px] text-slate-200 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
                              >
                                Runter
                              </button>
                            </form>
                          </>
                        ) : null}
                        {canStartPlanSteps ? (
                          <Link
                            href={detailsHref}
                            className="inline-flex rounded border border-cyan-500/60 bg-cyan-500/10 px-2 py-1 text-[11px] text-cyan-200 hover:bg-cyan-500/20"
                          >
                            Zeiterfassung
                          </Link>
                        ) : (
                          <span className="rounded border border-slate-700 bg-slate-900 px-2 py-1 text-[11px] text-slate-400">
                            Nur Planansicht
                          </span>
                        )}
                      </div>
                    </div>

                    {canManageCardPlan ? (
                      <form action={updateEmployeeWorkCardPlan} className="space-y-2 rounded border border-slate-700/70 bg-slate-900/50 p-2">
                        <input type="hidden" name="redirectTo" value={listHref} />
                        <input type="hidden" name="cardId" value={row.id} />
                        <div className="grid gap-2 lg:grid-cols-[220px_1fr]">
                          <label className="text-xs text-slate-300">
                            Mitarbeiter
                            <select
                              name="assignedToUserId"
                              defaultValue={row.assignedToUserId ?? ""}
                              className="mt-1 w-full rounded border border-slate-700 bg-slate-950 px-2 py-1.5 text-xs text-slate-100"
                            >
                              <option value="">Nicht zugewiesen</option>
                              {employeeAccounts.map((account) => (
                                <option key={`assign-${row.id}-${account.userId}`} value={account.userId}>
                                  {getEmployeeLabel(account)}
                                </option>
                              ))}
                            </select>
                          </label>
                          <label className="text-xs text-slate-300">
                            Aufgabenhinweis
                            <input
                              name="plannedNote"
                              maxLength={300}
                              defaultValue={row.plannedNote ?? ""}
                              placeholder="z. B. zuerst Innen, dann Polieren"
                              className="mt-1 w-full rounded border border-slate-700 bg-slate-950 px-2 py-1.5 text-xs text-slate-100"
                            />
                          </label>
                        </div>

                        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                          {PLAN_STEP_OPTIONS.map((stepName) => (
                            <label key={`${row.id}-${stepName}`} className="cursor-pointer">
                              <input
                                type="checkbox"
                                name="plannedSteps"
                                value={stepName}
                                defaultChecked={row.plannedSteps.includes(stepName)}
                                className="peer sr-only"
                              />
                              <span className="inline-flex w-full items-center justify-center rounded border border-slate-700 bg-slate-950 px-2 py-2 text-xs font-semibold text-slate-300 transition peer-checked:border-cyan-500 peer-checked:bg-cyan-500/15 peer-checked:text-cyan-100">
                                {stepName}
                              </span>
                            </label>
                          ))}
                        </div>

                        <div className="flex justify-end">
                          <button className="rounded border border-cyan-500/60 bg-cyan-500/10 px-3 py-1.5 text-xs text-cyan-200 hover:bg-cyan-500/20">
                            Arbeitsplan speichern
                          </button>
                        </div>
                      </form>
                    ) : (
                      <div className="space-y-2 text-xs text-slate-300">
                        <div className="flex flex-wrap gap-2">
                          {(row.plannedSteps.length > 0 ? row.plannedSteps : PLAN_STEP_OPTIONS).map((stepName) => (
                            <span
                              key={`${row.id}-badge-${stepName}`}
                              className={`rounded border px-2 py-1 text-[11px] ${getPlanStepBadgeClass(stepName)}`}
                            >
                              {stepName}
                            </span>
                          ))}
                        </div>
                        {row.plannedNote ? (
                          <div className="rounded border border-slate-700 bg-slate-950/60 px-2 py-1 text-[11px] text-slate-300">
                            Hinweis: {row.plannedNote}
                          </div>
                        ) : null}
                      </div>
                    )}

                    {canStartPlanSteps ? (
                      <div className="rounded border border-slate-700/70 bg-slate-900/50 p-2">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="text-xs font-semibold text-slate-200">Schnellstart Zeiterfassung</div>
                          {row.activeStep ? (
                            <span className="rounded border border-emerald-500/50 bg-emerald-500/10 px-2 py-0.5 text-[11px] text-emerald-200">
                              Aktiv: {row.activeStep.name}
                            </span>
                          ) : (
                            <span className="text-[11px] text-slate-400">Kein Schritt aktiv</span>
                          )}
                        </div>
                        <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                          {quickStartSteps.map((stepName) => (
                            <form key={`${row.id}-start-${stepName}`} action={startEmployeeWorkStep}>
                              <input type="hidden" name="cardId" value={row.id} />
                              <input type="hidden" name="stepName" value={stepName} />
                              <button className={`w-full rounded border px-2 py-2 text-xs font-semibold transition ${getPlanStepButtonClass(stepName)}`}>
                                {stepName} starten
                              </button>
                            </form>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      ) : null}

      <div className="rounded border border-slate-800 bg-slate-800/60 p-3">
        <form className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end" method="get">
          <input type="hidden" name="module" value={moduleMode} />
          {canSwitchView && viewMode === "employer" ? (
            <input type="hidden" name="scope" value={cardsScope} />
          ) : null}
          <div className="w-full sm:w-auto">
            <label className="block text-[11px] text-slate-400">Arbeitstag</label>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <input
                type="date"
                name="from"
                defaultValue={fromInput}
                className="w-full rounded border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-slate-200 sm:w-40"
              />
              <span className="hidden text-slate-500 sm:inline">{DASH}</span>
              <input
                type="date"
                name="to"
                defaultValue={toInput}
                className="w-full rounded border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-slate-200 sm:w-40"
              />
            </div>
          </div>

          <div className="w-full sm:w-auto">
            <label className="block text-[11px] text-slate-400">Status</label>
            <AutoSubmitSelect
              name="status"
              defaultValue={statusFilter}
              className="w-full rounded border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-slate-200 sm:w-40"
            >
              <option value="all">Alle anzeigen</option>
              <option value="open">Offen</option>
              {canManageBilling && cardsScope === "active" ? (
                <option value="billing-ready">Bereit zur Abrechnung</option>
              ) : null}
            </AutoSubmitSelect>
          </div>
          <div className="w-full sm:w-auto">
            <label className="block text-[11px] text-slate-400">Sortierung</label>
            <AutoSubmitSelect
              name="sort"
              defaultValue={sortMode}
              className="w-full rounded border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-slate-200 sm:w-44"
            >
              <option value="date">Datum</option>
              <option value="number">Nummer</option>
            </AutoSubmitSelect>
          </div>
          {canFilterByAssignment ? (
            <div className="w-full sm:w-auto">
              <label className="block text-[11px] text-slate-400">Zuweisung</label>
              <AutoSubmitSelect
                name="assignedTo"
                defaultValue={assignedToFilter}
                className="w-full rounded border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-slate-200 sm:w-56"
              >
                <option value="">Alle Mitarbeiter</option>
                <option value="unassigned">Nicht zugewiesen</option>
                {employeeAccounts.map((account) => (
                  <option key={`filter-assigned-${account.userId}`} value={account.userId}>
                    {getEmployeeLabel(account)}
                  </option>
                ))}
              </AutoSubmitSelect>
            </div>
          ) : null}
          {canFilterEmployeeViewByMember ? (
            <div className="w-full sm:w-auto">
              <label className="block text-[11px] text-slate-400">Mitarbeiter</label>
              <AutoSubmitSelect
                name="memberUser"
                defaultValue={memberUserFilter}
                className="w-full rounded border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-slate-200 sm:w-56"
              >
                <option value="">Alle Mitarbeiter</option>
                {employeeAccounts.map((account) => (
                  <option key={`filter-member-${account.userId}`} value={account.userId}>
                    {getEmployeeLabel(account)}
                  </option>
                ))}
              </AutoSubmitSelect>
            </div>
          ) : null}

          {canSwitchView ? <input type="hidden" name="view" value={viewMode} /> : null}

          <div className="flex w-full items-center gap-2 sm:ml-auto sm:w-auto">
            <input
              name="q"
              defaultValue={q}
              placeholder="Suchen"
              className="w-full rounded border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-slate-200 sm:w-56"
            />
            <button
              type="submit"
              className="rounded bg-slate-800 px-3 py-1 text-xs hover:bg-slate-700"
            >
              Filtern
            </button>
          </div>
        </form>
      </div>

      <div className="overflow-x-auto rounded border border-slate-800 bg-slate-800/60">
        <table className="w-full min-w-[1120px] text-sm">
          <thead className="text-slate-300">
            <tr className="border-b border-slate-700">
              <th className="p-3 text-left">#</th>
              <th className="p-3 text-left">Karte-ID</th>
              <th className="p-3 text-left">Plan</th>
              <th className="p-3 text-left">Arbeitstag</th>
              {viewMode === "employer" ? <th className="p-3 text-left">Zugewiesen</th> : null}
              <th className="p-3 text-left">Kunde</th>
              <th className="p-3 text-left">Fahrzeug</th>
              <th className="p-3 text-left">Kennzeichen</th>
              <th className="p-3 text-left">Status</th>
              {canManageBilling ? <th className="p-3 text-left">Abrechnung</th> : null}
              <th className="p-3 text-right">Zeit gesamt</th>
              <th className="p-3 text-right">Aktionen</th>
            </tr>
          </thead>
          <tbody>
            {visibleRows.map((row, idx) => {
              const detailsHref = `/employees/cards/${row.id}?back=${encodeURIComponent(listHref)}`;
              const editHref = `/employees/cards/${row.id}/edit?back=${encodeURIComponent(listHref)}`;
              return (
                <tr key={row.id} className="border-b border-slate-700 last:border-b-0">
                  <td className="p-3 text-slate-400">{idx + 1}</td>
                  <td className="p-3">
                    <div className="font-semibold text-cyan-300">AK-{row.shortId}</div>
                    {row.activeStep ? (
                      <div className="text-xs text-emerald-300">Aktiv: {row.activeStep.name}</div>
                    ) : null}
                  </td>
                  <td className="p-3 text-xs text-slate-300">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded border border-cyan-500/50 bg-cyan-500/10 px-2 py-0.5 text-[11px] font-semibold text-cyan-200">
                        {planQueueByCardId.get(row.id) ? `Plan #${planQueueByCardId.get(row.id)}` : "Kein Plan"}
                      </span>
                      <span className="text-[11px] text-slate-400">
                        Priorität:{" "}
                        {planQueueByCardId.get(row.id)
                          ? `#${planQueueByCardId.get(row.id)}`
                          : row.planRank
                            ? `#${row.planRank}`
                            : DASH}
                      </span>
                    </div>
                    <div className="mt-1 text-[11px] text-slate-500">
                      Schritte: {(row.plannedSteps.length > 0 ? row.plannedSteps : PLAN_STEP_OPTIONS).join(", ")}
                    </div>
                  </td>
                  <td className="p-3 text-slate-300">{formatDate(row.workDate)}</td>
                  {viewMode === "employer" ? (
                    <td className="p-3 text-slate-300">
                      <div>{row.assignedToDisplay ?? "Nicht zugewiesen"}</div>
                      <div className="text-[11px] text-slate-500">Erstellt von: {row.createdByEmail}</div>
                    </td>
                  ) : null}
                  <td className="p-3 text-slate-200">{row.customerName}</td>
                  <td className="p-3 text-slate-200">{row.vehicleLabel}</td>
                  <td className="p-3 text-slate-200">{row.licensePlate}</td>
                  <td className="p-3">
                    <StatusBadge
                      status={row.status}
                      invoiceDocumentId={row.invoiceDocumentId}
                      readyForBilling={row.readyForBilling}
                    />
                    {row.archivedAt ? (
                      <div className="mt-1 text-[11px] text-fuchsia-300">
                        Archiviert: {formatDate(row.archivedAt)}
                      </div>
                    ) : null}
                  </td>
                  {canManageBilling ? (
                    <td className="p-3 text-slate-300">
                      {row.invoiceDocumentId ? (
                        <Link
                          href={`/documents/${row.invoiceDocumentId}/edit`}
                          className="text-cyan-300 hover:underline"
                        >
                          {"Rechnung \u00f6ffnen"}
                        </Link>
                      ) : row.readyForBilling ? (
                        <span className="text-amber-300">
                          bereit seit {formatDateTime(row.billingReadyAt ?? row.workDate)}
                        </span>
                      ) : (
                        DASH
                      )}
                    </td>
                  ) : null}
                  <td className="p-3 text-right text-slate-200">{formatDuration(row.totalSeconds)}</td>
                  <td className="p-3 text-right">
                    <div className="flex justify-end gap-2">
                      <ActionLink href={detailsHref} title={"\u00d6ffnen"} tone="cyan">
                        <IconSearch />
                      </ActionLink>
                      <ActionLink href={editHref} title="Bearbeiten" tone="indigo">
                        <IconPencil />
                      </ActionLink>
                      {canManageBilling && row.readyForBilling ? (
                        <ConvertWorkCardToInvoiceButton
                          action={createInvoiceFromEmployeeWorkCard}
                          cardId={row.id}
                          redirectTo={listHref}
                          companyHourlyRateCents={companyHourlyRateCents}
                          customerHourlyRateCents={row.customerHourlyRateCents}
                          label="In Rechnung"
                          className="rounded border border-cyan-500/60 bg-cyan-500/10 px-2 py-1 text-[11px] text-cyan-200 hover:bg-cyan-500/20"
                        />
                      ) : null}
                      {canManageArchive && cardsScope === "active" && row.invoiceDocumentId ? (
                        <form action={archiveEmployeeWorkCard}>
                          <input type="hidden" name="redirectTo" value={listHref} />
                          <input type="hidden" name="cardId" value={row.id} />
                          <button className="rounded border border-fuchsia-500/60 bg-fuchsia-500/10 px-2 py-1 text-[11px] text-fuchsia-200 hover:bg-fuchsia-500/20">
                            Archivieren
                          </button>
                        </form>
                      ) : null}
                      {canManageArchive && cardsScope === "archive" ? (
                        <form action={restoreEmployeeWorkCardFromArchive}>
                          <input type="hidden" name="redirectTo" value={listHref} />
                          <input type="hidden" name="cardId" value={row.id} />
                          <button className="rounded border border-cyan-500/60 bg-cyan-500/10 px-2 py-1 text-[11px] text-cyan-200 hover:bg-cyan-500/20">
                            Wiederherstellen
                          </button>
                        </form>
                      ) : null}
                      {cardsScope === "active" && row.status === "OPEN" ? (
                        <form action={closeEmployeeWorkCard}>
                          <input type="hidden" name="cardId" value={row.id} />
                          <button className="rounded border border-amber-500/60 bg-amber-500/10 px-2 py-1 text-[11px] text-amber-200 hover:bg-amber-500/20">
                            {"Abschlie\u00dfen"}
                          </button>
                        </form>
                      ) : cardsScope === "active" && row.invoiceDocumentId ? (
                        <span className="rounded border border-slate-700 bg-slate-900/70 px-2 py-1 text-[11px] text-slate-400">
                          Abgerechnet
                        </span>
                      ) : cardsScope === "active" ? (
                        <form action={reopenEmployeeWorkCard}>
                          <input type="hidden" name="cardId" value={row.id} />
                          <button className="rounded border border-cyan-500/60 bg-cyan-500/10 px-2 py-1 text-[11px] text-cyan-200 hover:bg-cyan-500/20">
                            {"\u00d6ffnen"}
                          </button>
                        </form>
                      ) : null}
                    </div>
                  </td>
                </tr>
              );
            })}

            {visibleRows.length === 0 && (
              <tr>
                <td className="p-6 text-slate-400" colSpan={tableColSpan}>
                  {"Keine Arbeitskarten im gew\u00e4hlten Zeitraum."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
        </>
      ) : null}

      {canSwitchView && moduleMode === "staff" ? (
        <section className="rounded border border-slate-800 bg-slate-800/60 p-4">
          <h2 className="text-sm font-semibold text-slate-200">Mitarbeiter verwalten</h2>
          <p className="mt-1 text-xs text-slate-400">
            Benutzername ist systemweit eindeutig. Mitarbeiter haben nur Zugriff auf Arbeitskarten.
          </p>

          {employeeUserMessage ? (
            <div className="mt-3 rounded border border-cyan-500/30 bg-cyan-500/10 px-3 py-2 text-xs text-cyan-200">
              {employeeUserMessage}
            </div>
          ) : null}
          {workPlanMessage ? (
            <div className="mt-3 rounded border border-indigo-500/30 bg-indigo-500/10 px-3 py-2 text-xs text-indigo-200">
              {workPlanMessage}
            </div>
          ) : null}

          <div className="mt-4 rounded border border-slate-700 bg-slate-900/40 p-3">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-300">
              Neuer Mitarbeiter-Zugang
            </h3>
            <form action={createEmployeeLoginAccount} className="mt-3 grid gap-3 md:grid-cols-3">
              <input type="hidden" name="redirectTo" value={listHref} />
              <input
                name="fullName"
                placeholder="Name (optional)"
                className="rounded border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100"
              />
              <input
                name="username"
                type="text"
                required
                minLength={3}
                maxLength={32}
                pattern="[a-z0-9._-]{3,32}"
                placeholder="benutzername"
                className="rounded border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100"
              />
              <input
                name="password"
                type="password"
                required
                minLength={8}
                placeholder="Passwort (min. 8 Zeichen)"
                className="rounded border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100"
              />
              <div className="md:col-span-3">
                <button className="rounded bg-cyan-600 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-500">
                  Mitarbeiter-Zugang anlegen
                </button>
              </div>
            </form>
          </div>

          <div className="mt-4">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-300">
              Bestehende Mitarbeiter
            </h3>
            {employeeAccounts.length === 0 ? (
              <p className="mt-2 text-xs text-slate-400">Noch keine Mitarbeiter angelegt.</p>
            ) : (
              <div className="mt-3 space-y-3">
                {employeeAccounts.map((account) => (
                  <div
                    key={account.userId}
                    className="rounded border border-slate-700 bg-slate-900/40 p-3"
                  >
                    <div className="grid gap-3 lg:grid-cols-[1fr_auto]">
                      <form
                        action={updateEmployeeLoginAccount}
                        className="grid gap-2 sm:grid-cols-2 lg:items-end"
                      >
                        <input type="hidden" name="redirectTo" value={listHref} />
                        <input type="hidden" name="userId" value={account.userId} />
                        <input
                          name="fullName"
                          defaultValue={account.fullName ?? ""}
                          placeholder="Name (optional)"
                          className="rounded border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100"
                        />
                        <input
                          name="username"
                          defaultValue={account.username}
                          required
                          minLength={3}
                          maxLength={32}
                          pattern="[a-z0-9._-]{3,32}"
                          className="rounded border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100"
                        />
                        <div className="sm:col-span-2 flex flex-wrap items-center gap-3">
                          <span className="text-xs text-slate-400">
                            Angelegt: {formatDateTime(account.createdAt)}
                          </span>
                          <button className="rounded border border-cyan-500/60 bg-cyan-500/10 px-3 py-1.5 text-xs text-cyan-200 hover:bg-cyan-500/20">
                            Speichern
                          </button>
                        </div>
                      </form>

                      <div className="space-y-2 lg:w-64">
                        <form action={setEmployeeLoginPassword} className="flex gap-2">
                          <input type="hidden" name="redirectTo" value={listHref} />
                          <input type="hidden" name="userId" value={account.userId} />
                          <input
                            name="password"
                            type="password"
                            required
                            minLength={8}
                            placeholder="Neues Passwort"
                            className="w-full rounded border border-slate-700 bg-slate-900 px-2 py-1.5 text-xs text-slate-100"
                          />
                          <button className="whitespace-nowrap rounded border border-emerald-500/60 bg-emerald-500/10 px-2 py-1.5 text-xs text-emerald-200 hover:bg-emerald-500/20">
                            Setzen
                          </button>
                        </form>
                        <form action={removeEmployeeLoginAccount}>
                          <input type="hidden" name="redirectTo" value={listHref} />
                          <input type="hidden" name="userId" value={account.userId} />
                          <button className="w-full rounded border border-rose-500/60 bg-rose-500/10 px-3 py-1.5 text-xs text-rose-200 hover:bg-rose-500/20">
                            Mitarbeiter entfernen
                          </button>
                        </form>
                      </div>
                    </div>

                    <div className="mt-4 rounded border border-slate-700/80 bg-slate-900/70 p-3">
                      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                        <div className="text-xs font-semibold uppercase tracking-wide text-slate-300">
                          Arbeitsplan
                        </div>
                        <div className="text-xs text-slate-400">
                          Leere Felder speichern = Tag frei
                        </div>
                      </div>
                      <div className="space-y-2">
                        {WORK_PLAN_DAYS.map((day) => {
                          const current = workPlanByMemberDay.get(
                            `${account.userId}:${day.dayOfWeek}`
                          );
                          return (
                            <form
                              key={`${account.userId}-${day.dayOfWeek}`}
                              action={saveEmployeeWorkPlan}
                              className="grid gap-2 rounded border border-slate-700/70 bg-slate-900/40 p-2 md:grid-cols-[110px_140px_140px_1fr_auto]"
                            >
                              <input type="hidden" name="redirectTo" value={listHref} />
                              <input type="hidden" name="userId" value={account.userId} />
                              <input type="hidden" name="dayOfWeek" value={String(day.dayOfWeek)} />
                              <div className="flex items-center text-xs font-medium text-slate-300">
                                {day.label}
                              </div>
                              <input
                                name="startTime"
                                type="time"
                                defaultValue={formatTimeInputValue(current?.startTime)}
                                className="rounded border border-slate-700 bg-slate-950 px-2 py-1.5 text-xs text-slate-100"
                              />
                              <input
                                name="endTime"
                                type="time"
                                defaultValue={formatTimeInputValue(current?.endTime)}
                                className="rounded border border-slate-700 bg-slate-950 px-2 py-1.5 text-xs text-slate-100"
                              />
                              <input
                                name="note"
                                defaultValue={current?.note ?? ""}
                                maxLength={240}
                                placeholder="Hinweis (optional)"
                                className="rounded border border-slate-700 bg-slate-950 px-2 py-1.5 text-xs text-slate-100"
                              />
                              <button className="rounded border border-cyan-500/60 bg-cyan-500/10 px-3 py-1.5 text-xs text-cyan-200 hover:bg-cyan-500/20">
                                Speichern
                              </button>
                            </form>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      ) : null}
    </div>
  );
}


