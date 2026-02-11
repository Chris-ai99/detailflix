import Link from "next/link";
import { getSessionFromCookies } from "@/lib/auth";
import { listMemberUsersInWorkspace } from "@/lib/auth-db";
import { createEmployeeWorkCard } from "../serverActions";
import NewWorkCardWizard from "./ui/NewWorkCardWizard";

type NewEmployeeCardPageProps = {
  searchParams?: Promise<{
    from?: string;
    to?: string;
    view?: string;
    module?: string;
    assignedTo?: string;
    memberUser?: string;
    sort?: string;
  }>;
};

function getSafeDateInput(value: string | undefined): string {
  const raw = String(value ?? "").trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw : "";
}

export default async function NewEmployeeCardPage({ searchParams }: NewEmployeeCardPageProps) {
  const resolved = searchParams ? await searchParams : undefined;
  const session = await getSessionFromCookies();
  const from = getSafeDateInput(resolved?.from);
  const to = getSafeDateInput(resolved?.to);
  const view = String(resolved?.view ?? "").trim().toLowerCase();
  const moduleMode = String(resolved?.module ?? "").trim().toLowerCase();
  const assignedTo = String(resolved?.assignedTo ?? "").trim();
  const memberUser = String(resolved?.memberUser ?? "").trim();
  const sort = String(resolved?.sort ?? "").trim().toLowerCase();

  const backParams = new URLSearchParams();
  if (from) backParams.set("from", from);
  if (to) backParams.set("to", to);
  if (view === "employee" || view === "employer") {
    backParams.set("view", view);
  }
  if (moduleMode === "cards" || moduleMode === "staff") {
    backParams.set("module", moduleMode);
  }
  if (assignedTo) {
    backParams.set("assignedTo", assignedTo);
  }
  if (memberUser) {
    backParams.set("memberUser", memberUser);
  }
  if (sort === "number") {
    backParams.set("sort", "number");
  }
  const backHref = backParams.toString()
    ? `/employees?${backParams.toString()}`
    : "/employees?module=cards&view=employee";

  const today = new Date();
  const todayInput = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(
    today.getDate()
  ).padStart(2, "0")}`;
  const canAssignEmployees = session?.role === "OWNER";
  const employeeAccounts =
    canAssignEmployees && session ? listMemberUsersInWorkspace(session.workspaceId) : [];

  return (
    <div className="max-w-3xl space-y-5">
      <div className="flex flex-col gap-2 rounded border border-slate-800 bg-slate-900/50 px-4 py-3 text-slate-200 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-lg font-semibold">Neue Arbeitskarte</h1>
          <p className="mt-1 text-xs text-slate-400">
            Schritt-für-Schritt: Datum, Mitarbeiter, Fahrzeug, Arbeiten.
          </p>
        </div>
        <Link
          className="inline-flex items-center justify-center rounded border border-slate-600 bg-slate-800 px-3 py-1.5 text-xs text-slate-200 hover:bg-slate-700"
          href={backHref}
        >
          {"Zurück"}
        </Link>
      </div>

      <NewWorkCardWizard
        action={createEmployeeWorkCard}
        redirectTo={backHref}
        todayInput={todayInput}
        canAssignEmployees={canAssignEmployees}
        employeeAccounts={employeeAccounts}
      />
    </div>
  );
}
