import Link from "next/link";
import { redirect } from "next/navigation";
import { Download, FileText } from "lucide-react";
import { DataUnavailableNotice } from "@/components/data-unavailable-notice";
import { DashboardShell } from "@/components/dashboard-shell";
import { isStaff } from "@/lib/auth";
import { listOrders } from "@/lib/order-backend";
import { invoiceHref, money, type OrderStatus } from "@/lib/orders";

const statusTone: Record<OrderStatus, string> = {
  "In Progress": "bg-violet-soft text-violet-ink",
  Completed: "bg-mint text-white"
};

const headClass = "px-4 py-3 font-mono text-xs font-bold uppercase tracking-[0.12em] text-muted";

export default async function InvoicesPage() {
  if (await isStaff()) {
    redirect("/admin");
  }

  let unavailable = false;
  let orders: Awaited<ReturnType<typeof listOrders>> = [];

  try {
    orders = await listOrders();
  } catch (error) {
    unavailable = true;
    console.error("[invoices] order data load failed:", error);
  }

  // Payment history = priced orders (a quote still being scoped has no price yet).
  const history = orders.filter((order) => order.quoteStatus !== "requested");
  const totalPaid = history
    .filter((order) => order.paymentStatus === "paid")
    .reduce((sum, order) => sum + order.amount, 0);

  return (
    <DashboardShell>
      {unavailable ? (
        <DataUnavailableNotice
          title="Invoice data is temporarily unavailable"
          message="You are signed in, but we could not load your invoices right now. Please try again shortly."
        />
      ) : null}

      <section className="rounded-3xl border border-line bg-card p-6 shadow-card lg:p-8">
        <div className="flex items-center gap-2">
          <FileText className="size-5 text-violet" />
          <h1 className="font-display text-3xl font-black tracking-tight">Invoices &amp; payment history</h1>
        </div>
        <p className="mt-2 text-sm text-muted">
          Every order on your account, with an invoice to download once it&apos;s paid or complete.
        </p>

        {history.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-dashed border-line bg-paper p-8 text-center">
            <p className="font-display text-xl font-black tracking-tight">No orders yet</p>
            <p className="mx-auto mt-2 max-w-md text-sm text-muted">
              Your invoices will appear here as you place and complete orders.
            </p>
          </div>
        ) : (
          <div className="mt-6 overflow-x-auto rounded-2xl border border-line">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-line bg-paper text-left">
                  <th className={headClass}>Date</th>
                  <th className={headClass}>Service</th>
                  <th className={headClass}>Status</th>
                  <th className={`${headClass} text-right`}>Amount</th>
                  <th className={`${headClass} text-right`}>Invoice</th>
                </tr>
              </thead>
              <tbody>
                {history.map((order) => (
                  <tr key={order.id} className="border-b border-line last:border-0">
                    <td className="whitespace-nowrap px-4 py-3 text-muted">{order.orderedAt}</td>
                    <td className="px-4 py-3">
                      <Link href={`/orders/${order.id}`} className="font-bold text-ink transition hover:text-violet">
                        {order.service}
                      </Link>
                      <span className="block font-mono text-xs text-muted">{order.id}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className={`rounded-full px-3 py-1 text-xs font-black ${statusTone[order.status]}`}>
                          {order.status}
                        </span>
                        {order.paymentStatus === "paid" ? (
                          <span className="rounded-full bg-lime px-3 py-1 text-xs font-black text-lime-ink">
                            Paid
                          </span>
                        ) : null}
                        {order.paymentStatus === "refunded" ? (
                          <span className="rounded-full bg-coral/20 px-3 py-1 text-xs font-black text-coral">
                            Refunded
                          </span>
                        ) : null}
                        {order.paymentStatus === "partially_refunded" ? (
                          <span className="rounded-full bg-coral/20 px-3 py-1 text-xs font-black text-coral">
                            Partially refunded
                          </span>
                        ) : null}
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right font-black">{money(order.amount)}</td>
                    <td className="px-4 py-3 text-right">
                      {order.invoiceId ? (
                        <a
                          href={invoiceHref(order.invoiceId)}
                          download={`${order.invoiceId}.pdf`}
                          className="inline-flex items-center gap-1.5 rounded-full bg-ink px-3 py-1.5 text-xs font-black text-paper transition hover:bg-violet"
                        >
                          <Download className="size-3.5" />
                          Download
                        </a>
                      ) : (
                        <span className="text-xs text-muted">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {totalPaid > 0 ? (
          <p className="mt-4 text-right text-sm font-bold text-ink">
            Total paid: <span className="font-black">{money(totalPaid)}</span>
          </p>
        ) : null}
      </section>
    </DashboardShell>
  );
}
