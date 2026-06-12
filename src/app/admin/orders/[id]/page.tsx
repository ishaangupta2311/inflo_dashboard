import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink, MessageSquarePlus } from "lucide-react";
import { postUpdateAction } from "@/app/admin/actions";
import { DashboardShell } from "@/components/dashboard-shell";
import { ManageOrderForm } from "@/components/manage-order-form";
import { OrderLinksTable } from "@/components/order-links-table";
import { OrderPrTable } from "@/components/order-pr-table";
import { getAdminOrder } from "@/lib/order-backend";
import { money } from "@/lib/orders";

export default async function AdminOrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const detail = await getAdminOrder(id);

  if (!detail) {
    notFound();
  }

  const { order, updates, links, prItems } = detail;
  const linkTotal = order.linkTotal ?? 0;
  const linksDelivered = order.linksDelivered ?? 0;
  const isLinkOrder = linkTotal > 0;
  const prTotal = order.prTotal ?? 0;
  const prDelivered = order.prDelivered ?? 0;
  const isPrOrder = prTotal > 0;

  return (
    <DashboardShell>
      <div className="mb-6">
        <Link href="/admin" className="inline-flex items-center gap-2 text-sm font-black text-muted transition hover:text-ink">
          <ArrowLeft className="size-4" />
          All orders
        </Link>
      </div>

      <section className="rounded-3xl border border-line bg-card p-6 shadow-card lg:p-8">
        <div className="flex flex-col gap-2">
          <p className="font-mono text-xs font-bold uppercase tracking-[0.16em] text-muted">
            {order.category} · {order.id}
          </p>
          <h1 className="font-display text-3xl font-black tracking-tight sm:text-4xl">{order.service}</h1>
        </div>

        <div className="mt-6 grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <p className="font-bold text-ink">Client</p>
            <p className="break-words text-muted">{order.userEmail ?? order.userId}</p>
          </div>
          <div>
            <p className="font-bold text-ink">Target URL</p>
            {order.targetUrl ? (
              <a href={order.targetUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 break-words text-violet hover:text-violet-ink">
                {order.targetUrl}
                <ExternalLink className="size-3.5 shrink-0" />
              </a>
            ) : (
              <p className="text-muted">—</p>
            )}
          </div>
          <div>
            <p className="font-bold text-ink">Ordered / Due</p>
            <p className="text-muted">{order.orderedAt} → {order.dueAt}</p>
          </div>
          <div>
            <p className="font-bold text-ink">Amount</p>
            <p className="text-muted">
              {money(order.amount)}
              {order.billing === "monthly" ? "/mo" : ""}
              {order.invoiceId ? ` · ${order.invoiceId}` : ""}
            </p>
          </div>
        </div>

        {order.deliverables.length > 0 ? (
          <ul className="mt-6 grid gap-2 border-t border-line pt-5 sm:grid-cols-2">
            {order.deliverables.map((deliverable) => (
              <li key={deliverable} className="flex gap-2 text-sm text-muted">
                <span className="mt-2 size-1.5 shrink-0 rounded-full bg-coral" />
                <span>{deliverable}</span>
              </li>
            ))}
          </ul>
        ) : null}
      </section>

      {isLinkOrder ? (
        <section className="mt-6 rounded-2xl border border-line bg-card p-6 shadow-card">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="font-display text-xl font-black tracking-tight">Links</h2>
              <p className="mt-1 text-sm text-muted">
                Fill the prospect URL, delivered DR, traffic, and publish link for each placement.
              </p>
            </div>
            <span className="rounded-full bg-paper px-3 py-1 text-sm font-black">
              {linksDelivered} / {linkTotal} delivered
            </span>
          </div>
          <div className="mt-4">
            <OrderLinksTable orderId={order.id} links={links} variant="admin" />
          </div>
        </section>
      ) : null}

      {isPrOrder ? (
        <section className="mt-6 rounded-2xl border border-line bg-card p-6 shadow-card">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="font-display text-xl font-black tracking-tight">Media features</h2>
              <p className="mt-1 text-sm text-muted">
                Fill the publish date and coverage excel link as each feature is published. You can also edit the
                client&apos;s title and PR doc.
              </p>
            </div>
            <span className="rounded-full bg-paper px-3 py-1 text-sm font-black">
              {prDelivered} / {prTotal} published
            </span>
          </div>
          <div className="mt-4">
            <OrderPrTable orderId={order.id} items={prItems} variant="admin" />
          </div>
        </section>
      ) : null}

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-line bg-card p-6 shadow-card">
          <h2 className="font-display text-xl font-black tracking-tight">Manage order</h2>
          <p className="mt-1 text-sm text-muted">
            Changing the status posts it to the client&apos;s timeline. Completing an order generates its invoice.
          </p>

          <ManageOrderForm
            orderId={order.id}
            status={order.status}
            progress={order.progress}
            amount={order.amount}
            quoteStatus={order.quoteStatus}
            linkTotal={linkTotal}
            linksDelivered={linksDelivered}
            prTotal={prTotal}
            prDelivered={prDelivered}
          />
        </section>

        <section className="rounded-2xl border border-line bg-card p-6 shadow-card">
          <h2 className="font-display text-xl font-black tracking-tight">Timeline</h2>
          <p className="mt-1 text-sm text-muted">Updates the client sees on their order.</p>

          <form action={postUpdateAction} className="mt-5 grid gap-3">
            <input type="hidden" name="orderId" value={order.id} />
            <textarea
              name="body"
              required
              className="min-h-20 w-full rounded-xl border border-line bg-paper px-4 py-3 outline-none transition focus:border-violet focus:ring-4 focus:ring-violet/15"
              placeholder="e.g. First 3 placements are live — links added to your report."
            />
            <button className="inline-flex w-fit items-center justify-center gap-2 rounded-full border border-ink px-4 py-2 text-sm font-black text-ink transition hover:bg-ink hover:text-paper">
              <MessageSquarePlus className="size-4" />
              Post update
            </button>
          </form>

          <div className="mt-6 space-y-4 border-t border-line pt-5">
            {updates.length > 0 ? (
              updates.map((update) => (
                <div key={update.id} className="rounded-xl border border-line bg-paper p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-black">{update.authorName}</p>
                    <p className="font-mono text-xs text-muted">{update.createdAt}</p>
                  </div>
                  <p className="mt-2 text-sm text-ink">{update.body}</p>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted">No updates yet.</p>
            )}
          </div>
        </section>
      </div>
    </DashboardShell>
  );
}
