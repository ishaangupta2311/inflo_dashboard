import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, CheckCircle2, Download, ExternalLink, MessageSquare } from "lucide-react";
import { acceptQuoteAction } from "@/app/actions";
import { OrderRealtime } from "@/components/order-realtime";
import { DashboardShell } from "@/components/dashboard-shell";
import { OrderLinksTable } from "@/components/order-links-table";
import { isStaff } from "@/lib/auth";
import { getOrderDetail } from "@/lib/order-backend";
import { categoryIcons, invoiceHref, money, type OrderStatus } from "@/lib/orders";

const statusTone: Record<OrderStatus, string> = {
  "Brief received": "bg-violet-soft text-violet-ink",
  "In outreach": "bg-ink text-paper",
  "Content review": "bg-coral-soft text-coral-ink",
  Publishing: "bg-lime text-lime-ink",
  Completed: "bg-mint text-white"
};

export default async function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  if (await isStaff()) {
    redirect(`/admin/orders/${id}`);
  }

  const detail = await getOrderDetail(id);

  if (!detail) {
    notFound();
  }

  const { order, updates, links } = detail;
  const Icon = categoryIcons[order.category];
  const linkTotal = order.linkTotal ?? 0;
  const linksDelivered = order.linksDelivered ?? 0;
  const isLinkOrder = linkTotal > 0;
  const deliveredPct = isLinkOrder ? Math.round((linksDelivered / linkTotal) * 100) : order.progress;

  return (
    <DashboardShell>
      {isLinkOrder ? <OrderRealtime orderId={order.id} /> : null}
      <div className="mb-6">
        <Link href="/orders" className="inline-flex items-center gap-2 text-sm font-black text-muted transition hover:text-ink">
          <ArrowLeft className="size-4" />
          Current Orders
        </Link>
      </div>

      {order.quoteStatus ? (
        <div className="mb-6">
          {order.quoteStatus === "requested" ? (
            <div className="rounded-2xl border border-line bg-violet-soft p-5">
              <p className="font-display text-lg font-black text-violet-ink">Quote in progress</p>
              <p className="mt-1 text-sm text-violet-ink">
                We&apos;re scoping your request — your price will appear here shortly.
              </p>
            </div>
          ) : null}

          {order.quoteStatus === "quoted" ? (
            <div className="rounded-2xl border-2 border-violet bg-card p-5 shadow-card">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="font-mono text-xs font-bold uppercase tracking-[0.16em] text-violet">Your quote</p>
                  <p className="mt-1 font-display text-3xl font-black">{money(order.amount)}</p>
                  <p className="mt-1 text-sm text-muted">Review and accept to start the work.</p>
                </div>
                <form action={acceptQuoteAction}>
                  <input type="hidden" name="orderId" value={order.id} />
                  <button className="inline-flex items-center gap-2 rounded-full bg-coral px-5 py-3 text-sm font-black text-white shadow-coral transition hover:-translate-y-0.5 hover:bg-coral-ink">
                    <CheckCircle2 className="size-4" />
                    Accept quote
                  </button>
                </form>
              </div>
            </div>
          ) : null}

          {order.quoteStatus === "accepted" ? (
            <div className="flex items-center gap-3 rounded-2xl border border-mint bg-mint/10 p-5">
              <CheckCircle2 className="size-6 text-mint" />
              <div>
                <p className="font-display text-lg font-black">Quote accepted</p>
                <p className="text-sm text-muted">Thanks! The team will begin the work and post updates here.</p>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      <section className="rounded-3xl border border-line bg-card p-6 shadow-card lg:p-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-3">
              <span className="grid size-12 place-items-center rounded-xl bg-violet-soft text-violet">
                <Icon className="size-6" />
              </span>
              <div>
                <p className="font-mono text-xs font-bold uppercase tracking-[0.16em] text-muted">
                  {order.id} · {order.category}
                </p>
                <h1 className="font-display text-3xl font-black tracking-tight sm:text-4xl">{order.service}</h1>
              </div>
            </div>

            <div className="mt-6 grid gap-4 text-sm sm:grid-cols-3">
              <div>
                <p className="font-bold text-ink">Ordered</p>
                <p className="text-muted">{order.orderedAt}</p>
              </div>
              <div>
                <p className="font-bold text-ink">Due</p>
                <p className="text-muted">{order.dueAt}</p>
              </div>
              <div>
                <p className="font-bold text-ink">Manager</p>
                <p className="text-muted">{order.owner}</p>
              </div>
            </div>
          </div>

          <div className="w-full shrink-0 rounded-2xl border border-line bg-paper p-5 lg:w-72">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-muted">Amount</p>
            <p className="mt-1 font-display text-3xl font-black">
              {order.quoteStatus === "requested" ? "Pending" : money(order.amount)}
            </p>
            <a
              href={order.targetUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-3 inline-flex items-center gap-1 break-words text-sm font-bold text-violet hover:text-violet-ink"
            >
              {order.targetUrl}
              <ExternalLink className="size-3.5 shrink-0" />
            </a>
            {order.status === "Completed" && order.invoiceId ? (
              <a
                href={invoiceHref(order.invoiceId)}
                download={`${order.invoiceId}.pdf`}
                className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-full bg-ink px-4 py-2 text-sm font-black text-paper transition hover:bg-violet"
              >
                <Download className="size-4" />
                Download invoice
              </a>
            ) : null}
          </div>
        </div>

        <div className="mt-6 border-t border-line pt-5">
          <div className="flex items-center justify-between gap-3 text-sm">
            <span className={`rounded-full px-3 py-1 font-black ${statusTone[order.status]}`}>{order.status}</span>
            <span className="font-mono text-xs font-bold text-muted">
              {isLinkOrder ? `${linksDelivered} / ${linkTotal} links delivered` : `${order.progress}%`}
            </span>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-paper-2">
            <div
              className="h-full rounded-full bg-gradient-to-r from-violet via-coral to-mint"
              style={{ width: `${deliveredPct}%` }}
            />
          </div>

          {!isLinkOrder ? (
            <ul className="mt-5 grid gap-2 sm:grid-cols-2">
              {order.deliverables.map((deliverable) => (
                <li key={deliverable} className="flex gap-2 text-sm text-muted">
                  <span className="mt-2 size-1.5 shrink-0 rounded-full bg-coral" />
                  <span>{deliverable}</span>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </section>

      {isLinkOrder ? (
        <section className="mt-6">
          <h2 className="font-display text-2xl font-black tracking-tight">Your links</h2>
          <p className="mt-1 text-sm text-muted">
            Set the anchor text and landing page for each placement. We fill in the prospect site, delivered DR,
            traffic, and the live link as your order is fulfilled.
          </p>
          <div className="mt-4">
            <OrderLinksTable orderId={order.id} links={links} variant="client" />
          </div>
        </section>
      ) : null}

      <section className="mt-6 rounded-3xl border border-line bg-card p-6 shadow-card lg:p-8">
        <div className="flex items-center gap-2">
          <MessageSquare className="size-5 text-violet" />
          <h2 className="font-display text-2xl font-black tracking-tight">Updates</h2>
        </div>

        <div className="mt-5 space-y-4">
          {updates.length > 0 ? (
            updates.map((update) => (
              <div key={update.id} className="relative rounded-2xl border border-line bg-paper p-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-black">{update.authorName}</p>
                  <p className="font-mono text-xs text-muted">{update.createdAt}</p>
                </div>
                {update.status ? (
                  <span
                    className={`mt-2 inline-block rounded-full px-3 py-1 text-xs font-black ${
                      statusTone[update.status as OrderStatus] ?? "bg-violet-soft text-violet-ink"
                    }`}
                  >
                    {update.status}
                  </span>
                ) : null}
                <p className="mt-2 text-sm leading-6 text-ink">{update.body}</p>
              </div>
            ))
          ) : (
            <div className="rounded-2xl border border-dashed border-line bg-paper p-8 text-center">
              <p className="font-display text-xl font-black tracking-tight">No updates yet</p>
              <p className="mx-auto mt-2 max-w-md text-sm text-muted">
                Your account manager posts progress here as the work moves forward.
              </p>
            </div>
          )}
        </div>
      </section>
    </DashboardShell>
  );
}
