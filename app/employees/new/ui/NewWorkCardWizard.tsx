"use client";

import { useMemo, useRef, useState } from "react";
import WorkCardLookupFields from "./WorkCardLookupFields";

const PLAN_STEP_OPTIONS = ["Innen", "Außen", "Polieren", "Sonstiges"] as const;

type EmployeeAccountOption = {
  userId: string;
  username: string;
  fullName: string | null;
};

type NewWorkCardWizardProps = {
  action: (formData: FormData) => void | Promise<void>;
  redirectTo: string;
  todayInput: string;
  canAssignEmployees: boolean;
  employeeAccounts: EmployeeAccountOption[];
};

function getEmployeeLabel(account: EmployeeAccountOption): string {
  const fullName = String(account.fullName ?? "").trim();
  if (fullName) return `${fullName} (${account.username})`;
  return account.username;
}

type StepKey = "date" | "employee" | "vehicle" | "work";

export default function NewWorkCardWizard({
  action,
  redirectTo,
  todayInput,
  canAssignEmployees,
  employeeAccounts,
}: NewWorkCardWizardProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const [stepError, setStepError] = useState<string | null>(null);

  const hasEmployeeStep = canAssignEmployees;
  const isSingleEmployeeWorkspace =
    hasEmployeeStep && employeeAccounts.length === 1;
  const singleEmployeeId = isSingleEmployeeWorkspace ? employeeAccounts[0]?.userId ?? "" : "";
  const [selectedAssigneeUserId, setSelectedAssigneeUserId] = useState(singleEmployeeId);
  const [forceEmployeeStep, setForceEmployeeStep] = useState(false);
  const shouldSkipEmployeeStep = isSingleEmployeeWorkspace && !forceEmployeeStep;

  const steps = useMemo<Array<{ key: StepKey; label: string }>>(() => {
    const flow: Array<{ key: StepKey; label: string }> = [{ key: "date", label: "Arbeitstag" }];
    if (hasEmployeeStep) {
      flow.push({ key: "employee", label: "Mitarbeiter" });
    }
    flow.push({ key: "vehicle", label: "Fahrzeug" });
    flow.push({ key: "work", label: "Arbeiten" });
    return flow;
  }, [hasEmployeeStep]);

  const [stepIndex, setStepIndex] = useState(0);
  const currentStep = steps[stepIndex]?.key ?? "date";
  const stepIndexByKey = useMemo(
    () => new Map(steps.map((step, idx) => [step.key, idx] as const)),
    [steps]
  );
  const employeeStepIndex = stepIndexByKey.get("employee") ?? -1;
  const vehicleStepIndex = stepIndexByKey.get("vehicle") ?? -1;
  const workStepIndex = stepIndexByKey.get("work") ?? -1;

  function getCurrentFormData(): FormData | null {
    const form = formRef.current;
    if (!form) return null;
    return new FormData(form);
  }

  function validateCurrentStep(): boolean {
    const formData = getCurrentFormData();
    if (!formData) return true;

    if (currentStep === "date") {
      const workDate = String(formData.get("workDate") ?? "").trim();
      if (!workDate) {
        setStepError("Bitte zuerst den Arbeitstag wählen.");
        return false;
      }
    }

    if (currentStep === "vehicle") {
      const customerId = String(formData.get("customerId") ?? "").trim();
      const customerName = String(formData.get("customerName") ?? "").trim();
      const vehicleId = String(formData.get("vehicleId") ?? "").trim();
      const vehicleCreationMode = String(formData.get("vehicleCreationMode") ?? "search")
        .trim()
        .toLowerCase();
      const manualLicensePlate = String(formData.get("licensePlate") ?? "").trim();
      const manualVehicleMake = String(formData.get("vehicleMake") ?? "").trim();
      const manualVehicleModel = String(formData.get("vehicleModel") ?? "").trim();

      const hasCustomerData = Boolean(customerId || customerName);
      const hasVehicleData =
        vehicleCreationMode === "manual"
          ? Boolean(manualLicensePlate || manualVehicleMake || manualVehicleModel)
          : Boolean(vehicleId || manualLicensePlate || manualVehicleMake || manualVehicleModel);

      if (!hasVehicleData) {
        setStepError("Bitte zuerst ein Fahrzeug wählen oder über 'Fahrzeug anlegen' erfassen.");
        return false;
      }
      if (!hasCustomerData && !manualLicensePlate) {
        setStepError("Ohne Kundenangabe ist Kennzeichen/VIN Pflicht.");
        return false;
      }
    }

    setStepError(null);
    return true;
  }

  function goToPreviousStep() {
    setStepError(null);
    if (currentStep === "vehicle" && shouldSkipEmployeeStep && employeeStepIndex >= 0) {
      setStepIndex(0);
      return;
    }
    setStepIndex((prev) => Math.max(0, prev - 1));
  }

  function goToNextStep() {
    if (!validateCurrentStep()) return;
    if (currentStep === "date" && shouldSkipEmployeeStep && employeeStepIndex >= 0 && vehicleStepIndex >= 0) {
      setStepIndex(vehicleStepIndex);
      return;
    }
    setStepIndex((prev) => Math.min(steps.length - 1, prev + 1));
  }

  function openEmployeeStepManually() {
    if (employeeStepIndex < 0) return;
    setForceEmployeeStep(true);
    setStepError(null);
    setStepIndex(employeeStepIndex);
  }

  function enableAutoSkipAgain() {
    if (!isSingleEmployeeWorkspace || vehicleStepIndex < 0) return;
    setForceEmployeeStep(false);
    setSelectedAssigneeUserId(singleEmployeeId);
    setStepError(null);
    setStepIndex(vehicleStepIndex);
  }

  return (
    <form ref={formRef} action={action} className="space-y-4 rounded-lg border border-slate-700 bg-slate-800/60 p-6">
      <input type="hidden" name="redirectTo" value={redirectTo} />
      {hasEmployeeStep ? (
        <input type="hidden" name="assignedToUserId" value={selectedAssigneeUserId} />
      ) : null}

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {steps.map((step, idx) => {
          const isActive = idx === stepIndex;
          const isDone = idx < stepIndex;
          return (
            <div
              key={step.key}
              className={`rounded border px-2 py-2 text-center text-xs ${
                isActive
                  ? "border-cyan-500 bg-cyan-500/10 text-cyan-100"
                  : isDone
                    ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-100"
                    : "border-slate-700 bg-slate-900/50 text-slate-400"
              }`}
            >
              {idx + 1}. {step.label}
            </div>
          );
        })}
      </div>

      {stepError ? (
        <div className="rounded border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-100">
          {stepError}
        </div>
      ) : null}

      {currentStep === "date" ? (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-slate-100">1. Arbeitstag</h2>
          <label className="block text-sm text-slate-300">
            Datum
            <input
              name="workDate"
              type="date"
              required
              defaultValue={todayInput}
              className="mt-1 w-full rounded border border-slate-700 bg-slate-800 p-2"
            />
          </label>
          {isSingleEmployeeWorkspace ? (
            <div className="rounded border border-slate-700 bg-slate-900/50 px-3 py-2 text-xs text-slate-300">
              <div>Mitarbeiter-Schritt wird automatisch übersprungen: nur ein Mitarbeiter vorhanden.</div>
              <button
                type="button"
                onClick={openEmployeeStepManually}
                className="mt-2 rounded border border-cyan-500/60 bg-cyan-500/10 px-2 py-1 text-[11px] text-cyan-100 hover:bg-cyan-500/20"
              >
                Mitarbeiter trotzdem manuell auswählen
              </button>
            </div>
          ) : null}
        </section>
      ) : null}

      {currentStep === "employee" ? (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-slate-100">
            {employeeStepIndex + 1}. Mitarbeiter
          </h2>
          <label className="block text-sm text-slate-300">
            Mitarbeiter auswählen
            <select
              value={selectedAssigneeUserId}
              onChange={(event) => setSelectedAssigneeUserId(event.target.value)}
              className="mt-1 w-full rounded border border-slate-700 bg-slate-800 p-2"
            >
              <option value="">Nicht zugewiesen</option>
              {employeeAccounts.map((account) => (
                <option key={`wizard-assignee-${account.userId}`} value={account.userId}>
                  {getEmployeeLabel(account)}
                </option>
              ))}
            </select>
          </label>
          {isSingleEmployeeWorkspace ? (
            <button
              type="button"
              onClick={enableAutoSkipAgain}
              className="rounded border border-slate-600 bg-slate-800 px-2 py-1 text-xs text-slate-200 hover:bg-slate-700"
            >
              Wieder automatisch überspringen
            </button>
          ) : null}
        </section>
      ) : null}

      {currentStep === "vehicle" ? (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-slate-100">
            {vehicleStepIndex + 1}. Fahrzeug
          </h2>
          <WorkCardLookupFields />
        </section>
      ) : null}

      {currentStep === "work" ? (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-slate-100">
            {workStepIndex + 1}. Arbeiten am Fahrzeug
          </h2>
          <div className="rounded border border-slate-700 bg-slate-900/40 p-3">
            <div className="text-sm text-slate-300">Geplante Schritte</div>
            <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              {PLAN_STEP_OPTIONS.map((stepName) => (
                <label key={stepName} className="cursor-pointer">
                  <input type="checkbox" name="plannedSteps" value={stepName} className="peer sr-only" />
                  <span className="inline-flex w-full items-center justify-center rounded border border-slate-700 bg-slate-950 px-2 py-2 text-xs font-semibold text-slate-300 transition peer-checked:border-cyan-500 peer-checked:bg-cyan-500/15 peer-checked:text-cyan-100">
                    {stepName}
                  </span>
                </label>
              ))}
            </div>
            <label className="mt-3 block text-sm text-slate-300">
              Planhinweis (optional)
              <input
                name="plannedNote"
                maxLength={300}
                placeholder="z. B. zuerst Innen, dann Außenwäsche"
                className="mt-1 w-full rounded border border-slate-700 bg-slate-800 p-2"
              />
            </label>
          </div>

          <label className="block text-sm text-slate-300">
            Notizen (optional)
            <textarea
              name="notes"
              className="mt-1 w-full rounded border border-slate-700 bg-slate-800 p-2"
              rows={4}
            />
          </label>
        </section>
      ) : null}

      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={goToPreviousStep}
          disabled={stepIndex === 0}
          className="rounded border border-slate-600 bg-slate-800 px-3 py-2 text-xs text-slate-200 hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Zurück
        </button>

        {stepIndex < steps.length - 1 ? (
          <button
            type="button"
            onClick={goToNextStep}
            className="rounded bg-cyan-600 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-700"
          >
            Weiter
          </button>
        ) : (
          <button
            type="submit"
            onClick={(event) => {
              if (!validateCurrentStep()) {
                event.preventDefault();
              }
            }}
            className="rounded bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
          >
            Arbeitskarte speichern
          </button>
        )}
      </div>
    </form>
  );
}
