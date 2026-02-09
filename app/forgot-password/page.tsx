type ForgotPasswordPageProps = {
  searchParams: Promise<{
    status?: string;
  }>;
};

function getStatusInfo(status?: string) {
  switch (status) {
    case "sent":
      return {
        tone: "ok",
        message:
          "Wenn ein Konto mit dieser E-Mail existiert, wurde ein Link zum Zuruecksetzen gesendet.",
      };
    case "invalid":
      return { tone: "error", message: "Bitte eine gueltige E-Mail eingeben." };
    case "mail":
      return {
        tone: "error",
        message: "Die E-Mail konnte nicht versendet werden. Bitte spaeter erneut versuchen.",
      };
    default:
      return null;
  }
}

export default async function ForgotPasswordPage({ searchParams }: ForgotPasswordPageProps) {
  const params = await searchParams;
  const statusInfo = getStatusInfo(params.status);

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-900 px-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-700/70 bg-slate-800/90 p-8 shadow-2xl shadow-slate-950/60">
        <div className="mb-8 flex justify-center">
          <img src="/detailix-wordmark.svg" alt="Autosello" className="h-7 w-auto" />
        </div>

        <h1 className="mb-1 text-center text-2xl font-semibold text-slate-100">
          Passwort vergessen
        </h1>
        <p className="mb-6 text-center text-sm text-slate-400">
          Gib deine E-Mail ein. Du bekommst einen Link zum Zuruecksetzen.
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

        <form action="/api/auth/password/forgot" method="post" className="space-y-4">
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

          <button
            type="submit"
            className="mt-2 w-full rounded-lg bg-cyan-500 px-4 py-2 font-medium text-slate-950 transition hover:bg-cyan-400"
          >
            Link senden
          </button>
        </form>

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

