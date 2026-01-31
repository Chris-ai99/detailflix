import "./globals.css";
import Link from "next/link";

function NavLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="rounded px-3 py-2 hover:bg-slate-800 transition"
    >
      {label}
    </Link>
  );
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de">
      <body className="min-h-screen bg-slate-950 text-slate-100">
        <div className="flex">
          <aside className="w-64 bg-slate-900 min-h-screen p-4">
            <div className="text-xl font-bold mb-6">AUTOBIZ</div>
            <nav className="flex flex-col gap-1 text-slate-200">
              <NavLink href="/" label="Dashboard" />
              <NavLink href="/customers" label="Kunden" />
              <NavLink href="/services" label="Leistungen" />
              <NavLink href="/offers" label="Angebote" />
              <NavLink href="/invoices" label="Rechnungen" />
              <NavLink href="/vehicles" label="Fahrzeuge" />
            </nav>
          </aside>

          <main className="flex-1 p-8">{children}</main>
        </div>
      </body>
    </html>
  );
}
``