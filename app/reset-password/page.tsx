type ResetPasswordPageProps = {
  searchParams: Promise<{
    token?: string;
    status?: string;
  }>;
};

function getStatusInfo(status?: string, hasToken?: boolean) {
  if (!hasToken) {
    return {
      tone: "error",
      message: "Reset-Link fehlt oder ist ungueltig.",
    };
  }

  switch (status) {
    case "invalid-token":
      return { tone: "error", message: "Dieser Reset-Link ist ungueltig oder abgelaufen." };
    case "invalid":
      return { tone: "error", message: "Bitte alle Pflichtfelder korrekt ausfuellen." };
    case "password":
      return { tone: "error", message: "Das Passwort muss mindestens 8 Zeichen lang sein." };
    case "mismatch":
      return { tone: "error", message: "Passwort und Wiederholung stimmen nicht ueberein." };
    default:
      return null;
  }
}

export default async function ResetPasswordPage({ searchParams }: ResetPasswordPageProps) {
  const params = await searchParams;
  const token = (params.token ?? "").trim();
  const hasToken = token.length > 0;
  const statusInfo = getStatusInfo(params.status, hasToken);

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-900 px-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-700/70 bg-slate-800/90 p-8 shadow-2xl shadow-slate-950/60">
        <div className="mb-8 flex justify-center">
          <img src="/detailix-wordmark.svg" alt="Autosello" className="h-7 w-auto" />
        </div>

        <h1 className="mb-1 text-center text-2xl font-semibold text-slate-100">
          Neues Passwort setzen
        </h1>
        <p className="mb-6 text-center text-sm text-slate-400">
          Setze ein neues Passwort fuer dein Konto.
        </p>

        {statusInfo ? (
          <div
            className={`mb-4 rounded-lg px-3 py-2 text-sm ${
              statusInfo.tone === "ok"
                ? "border border-emerald-400/30 bg-emerald-500/10 text-emerald-200"
                : "border border-rose-400/30 bg-rose-500/10 text-rose-200"
            }`}
          >
            {statusInfo.message}
          </div>
        ) : null}

        {hasToken ? (
          <form action="/api/auth/password/reset" method="post" className="space-y-4">
            <input type="hidden" name="token" value={token} />

            <label className="block">
              <span className="mb-1 block text-sm text-slate-300">Neues Passwort</span>
              <input
                name="password"
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                className="w-full rounded-lg border border-slate-600 bg-slate-900/80 px-3 py-2 text-slate-100 outline-none ring-cyan-400/40 transition focus:ring-2"
              />
            </label>

            <label className="block">
              <span className="mb-1 block text-sm text-slate-300">Passwort wiederholen</span>
              <input
                name="passwordConfirm"
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                className="w-full rounded-lg border border-slate-600 bg-slate-900/80 px-3 py-2 text-slate-100 outline-none ring-cyan-400/40 transition focus:ring-2"
              />
            </label>

            <button
              type="submit"
              className="mt-2 w-full rounded-lg bg-cyan-500 px-4 py-2 font-medium text-slate-950 transition hover:bg-cyan-400"
            >
              Passwort speichern
            </button>
          </form>
        ) : (
          <a
            href="/forgot-password"
            className="block w-full rounded-lg bg-cyan-500 px-4 py-2 text-center font-medium text-slate-950 transition hover:bg-cyan-400"
          >
            Neuen Link anfordern
          </a>
        )}

        <p className="mt-5 text-center text-sm text-slate-400">
          Zurueck zur{" "}
          <a href="/login" className="text-cyan-300 hover:text-cyan-200">
            Anmeldung
          </a>
        </p>
      </div>
    </main>
  );
}

