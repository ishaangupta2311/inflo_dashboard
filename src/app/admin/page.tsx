import Link from "next/link";
import { ArrowUpRight, Inbox } from "lucide-react";
import { DataUnavailableNotice } from "@/components/data-unavailable-notice";
import { DashboardShell } from "@/components/dashboard-shell";
import { listAllOrders } from "@/lib/order-backend";
import { money, type OrderStatus } from "@/lib/orders";

const STATUS_FILTERS: ("All" | OrderStatus)[] = ["All", "In Progress", "Completed"];

const statusTone: Record<OrderStatus, string> = {
  "In Progress": "bg-violet-soft text-violet-ink",
  Completed: "bg-mint text-white"
};

export default async function AdminPage({
  searchParams
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  let unavailable = false;
  let orders: Awaited<ReturnType<typeof listAllOrders>> = [];

  try {
    orders = await listAllOrders();
  } catch (error) {
    unavailable = true;
    console.error("[admin] order data load failed:", error);
  }

  const activeFilter: "All" | OrderStatus =
    status && (STATUS_FILTERS as string[]).includes(status) ? (status as OrderStatus) : "All";
  const visible = activeFilter === "All" ? orders : orders.filter((order) => order.status === activeFilter);

  const openCount = orders.filter((order) => order.status !== "Completed").length;
  const quoteCount = orders.filter((order) => order.quoteStatus === "requested").length;
  const revenue = orders
    .filter((order) => order.status === "Completed")
    .reduce((sum, order) => sum + order.amount, 0);

  return (
    <DashboardShell>
      {unavailable ? (
        <DataUnavailableNotice
          title="Admin order data is temporarily unavailable"
          message="Your staff session is active, but the order database could not be reached. Try again shortly."
        />
      ) : null}

      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-line bg-card p-5 shadow-card">
          <p className="font-mono text-xs font-bold uppercase tracking-[0.16em] text-muted">Open orders</p>
          <p className="mt-3 font-display text-4xl font-black tracking-tight">{openCount}</p>
        </div>
        <div className="rounded-2xl border border-line bg-card p-5 shadow-card">
          <p className="font-mono text-xs font-bold uppercase tracking-[0.16em] text-muted">Quote requests</p>
          <p className="mt-3 font-display text-4xl font-black tracking-tight">{quoteCount}</p>
        </div>
        <div className="rounded-2xl border border-line bg-card p-5 shadow-card">
          <p className="font-mono text-xs font-bold uppercase tracking-[0.16em] text-muted">Completed revenue</p>
          <p className="mt-3 font-display text-4xl font-black tracking-tight">{money(revenue)}</p>
        </div>
      </section>

      <section className="mt-8">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          {STATUS_FILTERS.map((filter) => {
            const href = filter === "All" ? "/admin" : `/admin?status=${encodeURIComponent(filter)}`;
            const isActive = activeFilter === filter;
            return (
              <Link
                key={filter}
                href={href}
                className={`rounded-full border px-4 py-2 text-sm font-black transition ${
                  isActive ? "border-ink bg-ink text-paper" : "border-line bg-card text-muted hover:border-ink hover:text-ink"
                }`}
              >
                {filter}
              </Link>
            );
          })}
        </div>

        {visible.length > 0 ? (
          <div className="overflow-hidden rounded-2xl border border-line bg-card shadow-card">
            <div className="hidden grid-cols-[1.4fr_1fr_140px_120px_120px] border-b border-line bg-paper px-5 py-3 text-xs font-black uppercase tracking-[0.14em] text-muted lg:grid">
              <span>Client &amp; service</span>
              <span>Status</span>
              <span>Amount</span>
              <span>Created</span>
              <span className="text-right">Manage</span>
            </div>
            {visible.map((order) => (
              <Link
                key={order.id}
                href={`/admin/orders/${order.id}`}
                className="grid gap-3 border-b border-line px-5 py-4 transition last:border-b-0 hover:bg-paper lg:grid-cols-[1.4fr_1fr_140px_120px_120px] lg:items-center"
              >
                <div className="min-w-0">
                  <p className="truncate font-bold">{order.userEmail ?? `${order.userId.slice(0, 14)}…`}</p>
                  <p className="truncate text-sm text-muted">
                    {order.service} · {order.id}
                  </p>
                </div>
                <div>
                  <span className={`rounded-full px-3 py-1 text-sm font-black ${statusTone[order.status]}`}>
                    {order.status}
                  </span>
                  {order.quoteStatus === "requested" ? (
                    <span className="ml-2 rounded-full bg-coral-soft px-2 py-1 text-xs font-black text-coral-ink">
                      Quote
                    </span>
                  ) : null}
                </div>
                <p className="font-display text-xl font-black">
                  {order.quoteStatus === "requested" && order.amount === 0 ? "—" : money(order.amount)}
                </p>
                <p className="text-sm text-muted">{order.createdAtLabel}</p>
                <span className="inline-flex items-center justify-end gap-1 text-sm font-black text-violet">
                  Open
                  <ArrowUpRight className="size-4" />
                </span>
              </Link>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-line bg-card p-10 text-center shadow-card">
            <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-violet-soft text-violet">
              <Inbox className="size-7" />
            </span>
            <p className="mt-4 font-display text-2xl font-black tracking-tight">No orders here</p>
            <p className="mx-auto mt-2 max-w-md text-sm text-muted">
              {activeFilter === "All"
                ? "When clients place orders they'll show up here."
                : `No orders in “${activeFilter}” right now.`}
            </p>
          </div>
        )}
      </section>
    </DashboardShell>
  );
}
