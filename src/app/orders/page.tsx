import Link from "next/link";
import { redirect } from "next/navigation";
import { Download, FileText, PackageCheck, Plus, TrendingUp } from "lucide-react";
import { DataUnavailableNotice } from "@/components/data-unavailable-notice";
import { DashboardShell } from "@/components/dashboard-shell";
import { OrderCard } from "@/components/order-card";
import { isStaff } from "@/lib/auth";
import { emptyDashboardData, getDashboardData } from "@/lib/order-backend";
import { invoiceHref, money } from "@/lib/orders";

const statIcons = {
  violet: PackageCheck,
  ink: FileText,
  coral: TrendingUp
};

export default async function OrdersPage() {
  if (await isStaff()) {
    redirect("/admin");
  }

  let unavailable = false;
  let data = emptyDashboardData();

  try {
    data = await getDashboardData();
  } catch (error) {
    unavailable = true;
    console.error("[orders] dashboard data load failed:", error);
  }

  const { activeOrders, completedOrders, stats } = data;

  return (
    <DashboardShell>
      {unavailable ? <DataUnavailableNotice /> : null}

      <section className="grid gap-4 md:grid-cols-3">
        {stats.map((stat) => {
          const Icon = statIcons[stat.tone];

          return (
            <div key={stat.label} className="rounded-2xl border border-line bg-card p-5 shadow-card">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-mono text-xs font-bold uppercase tracking-[0.16em] text-muted">
                    {stat.label}
                  </p>
                  <p className="mt-3 font-display text-4xl font-black tracking-tight">{stat.value}</p>
                  <p className="mt-1 text-sm text-muted">{stat.detail}</p>
                </div>
                <span className="grid size-11 place-items-center rounded-xl bg-violet-soft text-violet">
                  <Icon className="size-5" />
                </span>
              </div>
            </div>
          );
        })}
      </section>

      <section className="mt-8">
        <div className="mb-4">
          <p className="font-mono text-xs font-bold uppercase tracking-[0.18em] text-violet">
            Current Orders
          </p>
          <h2 className="mt-2 font-display text-3xl font-black tracking-tight">In delivery</h2>
        </div>
        {activeOrders.length > 0 ? (
          <div className="grid gap-4">
            {activeOrders.map((order) => (
              <OrderCard key={order.id} order={order} />
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-line bg-card p-8 text-center shadow-card">
            <p className="font-display text-2xl font-black tracking-tight">No current orders yet</p>
            <p className="mx-auto mt-2 max-w-md text-sm text-muted">
              Start the first order from this dashboard and it will appear here immediately.
            </p>
            <Link
              href="/store"
              className="mt-5 inline-flex items-center gap-2 rounded-full bg-coral px-5 py-3 text-sm font-black text-white shadow-coral transition hover:-translate-y-0.5 hover:bg-coral-ink"
            >
              <Plus className="size-4" />
              New Order
            </Link>
          </div>
        )}
      </section>

      <section id="completed" className="mt-10">
        <div className="mb-4">
          <p className="font-mono text-xs font-bold uppercase tracking-[0.18em] text-violet">
            Completed Orders
          </p>
          <h2 className="mt-2 font-display text-3xl font-black tracking-tight">Ready for records</h2>
        </div>

        {completedOrders.length > 0 ? (
          <div className="overflow-hidden rounded-2xl border border-line bg-card shadow-card">
            <div className="hidden grid-cols-[1fr_150px_140px_170px] border-b border-line bg-paper px-5 py-3 text-xs font-black uppercase tracking-[0.14em] text-muted md:grid">
              <span>Order</span>
              <span>Completed</span>
              <span>Amount</span>
              <span>Invoice</span>
            </div>
            {completedOrders.map((order) => (
              <div key={order.id} className="grid gap-3 border-b border-line px-5 py-4 last:border-b-0 md:grid-cols-[1fr_150px_140px_170px] md:items-center">
                <div>
                  <p className="font-bold">{order.service}</p>
                  <p className="text-sm text-muted">{order.id} · {order.category}</p>
                </div>
                <p className="text-sm text-muted">{order.dueAt}</p>
                <p className="font-display text-xl font-black">{money(order.amount)}</p>
                {order.invoiceId ? (
                  <a
                    href={invoiceHref(order.invoiceId)}
                    download={`${order.invoiceId}.pdf`}
                    className="inline-flex w-fit items-center gap-2 rounded-full bg-ink px-4 py-2 text-sm font-black text-paper transition hover:bg-violet"
                  >
                    <Download className="size-4" />
                    Download Invoice
                  </a>
                ) : null}
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-line bg-card p-8 text-center shadow-card">
            <p className="font-display text-2xl font-black tracking-tight">No completed orders yet</p>
            <p className="mx-auto mt-2 max-w-md text-sm text-muted">
              Completed work and invoice downloads will appear here after fulfilment is finished.
            </p>
          </div>
        )}
      </section>
    </DashboardShell>
  );
}
