import { isAuthConfigured } from "@/lib/auth";

type LoginPageProps = {
  searchParams: Promise<{
    error?: string;
    next?: string;
  }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const hasError = params.error === "1";
  const next = params.next && params.next.startsWith("/") ? params.next : "/dashboard";
  const configured = isAuthConfigured();

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-900 px-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-700/70 bg-slate-800/90 p-8 shadow-2xl shadow-slate-950/60">
        <div className="mb-8 flex justify-center">
          <img src="/detailix-wordmark.svg" alt="Detailix" className="h-7 w-auto" />
        </div>

        <h1 className="mb-1 text-center text-2xl font-semibold text-slate-100">Anmeldung</h1>
        <p className="mb-6 text-center text-sm text-slate-400">
          Bitte melde dich mit deinen Zugangsdaten an.
        </p>

        {hasError ? (
          <div className="mb-4 rounded-lg border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
            Benutzername oder Passwort ist falsch.
          </div>
        ) : null}

        {!configured ? (
          <div className="mb-4 rounded-lg border border-amber-400/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-200">
            Login ist noch nicht konfiguriert. Setze APP_AUTH_USERNAME, APP_AUTH_PASSWORD und
            APP_AUTH_TOKEN in der Server-Umgebung.
          </div>
        ) : null}

        <form action="/api/auth/login" method="post" className="space-y-4">
          <input type="hidden" name="next" value={next} />

          <label className="block">
            <span className="mb-1 block text-sm text-slate-300">Benutzername</span>
            <input
              name="username"
              type="text"
              required
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
            Einloggen
          </button>
        </form>
      </div>
    </main>
  );
}
