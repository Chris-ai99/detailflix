type EmployeeLoginPageProps = {
  searchParams: Promise<{
    error?: string;
    next?: string;
  }>;
};

function getErrorMessage(error?: string) {
  switch (error) {
    case "credentials":
      return "Benutzername oder Passwort ist falsch.";
    case "employee-only":
      return "Fuer dieses Konto ist kein Mitarbeiter-Zugang vorhanden.";
    case "workspace":
      return "Fuer dieses Konto wurde kein Workspace gefunden.";
    default:
      return null;
  }
}

export default async function EmployeeLoginPage({ searchParams }: EmployeeLoginPageProps) {
  const params = await searchParams;
  const next =
    params.next && params.next.startsWith("/")
      ? params.next
      : "/employees?module=cards&view=employee";
  const errorMessage = getErrorMessage(params.error);

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-900 px-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-700/70 bg-slate-800/90 p-8 shadow-2xl shadow-slate-950/60">
        <div className="mb-8 flex justify-center">
          <img src="/detailix-wordmark.svg" alt="Autosello" className="h-7 w-auto" />
        </div>

        <h1 className="mb-1 text-center text-2xl font-semibold text-slate-100">
          Mitarbeiter Login
        </h1>
        <p className="mb-6 text-center text-sm text-slate-400">
          Zugang nur fuer Arbeitskarten und Zeiterfassung.
        </p>

        {errorMessage ? (
          <div className="mb-4 rounded-lg border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
            {errorMessage}
          </div>
        ) : null}

        <form action="/api/auth/login" method="post" className="space-y-4">
          <input type="hidden" name="next" value={next} />
          <input type="hidden" name="portal" value="employee" />

          <label className="block">
            <span className="mb-1 block text-sm text-slate-300">Benutzername</span>
            <input
              name="username"
              type="text"
              required
              minLength={3}
              maxLength={32}
              pattern="[a-z0-9._-]{3,32}"
              autoComplete="username"
              className="w-full rounded-lg border border-slate-600 bg-slate-900/80 px-3 py-2 text-slate-100 outline-none ring-cyan-400/40 transition focus:ring-2"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-sm text-slate-300">Passwort</span>
            <input
              name="password"
              type="password"
              required
              autoComplete="current-password"
              className="w-full rounded-lg border border-slate-600 bg-slate-900/80 px-3 py-2 text-slate-100 outline-none ring-cyan-400/40 transition focus:ring-2"
            />
          </label>

          <button
            type="submit"
            className="mt-2 w-full rounded-lg bg-cyan-500 px-4 py-2 font-medium text-slate-950 transition hover:bg-cyan-400"
          >
            Als Mitarbeiter einloggen
          </button>
        </form>

        <p className="mt-5 text-center text-sm text-slate-400">
          Verwaltungskonto?{" "}
          <a href="/login" className="text-cyan-300 hover:text-cyan-200">
            Zum Standard-Login
          </a>
        </p>
      </div>
    </main>
  );
}
