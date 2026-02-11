"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getSessionFromCookies } from "@/lib/auth";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { DocumentStatus, Prisma } from "@prisma/client";
import {
  createMemberUserInWorkspace,
  listMemberUsersInWorkspace,
  removeMemberUserFromWorkspace,
  setMemberUserPasswordInWorkspace,
  updateMemberUserInWorkspace,
} from "@/lib/auth-db";
import { ensureWorkspaceDatabase } from "@/lib/tenant-db";

function asText(value: FormDataEntryValue | null): string | null {
  const text = String(value ?? "").trim();
  return text || null;
}

function asId(value: FormDataEntryValue | null): string | null {
  const id = String(value ?? "").trim();
  return id || null;
}

function asPositiveInt(value: FormDataEntryValue | null): number | null {
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) return null;
  const rounded = Math.round(parsed);
  if (rounded <= 0) return null;
  return rounded;
}

function parseDateInputToUtcStart(value: FormDataEntryValue | null): Date | null {
  const raw = String(value ?? "").trim();
  const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return null;

  const date = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
  if (Number.isNaN(date.getTime())) return null;
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() + 1 !== month ||
    date.getUTCDate() !== day
  ) {
    return null;
  }
  return date;
}

function asDayOfWeek(value: FormDataEntryValue | null): number | null {
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) return null;
  const day = Math.trunc(parsed);
  if (day < 1 || day > 7) return null;
  return day;
}

function asTime(value: FormDataEntryValue | null): string | null {
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  if (!/^([01]\d|2[0-3]):([0-5]\d)$/.test(raw)) return null;
  return raw;
}

function asPlanRank(value: FormDataEntryValue | null): number | "invalid" | null {
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) return "invalid";
  const rank = Math.trunc(parsed);
  if (rank < 1 || rank > 999) return "invalid";
  return rank;
}

function getDurationSeconds(startedAt: Date, endedAt: Date): number {
  const deltaMs = endedAt.getTime() - startedAt.getTime();
  if (!Number.isFinite(deltaMs) || deltaMs <= 0) return 0;
  return Math.floor(deltaMs / 1000);
}

function normalizeRedirectPath(value: string | null): string | null {
  if (!value) return null;
  if (!value.startsWith("/") || value.startsWith("//")) return null;
  return value;
}

function isValidUsername(value: string): boolean {
  return /^[a-z0-9._-]{3,32}$/.test(value);
}

function withStatus(path: string, key: string, value: string): string {
  const url = new URL(path, "http://local");
  url.searchParams.set(key, value);
  return `${url.pathname}${url.search}`;
}

function revalidateEmployeesModule() {
  revalidatePath("/employees");
}

