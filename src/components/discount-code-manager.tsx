"use client";

import { useActionState } from "react";
import { BadgePercent, Plus } from "lucide-react";
import {
  createDiscountCodeAction,
  setDiscountCodeActiveAction,
  type DiscountActionResult
} from "@/app/admin/actions";
import type { DiscountCodeSummary } from "@/lib/discount-code-backend";

const fieldClass =
  "w-full rounded-xl border border-line bg-paper px-4 py-3 font-bold outline-none transition focus:border-violet focus:ring-4 focus:ring-violet/15";

export function DiscountCodeManager({ codes }: { codes: DiscountCodeSummary[] }) {
  const [state, formAction, pending] = useActionState<DiscountActionResult | null, FormData>(
    createDiscountCodeAction,
    null
  );

  return (
    <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_340px] xl:items-start">
      <section className="min-w-0">
        <div className="mb-4 flex items-end justify-between gap-4">
          <div>
            <p className="font-mono text-xs font-bold uppercase tracking-[0.18em] text-violet">Available codes</p>
            <h2 className="mt-2 font-display text-3xl font-black tracking-tight">Promotion controls</h2>
          </div>
          <span className="shrink-0 rounded-full bg-violet-soft px-3 py-1.5 text-sm font-black text-violet-ink">
            {codes.length} total
          </span>
        </div>

        {codes.length > 0 ? (
          <div className="overflow-hidden rounded-2xl border border-line bg-card shadow-card">
            <div className="hidden grid-cols-[minmax(0,1fr)_120px_120px_130px] gap-4 border-b border-line bg-paper px-5 py-3 font-mono text-xs font-bold uppercase tracking-[0.14em] text-muted sm:grid">
              <span>Code</span>
              <span>Discount</span>
              <span>Status</span>
              <span className="text-right">Control</span>
            </div>
            {codes.map((code) => (
              <div
                key={code.id}
                className="grid gap-3 border-b border-line px-5 py-4 last:border-b-0 sm:grid-cols-[minmax(0,1fr)_120px_120px_130px] sm:items-center"
              >
                <div>
                  <p className="font-mono text-base font-black tracking-[0.12em] text-ink">{code.code}</p>
                  <p className="mt-1 text-xs text-muted">Created {code.createdAt}</p>
                </div>
                <p className="font-display text-xl font-black">{code.percentage}% off</p>
                <span
                  className={`w-fit rounded-full px-3 py-1 text-xs font-black ${
                    code.active ? "bg-lime text-lime-ink" : "bg-paper-2 text-muted"
                  }`}
                >
                  {code.active ? "Active" : "Inactive"}
                </span>
                <form action={setDiscountCodeActiveAction} className="sm:text-right">
                  <input type="hidden" name="discountCodeId" value={code.id} />
                  <input type="hidden" name="active" value={String(!code.active)} />
                  <button className="text-sm font-black text-violet transition hover:text-violet-ink">
                    {code.active ? "Deactivate" : "Activate"}
                  </button>
                </form>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-line bg-card px-6 py-12 text-center">
            <BadgePercent className="mx-auto size-8 text-violet" />
            <p className="mt-4 font-display text-xl font-black">No codes created yet</p>
            <p className="mt-2 text-sm text-muted">Create the first one to make it available at checkout.</p>
          </div>
        )}
      </section>

      <aside className="rounded-2xl border border-line bg-card p-6 shadow-card">
        <p className="font-mono text-xs font-bold uppercase tracking-[0.18em] text-violet">New discount</p>
        <h2 className="mt-2 font-display text-2xl font-black tracking-tight">Create a code</h2>
        <p className="mt-2 text-sm leading-5 text-muted">Codes are active immediately and can be deactivated at any time.</p>

        <form action={formAction} className="mt-6 grid gap-4">
          <label className="block">
            <span className="mb-2 block text-sm font-black">Code</span>
            <input
              name="code"
              required
              maxLength={32}
              autoCapitalize="characters"
              placeholder="VIP98"
              className={fieldClass}
            />
            <span className="mt-2 block text-xs leading-4 text-muted">3–32 letters, numbers, hyphens, or underscores.</span>
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-black">Percentage off</span>
            <div className="relative">
              <input
                name="percentage"
                type="number"
                min={1}
                max={99}
                step={1}
                required
                defaultValue={98}
                className={`${fieldClass} pr-10`}
              />
              <span className="pointer-events-none absolute inset-y-0 right-4 grid place-items-center font-black text-muted">%</span>
            </div>
            <span className="mt-2 block text-xs leading-4 text-muted">Up to 99% so every PayPal order has a positive total.</span>
          </label>

          {state ? (
            <p className={`text-sm font-bold ${state.ok ? "text-mint" : "text-coral-ink"}`}>
              {state.ok ? state.message : state.error}
            </p>
          ) : null}

          <button
            disabled={pending}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-ink px-5 py-3 text-sm font-black text-paper transition hover:-translate-y-0.5 hover:bg-violet disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Plus className="size-4" />
            {pending ? "Creating…" : "Create code"}
          </button>
        </form>
      </aside>
    </div>
  );
}
