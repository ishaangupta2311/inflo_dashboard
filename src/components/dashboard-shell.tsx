import Link from "next/link";
import { Bell, FileText, LayoutDashboard, Plus, Settings, ShoppingBag } from "lucide-react";

const navItems = [
  { label: "Orders", href: "/orders", icon: ShoppingBag, active: true },
  { label: "Invoices", href: "/orders#completed", icon: FileText },
  { label: "Settings", href: "#", icon: Settings }
];

export function DashboardShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-paper text-ink">
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-72 border-r border-line bg-card/80 px-5 py-6 backdrop-blur-xl lg:block">
        <Link href="/orders" className="flex items-center gap-3">
          <span className="grid size-10 -rotate-6 place-items-center rounded-xl bg-ink font-display text-lg font-black text-lime">
            IO
          </span>
          <span className="font-display text-xl font-black tracking-tight">
            Influencer
            <span className="text-violet">Outreach</span>
          </span>
        </Link>

        <nav className="mt-10 space-y-2">
          {navItems.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-bold transition ${
                item.active
                  ? "bg-ink text-paper shadow-soft"
                  : "text-muted hover:bg-paper-2 hover:text-ink"
              }`}
            >
              <item.icon className="size-4" />
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="absolute inset-x-5 bottom-6 rounded-2xl border border-line bg-paper p-4">
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-violet">
            <LayoutDashboard className="size-4" />
            Prototype
          </div>
          <p className="mt-3 text-sm leading-5 text-muted">
            Mock orders and invoice downloads are wired through typed local data for now.
          </p>
        </div>
      </aside>

      <div className="lg:pl-72">
        <header className="sticky top-0 z-10 border-b border-line bg-paper/88 backdrop-blur-xl">
          <div className="flex min-h-20 items-center justify-between gap-4 px-4 sm:px-6 lg:px-10">
            <div>
              <div className="font-mono text-xs font-bold uppercase tracking-[0.18em] text-violet">
                app.influenceroutreachsolutions.com
              </div>
              <h1 className="font-display text-2xl font-black tracking-tight sm:text-3xl">
                Client dashboard
              </h1>
            </div>

            <div className="flex items-center gap-2">
              <button className="grid size-11 place-items-center rounded-xl border border-line bg-card text-muted transition hover:border-ink hover:text-ink">
                <Bell className="size-5" />
              </button>
              <Link
                href="/orders/new"
                className="inline-flex items-center gap-2 rounded-full bg-coral px-4 py-3 text-sm font-black text-white shadow-coral transition hover:-translate-y-0.5 hover:bg-coral-ink"
              >
                <Plus className="size-4" />
                New Order
              </Link>
            </div>
          </div>
        </header>

        <main className="px-4 py-6 sm:px-6 lg:px-10 lg:py-10">{children}</main>
      </div>
    </div>
  );
}