function formatHoursMinutesSeconds(totalSeconds: number) {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const seconds = safe % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(
    seconds
  ).padStart(2, "0")}`;
}

function calcLineTotals(params: {
  qty: number;
  unitNetCents: number;
  vatRate: number;
  discountPct?: number;
}) {
  const qty = Number(params.qty) || 0;
  const unitNetCents = Number(params.unitNetCents) || 0;
  const discountPct = Number(params.discountPct) || 0;
  const vatRate = Number(params.vatRate) || 0;

  const rawNet = Math.round(qty * unitNetCents);
  const lineNetCents = Math.round(rawNet * (1 - discountPct / 100));
  const lineVatCents = Math.round(lineNetCents * (vatRate / 100));
  const lineGrossCents = lineNetCents + lineVatCents;

  return { lineNetCents, lineVatCents, lineGrossCents };
}

function getCustomerDisplayName(customer?: {
  name?: string | null;
  companyName?: string | null;
  contactFirstName?: string | null;
  contactLastName?: string | null;
  isBusiness?: boolean;
} | null): string | null {
  if (!customer) return null;
  const directName = String(customer.name ?? "").trim();
  if (directName) return directName;
  const companyName = String(customer.companyName ?? "").trim();
  if (companyName) return companyName;
  const contact = `${String(customer.contactFirstName ?? "").trim()} ${String(
    customer.contactLastName ?? ""
  ).trim()}`.trim();
  if (contact) return contact;
  return customer.isBusiness ? "Gewerbekunde" : null;
}

function formatMemberLabel(member: { username: string; fullName: string | null }): string {
  const fullName = String(member.fullName ?? "").trim();
  if (fullName) return `${fullName} (${member.username})`;
  return member.username;
}

function findWorkspaceMemberByUserId(workspaceId: string, userId: string) {
  const members = listMemberUsersInWorkspace(workspaceId);
  return members.find((member) => member.userId === userId) ?? null;
}

type PrismaDmmfField = { name: string };
type PrismaDmmfModel = { name: string; fields: PrismaDmmfField[] };
type PrismaDmmfRoot = { datamodel?: { models?: PrismaDmmfModel[] } };

const EMPLOYEE_WORK_CARD_FIELDS = (() => {
  const prismaMeta = Prisma as unknown as { dmmf?: PrismaDmmfRoot };
  const model = prismaMeta.dmmf?.datamodel?.models?.find(
    (candidate) => candidate.name === "EmployeeWorkCard"
  );
  return new Set((model?.fields ?? []).map((field) => field.name));
})();

function employeeWorkCardSupportsField(fieldName: string): boolean {
  return EMPLOYEE_WORK_CARD_FIELDS.has(fieldName);
}

type PlanStepName = "Innen" | "Au\u00dfen" | "Polieren" | "Sonstiges";

const WORK_STEP_OPTIONS = new Set(["Innen", "Aussen", "Au\u00dfen", "Polieren", "Sonstiges"]);

function normalizePlanStepName(value: string): PlanStepName | null {
  const raw = String(value ?? "").trim().toLowerCase();
  if (!raw) return null;
  const normalized = raw
    .replaceAll("\u00e4", "ae")
    .replaceAll("\u00f6", "oe")
    .replaceAll("\u00fc", "ue")
    .replaceAll("\u00df", "ss");

  if (normalized.includes("innen")) return "Innen";
  if (normalized.includes("aussen")) return "Au\u00dfen";
  if (normalized.includes("polier")) return "Polieren";
  if (normalized.includes("sonstig")) return "Sonstiges";
  return null;
}

function parsePlannedStepsFromFormData(formData: FormData): PlanStepName[] {
  const values = formData.getAll("plannedSteps");
  const seen = new Set<PlanStepName>();
  const planned: PlanStepName[] = [];

  for (const value of values) {
    const parsed = normalizePlanStepName(String(value ?? ""));
    if (!parsed || seen.has(parsed)) continue;
    seen.add(parsed);
    planned.push(parsed);
  }

  return planned;
}

function encodePlannedSteps(plannedSteps: PlanStepName[]): string | null {
  if (plannedSteps.length === 0) return null;
  return plannedSteps.join("|");
}

type WorkStepCategory = "INNEN" | "AUSSEN" | "POLIEREN" | "SONSTIGES";

function normalizeWorkStepCategory(stepName: string): WorkStepCategory {
  const raw = String(stepName ?? "").trim().toLowerCase();
  if (!raw) return "SONSTIGES";

  const normalized = raw
    .replaceAll("\u00e4", "ae")
    .replaceAll("\u00f6", "oe")
    .replaceAll("\u00fc", "ue")
    .replaceAll("\u00df", "ss");

  if (normalized.includes("innen")) return "INNEN";
  if (normalized.includes("aussen")) return "AUSSEN";
  if (normalized.includes("polier")) return "POLIEREN";
  return "SONSTIGES";
}

function getWorkStepInvoiceTitle(category: WorkStepCategory): string {
  if (category === "INNEN") return "Innenaufbereitung";
  if (category === "AUSSEN") return "Au\u00dfenw\u00e4sche";
  if (category === "POLIEREN") return "Polieren";
  return "Sonstiges";
}

function mapInvoiceCreationErrorToStatus(error: unknown): string {
  if (error instanceof Prisma.PrismaClientValidationError) {
    return "schema-mismatch";
  }
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") return "conflict";
    if (error.code === "P2003") return "missing-relation";
    if (error.code === "P2025") return "reference-not-found";
  }

  const message = error instanceof Error ? error.message : "";
  if (
    message.includes("Unknown argument") ||
    message.includes("invoiceDocumentId") ||
    message.includes("sourceOfferId") ||
    message.includes("billingReadyAt")
  ) {
    return "schema-mismatch";
  }
  return "error";
}

function buildBilledWorkCardUpdateData(params: {
  invoiceDocumentId: string;
  customerId?: string | null;
  vehicleId?: string | null;
}): Prisma.EmployeeWorkCardUpdateInput {
  const data: Prisma.EmployeeWorkCardUpdateInput = {};
  if (employeeWorkCardSupportsField("invoiceDocumentId")) {
    data.invoiceDocumentId = params.invoiceDocumentId;
  }
  if (params.customerId !== undefined && employeeWorkCardSupportsField("customerId")) {
    data.customerId = params.customerId;
  }
  if (params.vehicleId !== undefined && employeeWorkCardSupportsField("vehicleId")) {
    data.vehicleId = params.vehicleId;
  }
  if (employeeWorkCardSupportsField("archivedAt")) {
    data.archivedAt = new Date();
  }
  return data;
}

type OpenPlanQueueItem = {
  id: string;
  planRank: number | null;
  workDate: Date;
  createdAt: Date;
};

function sortOpenPlanQueueItems(items: OpenPlanQueueItem[]): OpenPlanQueueItem[] {
  return [...items].sort((a, b) => {
    const rankA = a.planRank ?? Number.MAX_SAFE_INTEGER;
    const rankB = b.planRank ?? Number.MAX_SAFE_INTEGER;
    if (rankA !== rankB) return rankA - rankB;

    const workDateDelta = a.workDate.getTime() - b.workDate.getTime();
    if (workDateDelta !== 0) return workDateDelta;

    const createdAtDelta = a.createdAt.getTime() - b.createdAt.getTime();
    if (createdAtDelta !== 0) return createdAtDelta;

    return a.id.localeCompare(b.id);
  });
}

async function listOpenPlanQueue(tx: Prisma.TransactionClient): Promise<OpenPlanQueueItem[]> {
  if (!employeeWorkCardSupportsField("planRank")) return [];

  const where: Prisma.EmployeeWorkCardWhereInput = { status: "OPEN" };
  if (employeeWorkCardSupportsField("invoiceDocumentId")) {
    where.invoiceDocumentId = null;
  }
  if (employeeWorkCardSupportsField("archivedAt")) {
    where.archivedAt = null;
  }

  const cards = await tx.employeeWorkCard.findMany({
    where,
    select: {
      id: true,
      planRank: true,
      workDate: true,
      createdAt: true,
    },
  });

  return sortOpenPlanQueueItems(cards);
}

async function persistOpenPlanQueue(
  tx: Prisma.TransactionClient,
  orderedCards: OpenPlanQueueItem[]
): Promise<void> {
  if (!employeeWorkCardSupportsField("planRank")) return;

  for (let index = 0; index < orderedCards.length; index += 1) {
    const nextRank = index + 1;
    const current = orderedCards[index];
    if (current.planRank === nextRank) continue;

    await tx.employeeWorkCard.update({
      where: { id: current.id },
      data: { planRank: nextRank },
    });
    current.planRank = nextRank;
  }
}

async function normalizeOpenPlanQueue(tx: Prisma.TransactionClient): Promise<OpenPlanQueueItem[]> {
  const orderedCards = await listOpenPlanQueue(tx);
  await persistOpenPlanQueue(tx, orderedCards);
  return orderedCards;
}

async function placeCardInOpenPlanQueue(
  tx: Prisma.TransactionClient,
  cardId: string,
  targetRank: number | null
): Promise<"saved" | "not-found"> {
  if (!employeeWorkCardSupportsField("planRank")) return "saved";

  const orderedCards = await normalizeOpenPlanQueue(tx);
  const currentIndex = orderedCards.findIndex((card) => card.id === cardId);
  if (currentIndex < 0) return "not-found";

  const [cardEntry] = orderedCards.splice(currentIndex, 1);
  if (!cardEntry) return "not-found";

  const insertIndex =
    typeof targetRank === "number"
      ? Math.max(0, Math.min(orderedCards.length, targetRank - 1))
      : orderedCards.length;
  orderedCards.splice(insertIndex, 0, cardEntry);
  await persistOpenPlanQueue(tx, orderedCards);
  return "saved";
}

async function moveCardInOpenPlanQueue(
  tx: Prisma.TransactionClient,
  cardId: string,
  direction: "up" | "down"
): Promise<"moved" | "not-found" | "noop"> {
  if (!employeeWorkCardSupportsField("planRank")) return "noop";

  const orderedCards = await normalizeOpenPlanQueue(tx);
  const currentIndex = orderedCards.findIndex((card) => card.id === cardId);
  if (currentIndex < 0) return "not-found";

  const targetIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
  if (targetIndex < 0 || targetIndex >= orderedCards.length) return "noop";

  const [cardEntry] = orderedCards.splice(currentIndex, 1);
  if (!cardEntry) return "not-found";
  orderedCards.splice(targetIndex, 0, cardEntry);
  await persistOpenPlanQueue(tx, orderedCards);
  return "moved";
}

export async function createEmployeeWorkCard(formData: FormData) {
  const customerId = asId(formData.get("customerId"));
  const vehicleIdInput = asId(formData.get("vehicleId"));
  const vehicleCreationMode = String(formData.get("vehicleCreationMode") ?? "")
    .trim()
    .toLowerCase();
  const isManualVehicleMode = vehicleCreationMode === "manual";
  const vehicleId = isManualVehicleMode ? null : vehicleIdInput;
  const planRank = asPlanRank(formData.get("planRank"));
  const plannedSteps = parsePlannedStepsFromFormData(formData);
  const plannedNote = asText(formData.get("plannedNote"));
  const customerNameInput = asText(formData.get("customerName"));
  const vehicleMakeInput = isManualVehicleMode ? asText(formData.get("vehicleMake")) : null;
  const vehicleModelInput = isManualVehicleMode ? asText(formData.get("vehicleModel")) : null;
  const licensePlate = isManualVehicleMode ? asText(formData.get("licensePlate")) : null;
  const notes = asText(formData.get("notes"));
  const assignedToUserIdInput = asId(formData.get("assignedToUserId"));
  const workDate = parseDateInputToUtcStart(formData.get("workDate")) ?? new Date();
  const redirectTo = normalizeRedirectPath(asText(formData.get("redirectTo")));
  const session = await getSessionFromCookies();
  const selectedCustomer = customerId
    ? await prisma.customer.findUnique({
        where: { id: customerId },
        select: {
          id: true,
          name: true,
          companyName: true,
          contactFirstName: true,
          contactLastName: true,
          isBusiness: true,
        },
      })
    : null;
  const selectedVehicleRaw = vehicleId
    ? await prisma.vehicle.findUnique({
        where: { id: vehicleId },
        select: {
          id: true,
          make: true,
          model: true,
          vin: true,
          customerId: true,
        },
      })
    : null;
  const selectedVehicle = selectedVehicleRaw?.customerId ? selectedVehicleRaw : null;

  const preferredCustomerId = selectedCustomer?.id ?? selectedVehicle?.customerId ?? customerId ?? null;
  const resolvedCustomer =
    preferredCustomerId && preferredCustomerId !== selectedCustomer?.id
      ? await prisma.customer.findUnique({
          where: { id: preferredCustomerId },
          select: {
            id: true,
            name: true,
            companyName: true,
            contactFirstName: true,
            contactLastName: true,
            isBusiness: true,
          },
        })
      : selectedCustomer;

  const manualVehicleMake = vehicleMakeInput;
  const manualVehicleModel = vehicleModelInput;
  const manualLicensePlate = licensePlate;
  const hasManualVehicleData = Boolean(manualVehicleMake || manualVehicleModel || manualLicensePlate);

  let createdVehicle:
    | {
        id: string;
        make: string | null;
        model: string | null;
        vin: string | null;
      }
    | null = null;

  if (!selectedVehicle && hasManualVehicleData) {
    createdVehicle = await prisma.vehicle.create({
      data: {
        make: manualVehicleMake ?? null,
        model: manualVehicleModel ?? null,
        vin: manualLicensePlate ?? null,
        customerId: null,
        isStock: false,
        isSold: false,
      },
      select: {
        id: true,
        make: true,
        model: true,
        vin: true,
      },
    });
  }

  const customerName = getCustomerDisplayName(resolvedCustomer) || customerNameInput;
  const vehicleMake = selectedVehicle?.make?.trim() || createdVehicle?.make?.trim() || manualVehicleMake;
  const vehicleModel =
    selectedVehicle?.model?.trim() || createdVehicle?.model?.trim() || manualVehicleModel;
  const resolvedCustomerId = resolvedCustomer?.id ?? selectedVehicle?.customerId ?? null;
  const resolvedVehicleId = selectedVehicle?.id ?? createdVehicle?.id ?? null;
  const resolvedLicensePlate =
    selectedVehicle?.vin?.trim() || createdVehicle?.vin?.trim() || manualLicensePlate;
  const hasCustomerData = Boolean(resolvedCustomerId || customerName);
  const hasVehicleData = Boolean(resolvedVehicleId || vehicleMake || vehicleModel || resolvedLicensePlate);

  if (!hasVehicleData) {
    if (redirectTo) redirect(withStatus(redirectTo, "card", "invalid-vehicle"));
    return;
  }
  if (!hasCustomerData && !resolvedLicensePlate) {
    if (redirectTo) redirect(withStatus(redirectTo, "card", "vin-required-no-customer"));
    return;
  }
  if (planRank === "invalid") {
    if (redirectTo) redirect(withStatus(redirectTo, "cardPlan", "invalid"));
    return;
  }

  let assignedToUserId: string | null = null;
  let assignedToLabel: string | null = null;
  if (session?.role === "OWNER" && assignedToUserIdInput) {
    const assignedMember = findWorkspaceMemberByUserId(session.workspaceId, assignedToUserIdInput);
    if (!assignedMember) {
      if (redirectTo) redirect(withStatus(redirectTo, "card", "invalid-assignee"));
      return;
    }
    assignedToUserId = assignedMember.userId;
    assignedToLabel = formatMemberLabel(assignedMember);
  } else if (session?.role === "MEMBER" && session.userId) {
    assignedToUserId = session.userId;
    assignedToLabel = session.username ?? session.email ?? null;
  }

  const workCardCreateData: Prisma.EmployeeWorkCardCreateInput = {
    customerName,
    vehicleMake,
    vehicleModel,
    licensePlate: resolvedLicensePlate,
    notes,
    workDate,
    createdByUserId: session?.userId ?? null,
    createdByEmail: session?.username ?? session?.email ?? null,
    status: "OPEN",
  };

  if (employeeWorkCardSupportsField("customerId")) {
    workCardCreateData.customerId = resolvedCustomerId;
  }
  if (employeeWorkCardSupportsField("vehicleId")) {
    workCardCreateData.vehicleId = resolvedVehicleId;
  }
  if (employeeWorkCardSupportsField("planRank")) {
    workCardCreateData.planRank = planRank;
  }
  if (employeeWorkCardSupportsField("plannedSteps")) {
    workCardCreateData.plannedSteps = encodePlannedSteps(plannedSteps);
  }
  if (employeeWorkCardSupportsField("plannedNote")) {
    workCardCreateData.plannedNote = plannedNote?.slice(0, 300) ?? null;
  }
  if (employeeWorkCardSupportsField("assignedToUserId")) {
    workCardCreateData.assignedToUserId = assignedToUserId;
  }
  if (employeeWorkCardSupportsField("assignedToLabel")) {
    workCardCreateData.assignedToLabel = assignedToLabel;
  }

  const desiredPlanRank = typeof planRank === "number" ? planRank : null;
  await prisma.$transaction(async (tx) => {
    const createdCard = await tx.employeeWorkCard.create({
      data: workCardCreateData,
      select: { id: true },
    });
    await placeCardInOpenPlanQueue(tx, createdCard.id, desiredPlanRank);
  });

  revalidateEmployeesModule();

  if (redirectTo) {
    redirect(withStatus(redirectTo, "card", "created"));
  }
}

export async function createInvoiceFromEmployeeWorkCard(formData: FormData) {
  const cardId = asId(formData.get("cardId"));
  const redirectTo =
    normalizeRedirectPath(asText(formData.get("redirectTo"))) ??
    "/employees?module=cards&view=employee";
  const hourlyRateInputRaw = String(formData.get("hourlyRateCents") ?? "").trim();
  const selectedHourlyRateCents = asPositiveInt(formData.get("hourlyRateCents"));
  const session = await getSessionFromCookies();

  if (!session || session.role !== "OWNER") {
    redirect(withStatus(redirectTo, "card", "forbidden"));
  }
  if (!cardId) {
    redirect(withStatus(redirectTo, "card", "invalid"));
  }
  if (hourlyRateInputRaw && !selectedHourlyRateCents) {
    redirect(withStatus(redirectTo, "card", "invalid-rate"));
  }

  let invoiceResult: {
    id: string;
    requireDataEntry: boolean;
    missingCustomer: boolean;
    missingVehicle: boolean;
  };
  try {
    invoiceResult = await prisma.$transaction(async (tx) => {
      const card = await tx.employeeWorkCard.findUnique({
        where: { id: cardId },
        include: {
          steps: {
            orderBy: { startedAt: "asc" },
            select: {
              id: true,
              name: true,
              startedAt: true,
              endedAt: true,
              durationSeconds: true,
            },
          },
        },
      });

      if (!card) {
        throw new Error("WORK_CARD_NOT_FOUND");
      }
      const cardMarker = `AK-${card.id.slice(-8).toUpperCase()}`;
      const existingInvoiceByMarker = await tx.document.findFirst({
        where: {
          docType: "INVOICE",
          notesInternal: { contains: cardMarker },
        },
        select: {
          id: true,
          customerId: true,
          vehicleId: true,
          vehicleMake: true,
          vehicleModel: true,
          vehicleVin: true,
        },
      });
      if (existingInvoiceByMarker) {
        const billedCardUpdateData = buildBilledWorkCardUpdateData({
          invoiceDocumentId: existingInvoiceByMarker.id,
        });
        if (Object.keys(billedCardUpdateData).length > 0) {
          await tx.employeeWorkCard.update({
            where: { id: card.id },
            data: billedCardUpdateData,
          });
        }

        const missingCustomer = !existingInvoiceByMarker.customerId;
        const missingVehicle =
          !existingInvoiceByMarker.vehicleId &&
          !existingInvoiceByMarker.vehicleMake &&
          !existingInvoiceByMarker.vehicleModel &&
          !existingInvoiceByMarker.vehicleVin;
        return {
          id: existingInvoiceByMarker.id,
          requireDataEntry: missingCustomer || missingVehicle,
          missingCustomer,
          missingVehicle,
        };
      }
      if (card.invoiceDocumentId) {
        const existingInvoice = await tx.document.findUnique({
          where: { id: card.invoiceDocumentId },
          select: {
            id: true,
            customerId: true,
            vehicleId: true,
            vehicleMake: true,
            vehicleModel: true,
            vehicleVin: true,
          },
        });
        if (existingInvoice) {
          const billedCardUpdateData = buildBilledWorkCardUpdateData({
            invoiceDocumentId: existingInvoice.id,
          });
          if (Object.keys(billedCardUpdateData).length > 0) {
            await tx.employeeWorkCard.update({
              where: { id: card.id },
              data: billedCardUpdateData,
            });
          }

          const missingCustomer = !existingInvoice.customerId;
          const missingVehicle =
            !existingInvoice.vehicleId &&
            !existingInvoice.vehicleMake &&
            !existingInvoice.vehicleModel &&
            !existingInvoice.vehicleVin;
          return {
            id: existingInvoice.id,
            requireDataEntry: missingCustomer || missingVehicle,
            missingCustomer,
            missingVehicle,
          };
        }
      }
      if (card.status !== "CLOSED") {
        throw new Error("WORK_CARD_NOT_CLOSED");
      }

      const totalSeconds = card.steps.reduce((sum, step) => sum + Math.max(0, step.durationSeconds), 0);
      if (totalSeconds <= 0) {
        throw new Error("WORK_CARD_EMPTY");
      }

      const cardVehicle = card.vehicleId
        ? await tx.vehicle.findUnique({
            where: { id: card.vehicleId },
            select: {
              id: true,
              customerId: true,
              make: true,
              model: true,
              vin: true,
            },
          })
        : null;
      const cardCustomer = card.customerId
        ? await tx.customer.findUnique({
            where: { id: card.customerId },
            select: { id: true, hourlyRateCents: true },
          })
        : null;
      const rawEffectiveCustomerId = cardCustomer?.id ?? cardVehicle?.customerId ?? null;
      const effectiveCustomer = rawEffectiveCustomerId
        ? await tx.customer.findUnique({
            where: { id: rawEffectiveCustomerId },
            select: { id: true, hourlyRateCents: true },
          })
        : null;
      const effectiveCustomerId = effectiveCustomer?.id ?? null;
      const customerHourlyRateCents = effectiveCustomer?.hourlyRateCents ?? cardCustomer?.hourlyRateCents ?? null;

      const sourceOffer = card.sourceOfferId
        ? await tx.document.findUnique({
            where: { id: card.sourceOfferId },
            select: { id: true },
          })
        : null;

      const settings = await tx.companySettings.findUnique({
        where: { id: "default" },
        select: {
          workCardAwMinutes: true,
          workCardHourlyRateCents: true,
        },
      });

      const awMinutes = Math.min(120, Math.max(1, settings?.workCardAwMinutes ?? 10));
      const hourlyRateCents = Math.max(
        1,
        selectedHourlyRateCents ?? customerHourlyRateCents ?? settings?.workCardHourlyRateCents ?? 6000
      );
      const unitNetCents = Math.max(1, Math.round((hourlyRateCents * awMinutes) / 60));
      const vatRate = 19;

      const year = new Date().getFullYear();
      const draftCounter = await tx.documentDraftCounter.upsert({
        where: { docType_year: { docType: "INVOICE", year } },
        update: { lastSeq: { increment: 1 } },
        create: { docType: "INVOICE", year, lastSeq: 1 },
        select: { lastSeq: true },
      });
      const draftNumber = `DR-${draftCounter.lastSeq}`;

      const issueDate = new Date();
      const dueDate = new Date(issueDate);
      dueDate.setDate(dueDate.getDate() + 10);
      const serviceDate = card.closedAt ?? card.workDate ?? issueDate;
      const invoiceVehicleId = cardVehicle?.id ?? null;
      const invoiceVehicleMake = card.vehicleMake ?? cardVehicle?.make ?? null;
      const invoiceVehicleModel = card.vehicleModel ?? cardVehicle?.model ?? null;
      const invoiceVehicleVin = card.licensePlate ?? cardVehicle?.vin ?? null;
      const missingCustomer = !effectiveCustomerId;
      const missingVehicle =
        !invoiceVehicleId && !invoiceVehicleMake && !invoiceVehicleModel && !invoiceVehicleVin;

      const invoice = await tx.document.create({
        data: {
          docType: "INVOICE",
          docNumber: draftNumber,
          draftNumber,
          status: DocumentStatus.DRAFT,
          isFinal: false,
          issueDate,
          dueDate,
          serviceDate,
          customerId: effectiveCustomerId,
          vehicleId: invoiceVehicleId,
          vehicleMake: invoiceVehicleMake,
          vehicleModel: invoiceVehicleModel,
          vehicleVin: invoiceVehicleVin,
          sourceOfferId: sourceOffer?.id ?? null,
          notesInternal: `Erstellt aus Arbeitskarte ${cardMarker}`,
        },
        select: { id: true },
      });

      const stepSecondsByCategory: Record<WorkStepCategory, number> = {
        INNEN: 0,
        AUSSEN: 0,
        POLIEREN: 0,
        SONSTIGES: 0,
      };

      for (const step of card.steps) {
        const seconds = Math.max(0, step.durationSeconds);
        if (seconds <= 0) continue;
        const category = normalizeWorkStepCategory(step.name);
        stepSecondsByCategory[category] += seconds;
      }

      const orderedCategories: WorkStepCategory[] = ["INNEN", "AUSSEN", "POLIEREN", "SONSTIGES"];
      const lineDrafts = orderedCategories
        .map((category) => {
          const seconds = stepSecondsByCategory[category];
          if (seconds <= 0) return null;

          const awQtyRaw = seconds / 60 / awMinutes;
          const awQty = Math.max(0.01, Math.round(awQtyRaw * 100) / 100);
          const title = getWorkStepInvoiceTitle(category);
          const description = [
            `Leistung: ${title}`,
            `Zeit: ${formatHoursMinutesSeconds(seconds)}`,
            `Abrechnung: ${awQty.toFixed(2).replace(".", ",")} AW x ${awMinutes} Min`,
            `Stundensatz: ${(hourlyRateCents / 100).toFixed(2).replace(".", ",")} EUR/h netto`,
          ].join(" | ");

          const totals = calcLineTotals({
            qty: awQty,
            unitNetCents,
            vatRate,
          });

          return {
            title,
            description,
            qty: awQty,
            totals,
          };
        })
        .filter((entry): entry is { title: string; description: string; qty: number; totals: ReturnType<typeof calcLineTotals> } => Boolean(entry));

      if (lineDrafts.length === 0) {
        throw new Error("WORK_CARD_EMPTY");
      }

      let position = 1;
      let netTotalCents = 0;
      let vatTotalCents = 0;
      let grossTotalCents = 0;

      for (const line of lineDrafts) {
        await tx.documentLine.create({
          data: {
            documentId: invoice.id,
            position,
            title: line.title,
            description: line.description,
            qty: line.qty,
            unitNetCents,
            vatRate,
            discountPct: 0,
            lineNetCents: line.totals.lineNetCents,
            lineVatCents: line.totals.lineVatCents,
            lineGrossCents: line.totals.lineGrossCents,
          },
        });
        netTotalCents += line.totals.lineNetCents;
        vatTotalCents += line.totals.lineVatCents;
        grossTotalCents += line.totals.lineGrossCents;
        position += 1;
      }

      await tx.document.update({
        where: { id: invoice.id },
        data: {
          netTotalCents,
          vatTotalCents,
          grossTotalCents,
        },
      });

      const workCardUpdateData = buildBilledWorkCardUpdateData({
        invoiceDocumentId: invoice.id,
        customerId: effectiveCustomerId,
        vehicleId: invoiceVehicleId,
      });
      if (Object.keys(workCardUpdateData).length > 0) {
        await tx.employeeWorkCard.update({
          where: { id: card.id },
          data: workCardUpdateData,
        });
      }

      if (cardVehicle && effectiveCustomerId && !cardVehicle.customerId) {
        await tx.vehicle.update({
          where: { id: cardVehicle.id },
          data: { customerId: effectiveCustomerId },
        });
      }

      return {
        id: invoice.id,
        requireDataEntry: missingCustomer || missingVehicle,
        missingCustomer,
        missingVehicle,
      };
    });

  } catch (error) {
    const code = error instanceof Error ? error.message : "unknown";
    if (code === "WORK_CARD_NOT_FOUND") {
      redirect(withStatus(redirectTo, "card", "not-found"));
    }
    if (code === "WORK_CARD_NOT_CLOSED") {
      redirect(withStatus(redirectTo, "card", "not-closed"));
    }
    if (code === "WORK_CARD_EMPTY") {
      redirect(withStatus(redirectTo, "card", "no-time"));
    }
    redirect(withStatus(redirectTo, "card", mapInvoiceCreationErrorToStatus(error)));
  }

  revalidateEmployeesModule();
  revalidatePath("/invoices");
  revalidatePath("/dashboard");
  const invoiceId = invoiceResult.id;
  revalidatePath(`/documents/${invoiceId}/edit`);

  if (invoiceResult.requireDataEntry) {
    const sp = new URLSearchParams();
    sp.set("resolveData", "1");
    if (invoiceResult.missingCustomer) sp.set("missingCustomer", "1");
    if (invoiceResult.missingVehicle) sp.set("missingVehicle", "1");
    redirect(`/documents/${invoiceId}/edit?${sp.toString()}`);
  }

  redirect(`/documents/${invoiceId}/edit`);
}

export async function createEmployeeLoginAccount(formData: FormData) {
  const redirectTo =
    normalizeRedirectPath(asText(formData.get("redirectTo"))) ??
    "/employees?module=staff&view=employer";
  const fullName = asText(formData.get("fullName"));
  const username = String(formData.get("username") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  const session = await getSessionFromCookies();
  if (!session || session.role !== "OWNER") {
    redirect(withStatus(redirectTo, "employeeUser", "forbidden"));
  }

  if (!username || !isValidUsername(username) || !password || password.length < 8) {
    redirect(withStatus(redirectTo, "employeeUser", "invalid"));
  }

  try {
    const passwordHash = await bcrypt.hash(password, 12);
    createMemberUserInWorkspace({
      workspaceId: session.workspaceId,
      username,
      passwordHash,
      fullName,
    });
  } catch (error) {
    const code = error instanceof Error ? error.message : "unknown";
    if (code === "USERNAME_EXISTS" || code === "EMAIL_EXISTS") {
      redirect(withStatus(redirectTo, "employeeUser", "exists"));
    }
    redirect(withStatus(redirectTo, "employeeUser", "error"));
  }

  redirect(withStatus(redirectTo, "employeeUser", "created"));
}

export async function updateEmployeeLoginAccount(formData: FormData) {
  const redirectTo =
    normalizeRedirectPath(asText(formData.get("redirectTo"))) ??
    "/employees?module=staff&view=employer";
  const userId = asId(formData.get("userId"));
  const fullName = asText(formData.get("fullName"));
  const username = String(formData.get("username") ?? "").trim().toLowerCase();

  const session = await getSessionFromCookies();
  if (!session || session.role !== "OWNER") {
    redirect(withStatus(redirectTo, "employeeUser", "forbidden"));
  }

  if (!userId || !username || !isValidUsername(username)) {
    redirect(withStatus(redirectTo, "employeeUser", "invalid"));
  }

  try {
    updateMemberUserInWorkspace({
      workspaceId: session.workspaceId,
      userId,
      username,
      fullName,
    });
  } catch (error) {
    const code = error instanceof Error ? error.message : "unknown";
    if (code === "USERNAME_EXISTS") {
      redirect(withStatus(redirectTo, "employeeUser", "exists"));
    }
    if (code === "MEMBER_NOT_FOUND") {
      redirect(withStatus(redirectTo, "employeeUser", "not-found"));
    }
    redirect(withStatus(redirectTo, "employeeUser", "error"));
  }

  revalidateEmployeesModule();
  redirect(withStatus(redirectTo, "employeeUser", "updated"));
}

export async function setEmployeeLoginPassword(formData: FormData) {
  const redirectTo =
    normalizeRedirectPath(asText(formData.get("redirectTo"))) ??
    "/employees?module=staff&view=employer";
  const userId = asId(formData.get("userId"));
  const password = String(formData.get("password") ?? "");

  const session = await getSessionFromCookies();
  if (!session || session.role !== "OWNER") {
    redirect(withStatus(redirectTo, "employeeUser", "forbidden"));
  }

  if (!userId || !password || password.length < 8) {
    redirect(withStatus(redirectTo, "employeeUser", "invalid"));
  }

  try {
    const passwordHash = await bcrypt.hash(password, 12);
    setMemberUserPasswordInWorkspace({
      workspaceId: session.workspaceId,
      userId,
      passwordHash,
    });
  } catch (error) {
    const code = error instanceof Error ? error.message : "unknown";
    if (code === "MEMBER_NOT_FOUND") {
      redirect(withStatus(redirectTo, "employeeUser", "not-found"));
    }
    redirect(withStatus(redirectTo, "employeeUser", "error"));
  }

  revalidateEmployeesModule();
  redirect(withStatus(redirectTo, "employeeUser", "password-updated"));
}

export async function removeEmployeeLoginAccount(formData: FormData) {
  const redirectTo =
    normalizeRedirectPath(asText(formData.get("redirectTo"))) ??
    "/employees?module=staff&view=employer";
  const userId = asId(formData.get("userId"));

  const session = await getSessionFromCookies();
  if (!session || session.role !== "OWNER") {
    redirect(withStatus(redirectTo, "employeeUser", "forbidden"));
  }

  if (!userId) {
    redirect(withStatus(redirectTo, "employeeUser", "invalid"));
  }

  try {
    const removed = removeMemberUserFromWorkspace({
      workspaceId: session.workspaceId,
      userId,
    });
    if (!removed) {
      redirect(withStatus(redirectTo, "employeeUser", "not-found"));
    }
  } catch {
    redirect(withStatus(redirectTo, "employeeUser", "error"));
  }

  revalidateEmployeesModule();
  redirect(withStatus(redirectTo, "employeeUser", "removed"));
}

export async function saveEmployeeWorkPlan(formData: FormData) {
  const redirectTo =
    normalizeRedirectPath(asText(formData.get("redirectTo"))) ??
    "/employees?module=staff&view=employer";
  const userId = asId(formData.get("userId"));
  const dayOfWeek = asDayOfWeek(formData.get("dayOfWeek"));
  const startTimeRaw = String(formData.get("startTime") ?? "").trim();
  const endTimeRaw = String(formData.get("endTime") ?? "").trim();
  const startTime = asTime(formData.get("startTime"));
  const endTime = asTime(formData.get("endTime"));
  const note = asText(formData.get("note"));

  const session = await getSessionFromCookies();
  if (!session || session.role !== "OWNER") {
    redirect(withStatus(redirectTo, "workPlan", "forbidden"));
  }

  if (!userId || !dayOfWeek) {
    redirect(withStatus(redirectTo, "workPlan", "invalid"));
  }
  if ((startTimeRaw && !startTime) || (endTimeRaw && !endTime)) {
    redirect(withStatus(redirectTo, "workPlan", "invalid"));
  }

  ensureWorkspaceDatabase(session.workspaceId);

  const members = listMemberUsersInWorkspace(session.workspaceId);
  const isWorkspaceMember = members.some((member) => member.userId === userId);
  if (!isWorkspaceMember) {
    redirect(withStatus(redirectTo, "workPlan", "member-not-found"));
  }

  const hasAnyTimeValue = Boolean(startTime || endTime);
  if (hasAnyTimeValue && (!startTime || !endTime)) {
    redirect(withStatus(redirectTo, "workPlan", "time-pair"));
  }
  if (startTime && endTime && startTime >= endTime) {
    redirect(withStatus(redirectTo, "workPlan", "time-order"));
  }

  const cleanedNote = note?.slice(0, 240) ?? null;
  const hasPayload = Boolean((startTime && endTime) || cleanedNote);

  try {
    if (!hasPayload) {
      await prisma.employeeWorkPlan.deleteMany({
        where: {
          memberUserId: userId,
          dayOfWeek,
        },
      });
      revalidateEmployeesModule();
      redirect(withStatus(redirectTo, "workPlan", "cleared"));
    }

    await prisma.employeeWorkPlan.upsert({
      where: {
        memberUserId_dayOfWeek: {
          memberUserId: userId,
          dayOfWeek,
        },
      },
      create: {
        memberUserId: userId,
        dayOfWeek,
        startTime,
        endTime,
        note: cleanedNote,
      },
      update: {
        startTime,
        endTime,
        note: cleanedNote,
      },
    });
  } catch {
    redirect(withStatus(redirectTo, "workPlan", "error"));
  }

  revalidateEmployeesModule();
  redirect(withStatus(redirectTo, "workPlan", "saved"));
}

export async function updateEmployeeWorkCard(formData: FormData) {
  const cardId = asId(formData.get("cardId"));
  const workDate = parseDateInputToUtcStart(formData.get("workDate"));
  const customerName = asText(formData.get("customerName"));
  const vehicleMake = asText(formData.get("vehicleMake"));
  const vehicleModel = asText(formData.get("vehicleModel"));
  const licensePlate = asText(formData.get("licensePlate"));
  const notes = asText(formData.get("notes"));
  const plannedSteps = parsePlannedStepsFromFormData(formData);
  const plannedNote = asText(formData.get("plannedNote"));
  const assignedToUserIdInput = asId(formData.get("assignedToUserId"));
  const redirectTo =
    normalizeRedirectPath(asText(formData.get("redirectTo"))) ??
    (cardId ? `/employees/cards/${cardId}/edit` : "/employees?module=cards&view=employee");

  const session = await getSessionFromCookies();
  if (!session || !cardId || !workDate) {
    redirect(withStatus(redirectTo, "card", "invalid"));
  }

  ensureWorkspaceDatabase(session.workspaceId);

  const existingCard = await prisma.employeeWorkCard.findUnique({
    where: { id: cardId },
    select: {
      id: true,
      assignedToUserId: true,
      createdByUserId: true,
      invoiceDocumentId: true,
      archivedAt: true,
    },
  });
  if (!existingCard) {
    redirect(withStatus(redirectTo, "card", "not-found"));
  }

  const isOwner = session.role === "OWNER";
  const canEdit =
    isOwner ||
    existingCard.assignedToUserId === session.userId ||
    (!existingCard.assignedToUserId && existingCard.createdByUserId === session.userId);
  if (!canEdit) {
    redirect(withStatus(redirectTo, "card", "forbidden"));
  }
  if (existingCard.invoiceDocumentId) {
    redirect(withStatus(redirectTo, "card", "invoiced-lock"));
  }
  if (existingCard.archivedAt) {
    redirect(withStatus(redirectTo, "card", "archived-lock"));
  }

  let assignedToUserId = existingCard.assignedToUserId ?? null;
  let assignedToLabel: string | null = null;

  if (isOwner) {
    if (assignedToUserIdInput) {
      const assignedMember = findWorkspaceMemberByUserId(session.workspaceId, assignedToUserIdInput);
      if (!assignedMember) {
        redirect(withStatus(redirectTo, "card", "invalid-assignee"));
      }
      assignedToUserId = assignedMember.userId;
      assignedToLabel = formatMemberLabel(assignedMember);
    } else {
      assignedToUserId = null;
      assignedToLabel = null;
    }
  } else if (assignedToUserId) {
    const assignedMember = findWorkspaceMemberByUserId(session.workspaceId, assignedToUserId);
    assignedToLabel = assignedMember ? formatMemberLabel(assignedMember) : null;
  }

  const updateData: Prisma.EmployeeWorkCardUpdateInput = {
    workDate,
    customerName: customerName ?? null,
    vehicleMake: vehicleMake ?? null,
    vehicleModel: vehicleModel ?? null,
    licensePlate: licensePlate ?? null,
    notes: notes ?? null,
  };

  if (employeeWorkCardSupportsField("plannedSteps")) {
    updateData.plannedSteps = encodePlannedSteps(plannedSteps);
  }
  if (employeeWorkCardSupportsField("plannedNote")) {
    updateData.plannedNote = plannedNote?.slice(0, 300) ?? null;
  }
  if (isOwner && employeeWorkCardSupportsField("assignedToUserId")) {
    updateData.assignedToUserId = assignedToUserId;
  }
  if (isOwner && employeeWorkCardSupportsField("assignedToLabel")) {
    updateData.assignedToLabel = assignedToLabel;
  }

  try {
    await prisma.employeeWorkCard.update({
      where: { id: cardId },
      data: updateData,
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      redirect(withStatus(redirectTo, "card", "not-found"));
    }
    redirect(withStatus(redirectTo, "card", "error"));
  }

  revalidateEmployeesModule();
  revalidatePath("/dashboard");
  revalidatePath(`/employees/cards/${cardId}`);
  revalidatePath(`/employees/cards/${cardId}/edit`);
  redirect(withStatus(redirectTo, "card", "updated"));
}

export async function updateEmployeeWorkCardPlan(formData: FormData) {
  const redirectTo =
    normalizeRedirectPath(asText(formData.get("redirectTo"))) ??
    "/employees?module=cards&view=employer";
  const cardId = asId(formData.get("cardId"));
  const hasPlanRankInput = formData.has("planRank");
  const planRank = hasPlanRankInput ? asPlanRank(formData.get("planRank")) : null;
  const plannedSteps = parsePlannedStepsFromFormData(formData);
  const plannedNote = asText(formData.get("plannedNote"));
  const assignedToUserIdInput = asId(formData.get("assignedToUserId"));

  const session = await getSessionFromCookies();
  if (!session || session.role !== "OWNER") {
    redirect(withStatus(redirectTo, "cardPlan", "forbidden"));
  }
  if (!cardId || planRank === "invalid") {
    redirect(withStatus(redirectTo, "cardPlan", "invalid"));
  }

  ensureWorkspaceDatabase(session.workspaceId);

  let assignedToUserId: string | null = null;
  let assignedToLabel: string | null = null;
  if (assignedToUserIdInput) {
    const assignedMember = findWorkspaceMemberByUserId(session.workspaceId, assignedToUserIdInput);
    if (!assignedMember) {
      redirect(withStatus(redirectTo, "cardPlan", "member-not-found"));
    }
    assignedToUserId = assignedMember.userId;
    assignedToLabel = formatMemberLabel(assignedMember);
  }

  const planData: Prisma.EmployeeWorkCardUpdateInput = {};
  if (hasPlanRankInput && employeeWorkCardSupportsField("planRank")) {
    planData.planRank = planRank;
  }
  if (employeeWorkCardSupportsField("plannedSteps")) {
    planData.plannedSteps = encodePlannedSteps(plannedSteps);
  }
  if (employeeWorkCardSupportsField("plannedNote")) {
    planData.plannedNote = plannedNote?.slice(0, 300) ?? null;
  }
  if (employeeWorkCardSupportsField("assignedToUserId")) {
    planData.assignedToUserId = assignedToUserId;
  }
  if (employeeWorkCardSupportsField("assignedToLabel")) {
    planData.assignedToLabel = assignedToLabel;
  }

  try {
    await prisma.$transaction(async (tx) => {
      await tx.employeeWorkCard.update({
        where: { id: cardId },
        data: planData,
      });

      if (hasPlanRankInput) {
        const desiredRank = typeof planRank === "number" ? planRank : null;
        const placeResult = await placeCardInOpenPlanQueue(tx, cardId, desiredRank);
        if (placeResult === "not-found") {
          throw new Error("WORK_CARD_NOT_FOUND");
        }
      } else {
        await normalizeOpenPlanQueue(tx);
      }
    });
  } catch (error) {
    if (error instanceof Error && error.message === "WORK_CARD_NOT_FOUND") {
      redirect(withStatus(redirectTo, "cardPlan", "not-found"));
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      redirect(withStatus(redirectTo, "cardPlan", "not-found"));
    }
    redirect(withStatus(redirectTo, "cardPlan", "error"));
  }

  revalidateEmployeesModule();
  revalidatePath(`/employees/cards/${cardId}`);
  redirect(withStatus(redirectTo, "cardPlan", "saved"));
}

export async function moveEmployeeWorkCardPlan(formData: FormData) {
  const redirectTo =
    normalizeRedirectPath(asText(formData.get("redirectTo"))) ??
    "/employees?module=cards&view=employer";
  const cardId = asId(formData.get("cardId"));
  const directionRaw = String(formData.get("direction") ?? "").trim().toLowerCase();
  const direction = directionRaw === "up" || directionRaw === "down" ? directionRaw : null;

  const session = await getSessionFromCookies();
  if (!session || session.role !== "OWNER") {
    redirect(withStatus(redirectTo, "cardPlan", "forbidden"));
  }
  if (!cardId || !direction) {
    redirect(withStatus(redirectTo, "cardPlan", "invalid"));
  }

  ensureWorkspaceDatabase(session.workspaceId);

  let moveResult: "moved" | "not-found" | "noop";
  try {
    moveResult = await prisma.$transaction(async (tx) => {
      return moveCardInOpenPlanQueue(tx, cardId, direction);
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      redirect(withStatus(redirectTo, "cardPlan", "not-found"));
    }
    redirect(withStatus(redirectTo, "cardPlan", "error"));
  }

  if (moveResult === "not-found") {
    redirect(withStatus(redirectTo, "cardPlan", "not-found"));
  }

  revalidateEmployeesModule();
  revalidatePath(`/employees/cards/${cardId}`);
  redirect(withStatus(redirectTo, "cardPlan", "moved"));
}

export async function archiveEmployeeWorkCard(formData: FormData) {
  const redirectTo =
    normalizeRedirectPath(asText(formData.get("redirectTo"))) ??
    "/employees?module=cards&view=employer";
  const cardId = asId(formData.get("cardId"));

  const session = await getSessionFromCookies();
  if (!session || session.role !== "OWNER") {
    redirect(withStatus(redirectTo, "cardArchive", "forbidden"));
  }
  if (!cardId) {
    redirect(withStatus(redirectTo, "cardArchive", "invalid"));
  }

  ensureWorkspaceDatabase(session.workspaceId);

  try {
    const card = await prisma.employeeWorkCard.findUnique({
      where: { id: cardId },
      select: {
        id: true,
        invoiceDocumentId: true,
      },
    });

    if (!card) {
      redirect(withStatus(redirectTo, "cardArchive", "not-found"));
    }
    if (!card.invoiceDocumentId) {
      redirect(withStatus(redirectTo, "cardArchive", "not-billed"));
    }

    const archiveData: Prisma.EmployeeWorkCardUpdateInput = {};
    if (employeeWorkCardSupportsField("archivedAt")) {
      archiveData.archivedAt = new Date();
    }

    if (Object.keys(archiveData).length > 0) {
      await prisma.employeeWorkCard.update({
        where: { id: card.id },
        data: archiveData,
      });
    }
  } catch {
    redirect(withStatus(redirectTo, "cardArchive", "error"));
  }

  revalidateEmployeesModule();
  revalidatePath("/dashboard");
  revalidatePath(`/employees/cards/${cardId}`);
  redirect(withStatus(redirectTo, "cardArchive", "archived"));
}

export async function restoreEmployeeWorkCardFromArchive(formData: FormData) {
  const redirectTo =
    normalizeRedirectPath(asText(formData.get("redirectTo"))) ??
    "/employees?module=cards&view=employer&scope=archive";
  const cardId = asId(formData.get("cardId"));

  const session = await getSessionFromCookies();
  if (!session || session.role !== "OWNER") {
    redirect(withStatus(redirectTo, "cardArchive", "forbidden"));
  }
  if (!cardId) {
    redirect(withStatus(redirectTo, "cardArchive", "invalid"));
  }

  ensureWorkspaceDatabase(session.workspaceId);

  try {
    const restoreData: Prisma.EmployeeWorkCardUpdateInput = {};
    if (employeeWorkCardSupportsField("archivedAt")) {
      restoreData.archivedAt = null;
    }
    if (Object.keys(restoreData).length > 0) {
      await prisma.employeeWorkCard.update({
        where: { id: cardId },
        data: restoreData,
      });
    }
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      redirect(withStatus(redirectTo, "cardArchive", "not-found"));
    }
    redirect(withStatus(redirectTo, "cardArchive", "error"));
  }

  revalidateEmployeesModule();
  revalidatePath("/dashboard");
  revalidatePath(`/employees/cards/${cardId}`);
  redirect(withStatus(redirectTo, "cardArchive", "restored"));
}

export async function startEmployeeWorkStep(formData: FormData) {
  const cardId = asId(formData.get("cardId"));
  const stepName = asText(formData.get("stepName"));
  if (!cardId || !stepName) return;
  if (!WORK_STEP_OPTIONS.has(stepName)) return;

  await prisma.$transaction(async (tx) => {
    const card = await tx.employeeWorkCard.findUnique({
      where: { id: cardId },
      select: { id: true, status: true },
    });
    if (!card || card.status === "CLOSED") return;

    const now = new Date();

    const runningStep = await tx.employeeWorkStep.findFirst({
      where: { cardId, endedAt: null },
      orderBy: { startedAt: "desc" },
      select: { id: true, startedAt: true },
    });

    if (runningStep) {
      await tx.employeeWorkStep.update({
        where: { id: runningStep.id },
        data: {
          endedAt: now,
          durationSeconds: getDurationSeconds(runningStep.startedAt, now),
        },
      });
    }

    await tx.employeeWorkStep.create({
      data: {
        cardId,
        name: stepName,
        startedAt: now,
      },
    });
  });

  revalidateEmployeesModule();
}

export async function stopEmployeeWorkStep(formData: FormData) {
  const stepId = asId(formData.get("stepId"));
  if (!stepId) return;

  await prisma.$transaction(async (tx) => {
    const step = await tx.employeeWorkStep.findUnique({
      where: { id: stepId },
      select: { id: true, startedAt: true, endedAt: true },
    });
    if (!step || step.endedAt) return;

    const now = new Date();
    await tx.employeeWorkStep.update({
      where: { id: step.id },
      data: {
        endedAt: now,
        durationSeconds: getDurationSeconds(step.startedAt, now),
      },
    });
  });

  revalidateEmployeesModule();
}

export async function closeEmployeeWorkCard(formData: FormData) {
  const cardId = asId(formData.get("cardId"));
  if (!cardId) return;

  await prisma.$transaction(async (tx) => {
    const card = await tx.employeeWorkCard.findUnique({
      where: { id: cardId },
      select: { id: true, status: true },
    });
    if (!card || card.status === "CLOSED") return;

    const now = new Date();
    const runningSteps = await tx.employeeWorkStep.findMany({
      where: { cardId, endedAt: null },
      select: { id: true, startedAt: true },
    });

    for (const step of runningSteps) {
      await tx.employeeWorkStep.update({
        where: { id: step.id },
        data: {
          endedAt: now,
          durationSeconds: getDurationSeconds(step.startedAt, now),
        },
      });
    }

    const durationAgg = await tx.employeeWorkStep.aggregate({
      where: { cardId },
      _sum: { durationSeconds: true },
    });
    const totalDurationSeconds = durationAgg._sum.durationSeconds ?? 0;
    const billingReadyAt = totalDurationSeconds > 0 ? now : null;
    const closeData: Prisma.EmployeeWorkCardUpdateInput = {
      status: "CLOSED",
      closedAt: now,
    };
    if (employeeWorkCardSupportsField("billingReadyAt")) {
      closeData.billingReadyAt = billingReadyAt;
    }
    if (employeeWorkCardSupportsField("archivedAt")) {
      closeData.archivedAt = now;
    }

    await tx.employeeWorkCard.update({
      where: { id: cardId },
      data: closeData,
    });
  });

  revalidateEmployeesModule();
  revalidatePath("/dashboard");
}

export async function reopenEmployeeWorkCard(formData: FormData) {
  const cardId = asId(formData.get("cardId"));
  if (!cardId) return;

  await prisma.$transaction(async (tx) => {
    const card = await tx.employeeWorkCard.findUnique({
      where: { id: cardId },
      select: { id: true },
    });
    if (!card) return;

    const cardMarker = `AK-${cardId.slice(-8).toUpperCase()}`;
    const linkedInvoice = await tx.document.findFirst({
      where: {
        docType: "INVOICE",
        notesInternal: { contains: cardMarker },
      },
      select: { id: true },
    });
    if (linkedInvoice) return;

    const reopenData: Prisma.EmployeeWorkCardUpdateInput = {
      status: "OPEN",
      closedAt: null,
    };
    if (employeeWorkCardSupportsField("billingReadyAt")) {
      reopenData.billingReadyAt = null;
    }
    if (employeeWorkCardSupportsField("archivedAt")) {
      reopenData.archivedAt = null;
    }

    await tx.employeeWorkCard.update({
      where: { id: cardId },
      data: reopenData,
    });
  });

  revalidateEmployeesModule();
  revalidatePath("/dashboard");
}
