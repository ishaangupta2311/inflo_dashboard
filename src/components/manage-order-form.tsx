"use client";

import { useActionState } from "react";
import { Check, Save } from "lucide-react";
import { updateOrderAction } from "@/app/admin/actions";
import type { Order, OrderStatus } from "@/lib/orders";

const STATUSES: OrderStatus[] = ["In Progress", "Completed"];

const QUOTE_STATES = [
  { value: "", label: "—" },
  { value: "requested", label: "Requested" },
  { value: "quoted", label: "Quoted" },
  { value: "accepted", label: "Accepted" }
];

const fieldClass =
  "w-full rounded-xl border border-line bg-paper px-4 py-3 outline-none transition focus:border-violet focus:ring-4 focus:ring-violet/15";

export function ManageOrderForm({
  orderId,
  status,
  progress,
  amount,
  quoteStatus,
  category,
  linkTotal,
  linksDelivered,
  prTotal,
  prDelivered
}: {
  orderId: string;
  status: OrderStatus;
  progress: number;
  amount: number;
  quoteStatus?: string;
  category: Order["category"];
  linkTotal: number;
  linksDelivered: number;
  prTotal: number;
  prDelivered: number;
}) {
  const [state, formAction, pending] = useActionState(updateOrderAction, null);
  const isLinkOrder = linkTotal > 0;
  const isPrOrder = prTotal > 0;
  // Link/PR orders track delivery as a count; everything else uses % progress.
  const isCountOrder = isLinkOrder || isPrOrder;
  const countTotal = isLinkOrder ? linkTotal : prTotal;
  const countDelivered = isLinkOrder ? linksDelivered : prDelivered;
  const countLabel = isLinkOrder
    ? category === "AI SEO"
      ? "Mentions delivered"
      : "Links delivered"
    : "Features published";
  const isQuoteOrder = Boolean(quoteStatus);
  const deliveredPct = isCountOrder && countTotal > 0 ? Math.round((countDelivered / countTotal) * 100) : 0;

  return (
    <form action={formAction} className="mt-5 grid gap-4">
      <input type="hidden" name="orderId" value={orderId} />

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="mb-2 block text-sm font-black">Status</span>
          <select name="status" defaultValue={status} className={fieldClass}>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>

        {isCountOrder ? (
          <div className="block">
            <span className="mb-2 block text-sm font-black">{countLabel}</span>
            <div className="rounded-xl border border-line bg-paper px-4 py-3">
              <div className="flex items-center justify-between text-sm">
                <span className="font-black">
                  {countDelivered} / {countTotal}
                </span>
                <span className="font-mono text-xs text-muted">{deliveredPct}%</span>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-paper-2">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-violet via-coral to-mint"
                  style={{ width: `${deliveredPct}%` }}
                />
              </div>
            </div>
          </div>
        ) : (
          <label className="block">
            <span className="mb-2 block text-sm font-black">Progress (%)</span>
            <input name="progress" type="number" min={0} max={100} defaultValue={progress} className={fieldClass} />
          </label>
        )}

        {/* Amount + quote state only matter for quote orders — fixed-price orders are
            already priced at checkout, so there's nothing to change here. */}
        {isQuoteOrder ? (
          <>
            <label className="block">
              <span className="mb-2 block text-sm font-black">Amount (USD)</span>
              <input name="amount" type="number" min={0} step="0.01" defaultValue={amount} className={fieldClass} />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-black">Quote state</span>
              <select name="quoteStatus" defaultValue={quoteStatus ?? ""} className={fieldClass}>
                {QUOTE_STATES.map((q) => (
                  <option key={q.value} value={q.value}>
                    {q.label}
                  </option>
                ))}
              </select>
            </label>
          </>
        ) : null}
      </div>

      <label className="block">
        <span className="mb-2 block text-sm font-black">
          Note for the client <span className="font-normal text-muted">(optional)</span>
        </span>
        <textarea
          name="note"
          className={`min-h-24 ${fieldClass}`}
          placeholder="Added to the timeline alongside the status change."
        />
      </label>

      {state && !state.ok ? (
        <p className="rounded-xl bg-coral-soft px-4 py-3 text-sm font-bold text-coral-ink">{state.error}</p>
      ) : null}
      {state?.ok ? (
        <p className="inline-flex items-center gap-2 rounded-xl bg-mint/10 px-4 py-3 text-sm font-bold text-ink">
          <Check className="size-4 text-mint" />
          Saved.
        </p>
      ) : null}

      <button
        disabled={pending}
        className="inline-flex items-center justify-center gap-2 rounded-full bg-ink px-5 py-3 text-sm font-black text-paper transition hover:-translate-y-0.5 hover:bg-violet disabled:cursor-not-allowed disabled:opacity-60"
      >
        <Save className="size-4" />
        {pending ? "Saving…" : "Save changes"}
      </button>
    </form>
  );
}
