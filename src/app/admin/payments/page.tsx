import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowUpRight, CreditCard, ReceiptText } from "lucide-react";
import { DataUnavailableNotice } from "@/components/data-unavailable-notice";
import { DashboardShell } from "@/components/dashboard-shell";
import { isAdmin } from "@/lib/auth";
import { listPaymentsForAdmin } from "@/lib/order-backend";
import { money } from "@/lib/orders";

const paymentTone = {
  paid: "bg-lime text-lime-ink",
  partially_refunded: "bg-coral/20 text-coral-ink",
  refunded: "bg-paper-2 text-muted",
  processing: "bg-violet-soft text-violet-ink",
  reconciliation_required: "bg-coral text-white"
};

const paymentLabel = {
  paid: "Paid",
  partially_refunded: "Partially refunded",
  refunded: "Refunded",
  processing: "Processing",
  reconciliation_required: "Reconcile"
};

export default async function PaymentsPage() {
  if (!(await isAdmin())) {
    redirect("/admin");
  }

  let unavailable = false;
  let payments: Awaited<ReturnType<typeof listPaymentsForAdmin>> = [];
  try {
    payments = await listPaymentsForAdmin();
  } catch (error) {
    unavailable = true;
    console.error("[admin] payment data load failed:", error);
  }

  const capturedTotal = payments.reduce((sum, payment) => sum + payment.grossAmount, 0);
  const refundDataIncomplete = payments.some((payment) => payment.refundedAmount === undefined);
  const refundedTotal = payments.reduce(
    (sum, payment) => sum + (payment.refundedAmount ?? 0),
    0
  );
  const netTotal = capturedTotal - refundedTotal;
  const exceptionCount = payments.filter((payment) => payment.status !== "paid").length;

  return (
    <DashboardShell>
      {unavailable ? (
        <DataUnavailableNotice
          title="Payment data is temporarily unavailable"
          message="The payment ledger could not be loaded right now. Try again shortly."
        />
      ) : null}

      <section className="border-b border-line pb-8">
        <div className="flex flex-wrap items-end justify-between gap-5">
          <div>
            <p className="font-mono text-xs font-bold uppercase tracking-[0.18em] text-violet">Admin</p>
            <div className="mt-2 flex items-center gap-3">
              <span className="grid size-10 place-items-center rounded-xl bg-violet-soft text-violet">
                <CreditCard className="size-5" />
              </span>
              <h1 className="font-display text-4xl font-black tracking-tight">Payments</h1>
            </div>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-muted">
              Captured checkout payments, grouped by transaction so every client charge appears once.
            </p>
          </div>

          <dl className="grid grid-cols-2 divide-x divide-y divide-line border border-line bg-card text-right shadow-card sm:grid-cols-4 sm:divide-y-0">
            <div className="px-4 py-3 sm:px-5">
              <dt className="font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-muted">Captured</dt>
              <dd className="mt-1 font-display text-xl font-black">{money(capturedTotal)}</dd>
            </div>
            <div className="px-4 py-3 sm:px-5">
              <dt className="font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-muted">Refunded</dt>
              <dd className="mt-1 font-display text-xl font-black">
                {refundDataIncomplete ? "Pending" : money(refundedTotal)}
              </dd>
            </div>
            <div className="px-4 py-3 sm:px-5">
              <dt className="font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-muted">Net received</dt>
              <dd className="mt-1 font-display text-xl font-black">
                {refundDataIncomplete ? "Pending" : money(netTotal)}
              </dd>
            </div>
            <div className="px-4 py-3 sm:px-5">
              <dt className="font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-muted">Exceptions</dt>
              <dd className="mt-1 font-display text-xl font-black">{exceptionCount}</dd>
            </div>
          </dl>
        </div>
      </section>

      <section className="mt-8">
        <div className="mb-4 flex items-center justify-between gap-4">
          <div>
            <p className="font-mono text-xs font-bold uppercase tracking-[0.18em] text-violet">Ledger</p>
            <h2 className="mt-2 font-display text-3xl font-black tracking-tight">Received payments</h2>
          </div>
          <p className="text-sm font-bold text-muted">{payments.length} transaction{payments.length === 1 ? "" : "s"}</p>
        </div>

        {payments.length > 0 ? (
          <div className="overflow-x-auto rounded-2xl border border-line bg-card shadow-card">
            <div className="min-w-[1120px]">
              <div className="grid grid-cols-[1.1fr_1.5fr_150px_120px_120px_120px_145px] gap-5 border-b border-line bg-paper px-5 py-3 font-mono text-xs font-bold uppercase tracking-[0.14em] text-muted">
                <span>Client</span>
                <span>Products purchased</span>
                <span>Received</span>
                <span className="text-right">Gross</span>
                <span className="text-right">Refunded</span>
                <span className="text-right">Net</span>
                <span className="text-right">Status</span>
              </div>
              {payments.map((payment) => (
                <div
                  key={payment.id}
                  className="grid grid-cols-[1.1fr_1.5fr_150px_120px_120px_120px_145px] gap-5 border-b border-line px-5 py-4 last:border-b-0"
                >
                  <div className="min-w-0">
                    <p className="truncate font-bold">{payment.client}</p>
                    <p className="mt-1 truncate font-mono text-xs text-muted" title={payment.reference}>
                      {payment.reference ? `PayPal · ${payment.reference}` : "Manual payment"}
                    </p>
                  </div>
                  <div className="min-w-0">
                    {payment.orderIds[0] ? (
                      <Link
                        href={`/admin/orders/${payment.orderIds[0]}`}
                        className="group inline-flex max-w-full items-start gap-1.5 font-bold text-ink transition hover:text-violet"
                      >
                        <span className="truncate">{payment.products.join(" · ")}</span>
                        <ArrowUpRight className="mt-0.5 size-3.5 shrink-0 opacity-0 transition group-hover:opacity-100" />
                      </Link>
                    ) : (
                      <p className="truncate font-bold">{payment.products.join(" · ")}</p>
                    )}
                    {payment.products.length > 1 ? (
                      <p className="mt-1 text-xs text-muted">{payment.orderIds.length} order records</p>
                    ) : payment.orderIds.length === 0 ? (
                      <p className="mt-1 text-xs font-bold text-coral-ink">Order creation requires reconciliation</p>
                    ) : null}
                  </div>
                  <p className="text-sm text-muted">{payment.paidAt}</p>
                  <p className="text-right font-display text-xl font-black">{money(payment.grossAmount)}</p>
                  <p className="text-right font-display text-xl font-black">
                    {payment.refundedAmount === undefined ? "Pending" : money(payment.refundedAmount)}
                  </p>
                  <p className="text-right font-display text-xl font-black">
                    {payment.netAmount === undefined ? "Pending" : money(payment.netAmount)}
                  </p>
                  <div className="text-right">
                    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-black ${paymentTone[payment.status]}`}>
                      {paymentLabel[payment.status]}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-line bg-card px-6 py-14 text-center shadow-card">
            <ReceiptText className="mx-auto size-9 text-violet" />
            <p className="mt-4 font-display text-2xl font-black tracking-tight">No captured payments yet</p>
            <p className="mx-auto mt-2 max-w-md text-sm text-muted">
              Completed PayPal checkouts will appear here with the client, purchased services, and received amount.
            </p>
          </div>
        )}
      </section>
    </DashboardShell>
  );
}
