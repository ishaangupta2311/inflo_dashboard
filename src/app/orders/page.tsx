import Link from "next/link";
import { ArrowRight, Download, Plus } from "lucide-react";
import { DashboardShell } from "@/components/dashboard-shell";
import { OrderCard } from "@/components/order-card";
import { activeOrders, completedOrders, dashboardStats, invoiceHref } from "@/lib/orders";

export default function OrdersPage() {
  return (
    <DashboardShell>
      <section className="grid gap-4 md:grid-cols-3">
        {dashboardStats.map((stat) => (
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
                <stat.icon className="size-5" />
              </span>
            </div>
          </div>
        ))}
      </section>

      <section className="mt-6 overflow-hidden rounded-3xl border border-line bg-ink text-paper shadow-soft">
        <div className="grid gap-6 p-6 lg:grid-cols-[1.15fr_0.85fr] lg:p-8">
          <div>
            <p className="font-mono text-xs font-bold uppercase tracking-[0.18em] text-lime">
              Current Orders
            </p>
            <h2 className="mt-4 max-w-2xl font-display text-4xl font-black leading-none tracking-tight sm:text-5xl">
              Every live campaign, deadline, and invoice action in one place.
            </h2>
          </div>
          <div className="flex flex-col justify-between gap-6 rounded-2xl border border-white/10 bg-white/8 p-5">
            <p className="text-sm leading-6 text-[#d9d5e2]">
              This prototype mirrors the future production dashboard at app.influenceroutreachsolutions.com.
              Orders and invoice downloads are mock data today, but the UI is structured around typed data.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/orders/new"
                className="inline-flex items-center gap-2 rounded-full bg-lime px-4 py-3 text-sm font-black text-ink transition hover:-translate-y-0.5"
              >
                <Plus className="size-4" />
                New Order
              </Link>
              <a
                href="#completed"
                className="inline-flex items-center gap-2 rounded-full border border-white/20 px-4 py-3 text-sm font-black text-paper transition hover:border-lime"
              >
                Completed Orders
                <ArrowRight className="size-4" />
              </a>
            </div>
          </div>
        </div>
      </section>

      <section className="mt-8">
        <div className="mb-4 flex items-end justify-between gap-4">
          <div>
            <p className="font-mono text-xs font-bold uppercase tracking-[0.18em] text-violet">
              Current Orders
            </p>
            <h2 className="mt-2 font-display text-3xl font-black tracking-tight">In delivery</h2>
          </div>
          <Link href="/orders/new" className="hidden items-center gap-2 rounded-full border border-ink px-4 py-2 text-sm font-black sm:inline-flex">
            New Order
            <Plus className="size-4" />
          </Link>
        </div>
        <div className="grid gap-4">
          {activeOrders.map((order) => (
            <OrderCard key={order.id} order={order} />
          ))}
        </div>
      </section>

      <section id="completed" className="mt-10">
        <div className="mb-4">
          <p className="font-mono text-xs font-bold uppercase tracking-[0.18em] text-violet">
            Completed Orders
          </p>
          <h2 className="mt-2 font-display text-3xl font-black tracking-tight">Ready for records</h2>
        </div>

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
              <p className="font-display text-xl font-black">${order.amount.toLocaleString()}</p>
              {order.invoiceId ? (
                <a
                  href={invoiceHref(order.invoiceId)}
                  download={`${order.invoiceId}.txt`}
                  className="inline-flex w-fit items-center gap-2 rounded-full bg-ink px-4 py-2 text-sm font-black text-paper transition hover:bg-violet"
                >
                  <Download className="size-4" />
                  Download Invoice
                </a>
              ) : null}
            </div>
          ))}
        </div>
      </section>
    </DashboardShell>
  );
}
