type LoginPageProps = {
  searchParams: Promise<{
    error?: string;
    status?: string;
    next?: string;
  }>;
};

function getErrorMessage(error?: string) {
  switch (error) {
    case "credentials":
      return "E-Mail oder Passwort ist falsch.";
    case "workspace":
      return "Fuer dieses Konto wurde kein Workspace gefunden.";
    default:
      return null;
  }
}

function getStatusMessage(status?: string) {
  switch (status) {
    case "pw-reset":
      return "Passwort wurde geaendert. Bitte neu einloggen.";
    default:
      return null;
  }
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const next = params.next && params.next.startsWith("/") ? params.next : "/dashboard";
  const errorMessage = getErrorMessage(params.error);
  const statusMessage = getStatusMessage(params.status);

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-900 px-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-700/70 bg-slate-800/90 p-8 shadow-2xl shadow-slate-950/60">
        <div className="mb-8 flex justify-center">
          <img src="/detailix-wordmark.svg" alt="Autosello" className="h-7 w-auto" />
        </div>

        <h1 className="mb-1 text-center text-2xl font-semibold text-slate-100">Anmeldung</h1>
        <p className="mb-6 text-center text-sm text-slate-400">
          Melde dich mit deiner E-Mail-Adresse an.
        </p>

        {errorMessage ? (
          <div className="mb-4 rounded-lg border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
            {errorMessage}
          </div>
        ) : null}

        {statusMessage ? (
          <div className="mb-4 rounded-lg border border-emerald-400/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">
            {statusMessage}
          </div>
        ) : null}

        <form action="/api/auth/login" method="post" className="space-y-4">
          <input type="hidden" name="next" value={next} />

          <label className="block">
            <span className="mb-1 block text-sm text-slate-300">E-Mail</span>
            <input
              name="email"
              type="email"
              required
              autoComplete="email"
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

          <div className="text-right text-sm">
            <a href="/forgot-password" className="text-cyan-300 hover:text-cyan-200">
              Passwort vergessen?
            </a>
          </div>

          <button
            type="submit"
            className="mt-2 w-full rounded-lg bg-cyan-500 px-4 py-2 font-medium text-slate-950 transition hover:bg-cyan-400"
          >
            Einloggen
          </button>
        </form>

        <p className="mt-5 text-center text-sm text-slate-400">
          Noch kein Konto?{" "}
          <a href="/register" className="text-cyan-300 hover:text-cyan-200">
            Freigabe anfragen
          </a>
        </p>
      </div>
    </main>
  );
}

