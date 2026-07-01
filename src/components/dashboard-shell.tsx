import Link from "next/link";
import { SignInButton, SignUpButton, Show, UserButton } from "@clerk/nextjs";
import { LayoutDashboard, Plus } from "lucide-react";
import { CartButton } from "@/components/cart-button";
import { NotificationsBell } from "@/components/notifications-bell";
import { SidebarNav } from "@/components/sidebar-nav";
import { isStaff } from "@/lib/auth";
import { listRecentUpdatesForStaff, listRecentUpdatesForUser } from "@/lib/order-backend";

export async function DashboardShell({ children }: { children: React.ReactNode }) {
  const staff = await isStaff();
  // Clients are notified of staff changes to their orders; staff are notified of
  // client changes across all orders.
  const updates = staff
    ? await listRecentUpdatesForStaff().catch(() => [])
    : await listRecentUpdatesForUser().catch(() => []);

  return (
    <div className="min-h-screen bg-paper text-ink">
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-72 border-r border-line bg-card/80 px-5 py-6 backdrop-blur-xl lg:block">
        <Link href={staff ? "/admin" : "/orders"} className="flex items-center gap-3">
          <span className="grid size-10 -rotate-6 place-items-center rounded-xl bg-ink font-display text-lg font-black text-lime">
            IO
          </span>
          <span className="font-display text-xl font-black tracking-tight">
            Influencer
            <span className="text-violet">Outreach</span>
          </span>
        </Link>

        <SidebarNav staff={staff} />

        <div className="absolute inset-x-5 bottom-6 rounded-2xl border border-line bg-paper p-4">
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-violet">
            <LayoutDashboard className="size-4" />
            {staff ? "Staff access" : "Your account"}
          </div>
          <p className="mt-3 text-sm leading-5 text-muted">
            {staff
              ? "Manage and update any client's order status and publish updates from the console."
              : "Orders, progress updates, and invoices are saved to your account in real time."}
          </p>
        </div>
      </aside>

      <div className="lg:pl-72">
        <header className="sticky top-0 z-10 border-b border-line bg-paper/88 backdrop-blur-xl">
          <div className="flex min-h-20 items-center justify-between gap-4 px-4 sm:px-6 lg:px-10">
            <div>
              <h1 className="font-display text-2xl font-black tracking-tight sm:text-3xl">
                {staff ? "Operations dashboard" : "Client dashboard"}
              </h1>
            </div>

            <div className="flex items-center gap-2">
              <NotificationsBell
                updates={updates}
                basePath={staff ? "/admin/orders" : "/orders"}
                storageKey={staff ? "inflo.notifications.staff.lastSeen.v1" : "inflo.notifications.lastSeen.v1"}
              />
              {!staff ? (
                <>
                  <CartButton />
                  <Link
                    href="/store"
                    className="inline-flex items-center gap-2 rounded-full bg-coral px-4 py-3 text-sm font-black text-white shadow-coral transition hover:-translate-y-0.5 hover:bg-coral-ink"
                  >
                    <Plus className="size-4" />
                    Order services
                  </Link>
                </>
              ) : null}

              <Show when="signed-out">
                <SignInButton mode="modal" fallbackRedirectUrl="/orders" signUpFallbackRedirectUrl="/orders">
                  <button className="rounded-full border border-line bg-card px-4 py-3 text-sm font-black text-ink transition hover:border-ink">
                    Sign in
                  </button>
                </SignInButton>
                <SignUpButton mode="modal" fallbackRedirectUrl="/orders" signInFallbackRedirectUrl="/orders">
                  <button className="rounded-full bg-ink px-4 py-3 text-sm font-black text-paper transition hover:-translate-y-0.5">
                    Sign up
                  </button>
                </SignUpButton>
              </Show>
              <Show when="signed-in">
                <UserButton />
              </Show>
            </div>
          </div>
        </header>

        <main className="px-4 py-6 sm:px-6 lg:px-10 lg:py-10">{children}</main>
      </div>
    </div>
  );
}
