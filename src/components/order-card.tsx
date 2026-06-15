import Link from "next/link";
import { Download, ExternalLink } from "lucide-react";
import { categoryIcons, invoiceHref, money, type Order } from "@/lib/orders";

const statusTone: Record<Order["status"], string> = {
  "In Progress": "bg-violet-soft text-violet-ink",
  Completed: "bg-mint text-white"
};

export function OrderCard({ order }: { order: Order }) {
  const Icon = categoryIcons[order.category];
  const invoiceId = order.status === "Completed" ? order.invoiceId : undefined;
  const linkTotal = order.linkTotal ?? 0;
  const linksDelivered = order.linksDelivered ?? 0;
  const isLinkOrder = linkTotal > 0;
  const isMentionOrder = isLinkOrder && order.category === "AI SEO";
  const prTotal = order.prTotal ?? 0;
  const prDelivered = order.prDelivered ?? 0;
  const isPrOrder = prTotal > 0;
  const isCountOrder = isLinkOrder || isPrOrder;
  const countTotal = isLinkOrder ? linkTotal : prTotal;
  const countDelivered = isLinkOrder ? linksDelivered : prDelivered;
  const barPct = isCountOrder ? Math.round((countDelivered / countTotal) * 100) : order.progress;

  return (
    <article className="rounded-2xl border border-line bg-card p-5 shadow-card transition hover:-translate-y-0.5 hover:border-ink">
      <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-3">
            <span className="grid size-11 place-items-center rounded-xl bg-violet-soft text-violet">
              <Icon className="size-5" />
            </span>
            <div>
              <p className="font-mono text-xs font-bold uppercase tracking-[0.14em] text-muted">
                {order.id} · {order.category}
              </p>
              <h2 className="mt-1 font-display text-2xl font-black tracking-tight">{order.service}</h2>
            </div>
          </div>

          <div className="mt-5 grid gap-3 text-sm text-muted sm:grid-cols-3">
            <div>
              <span className="block font-bold text-ink">Ordered</span>
              {order.orderedAt}
            </div>
            <div>
              <span className="block font-bold text-ink">Due</span>
              {order.dueAt}
            </div>
            <div>
              <span className="block font-bold text-ink">Manager</span>
              {order.owner}
            </div>
          </div>

          <div className="mt-5">
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className={`rounded-full px-3 py-1 font-black ${statusTone[order.status]}`}>
                {order.status}
              </span>
              <span className="font-mono text-xs font-bold text-muted">
                {isLinkOrder
                  ? `${linksDelivered} / ${linkTotal} ${isMentionOrder ? "mentions" : "links"}`
                  : isPrOrder
                    ? `${prDelivered} / ${prTotal} features`
                    : `${order.progress}%`}
              </span>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-paper-2">
              <div className="h-full rounded-full bg-gradient-to-r from-violet via-coral to-mint" style={{ width: `${barPct}%` }} />
            </div>
          </div>
        </div>

        <div className="w-full rounded-xl border border-line bg-paper p-4 xl:w-72">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-muted">Amount</p>
              <p className="mt-1 font-display text-3xl font-black">
                {order.quoteStatus === "requested" ? "Pending" : money(order.amount)}
              </p>
            </div>
            {invoiceId ? (
              <a
                href={invoiceHref(invoiceId)}
                download={`${invoiceId}.pdf`}
                className="inline-flex items-center gap-2 rounded-full bg-ink px-3 py-2 text-xs font-black text-paper transition hover:bg-violet"
              >
                <Download className="size-4" />
                Invoice
              </a>
            ) : (
              <Link
                href={`/orders/${order.id}`}
                className="inline-flex items-center gap-2 rounded-full border border-line bg-card px-3 py-2 text-xs font-black text-ink transition hover:border-ink"
              >
                <ExternalLink className="size-4" />
                Details
              </Link>
            )}
          </div>

          <div className="mt-4 border-t border-line pt-4">
            {order.targetUrl ? (
              <p className="line-clamp-1 text-sm font-bold text-ink">{order.targetUrl}</p>
            ) : null}
            <ul className="mt-3 space-y-2">
              {order.deliverables.map((deliverable) => (
                <li key={deliverable} className="flex gap-2 text-sm text-muted">
                  <span className="mt-2 size-1.5 rounded-full bg-coral" />
                  <span>{deliverable}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </article>
  );
}
