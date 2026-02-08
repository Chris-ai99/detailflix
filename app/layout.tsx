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
          <div className="flex">
            <Sidebar />
            <main className="flex-1 p-8">{children}</main>
          </div>
        ) : (
          children
        )}
      </body>
    </html>
  );
}
