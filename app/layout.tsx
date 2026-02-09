import "./globals.css";
import Sidebar from "./ui/Sidebar";
import { getSessionFromCookies } from "@/lib/auth";

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await getSessionFromCookies();
  const authenticated = !!session;

  return (
    <html lang="de">
      <body className="min-h-screen bg-slate-900 text-slate-100">
        {authenticated ? (
          <div className="flex min-h-screen">
            <Sidebar />
            <main className="min-w-0 flex-1 px-3 py-4 sm:px-4 sm:py-5 lg:px-8 lg:py-8">
              {children}
            </main>
          </div>
        ) : (
          children
        )}
      </body>
    </html>
  );
}
