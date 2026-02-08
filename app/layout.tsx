import "./globals.css";
import Sidebar from "./ui/Sidebar";
import { cookies } from "next/headers";
import { AUTH_COOKIE_NAME, isValidSessionToken } from "@/lib/auth";

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;
  const authenticated = isValidSessionToken(token);

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
