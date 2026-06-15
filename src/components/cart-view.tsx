"use client";

import { useCallback, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight, Lock, Minus, Plus, ShoppingCart, Target, Trash2 } from "lucide-react";
import { checkoutAction } from "@/app/actions";
import { useCart, type CartItem } from "@/components/cart-context";
import { PaypalCheckout } from "@/components/paypal-checkout";
import { findBuyable, type Buyable } from "@/lib/catalog";
import { money } from "@/lib/orders";

// When a PayPal client id is configured, checkout requires payment before any
// order is created. Without it, the free "place order, pay later" flow stays.
const PAYPAL_CLIENT_ID = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID;

export function CartView() {
  const { items, subtotal, hasMonthly, hydrated, setQuantity, remove, clear } = useCart();
  const router = useRouter();
  const [brief, setBrief] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const paymentsOn = Boolean(PAYPAL_CLIENT_ID);

  const resolved = items
    .map((item) => ({ item, buyable: findBuyable(item.id) }))
    .filter((entry): entry is { item: CartItem; buyable: Buyable } => Boolean(entry.buyable));

  // Free fallback flow (no PayPal configured): create orders immediately.
  const checkout = () => {
    setError(null);
    startTransition(async () => {
      const result = await checkoutAction({ lines: items, brief: brief.trim() });
      if (result.ok) {
        clear();
        router.push("/orders?created=cart");
      } else {
        setError(result.error);
      }
    });
  };

  // Paid flow: invoked after PayPal has captured the payment and orders exist.
  const handlePaid = useCallback(() => {
    setError(null);
    clear();
    router.push("/orders?created=cart");
  }, [clear, router]);

  if (hydrated && resolved.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-line bg-card p-10 text-center shadow-card">
        <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-violet-soft text-violet">
          <ShoppingCart className="size-7" />
        </span>
        <p className="mt-4 font-display text-2xl font-black tracking-tight">Your cart is empty</p>
        <p className="mx-auto mt-2 max-w-md text-sm text-muted">
          Browse the service store and add packages or single placements to get started.
        </p>
        <Link
          href="/store"
          className="mt-5 inline-flex items-center gap-2 rounded-full bg-coral px-5 py-3 text-sm font-black text-white shadow-coral transition hover:-translate-y-0.5 hover:bg-coral-ink"
        >
          Browse the store
          <ArrowRight className="size-4" />
        </Link>
      </div>
    );
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
      <section className="rounded-2xl border border-line bg-card shadow-card">
        {resolved.map(({ item, buyable }) => (
          <div
            key={item.id}
            className="grid gap-4 border-b border-line p-5 last:border-b-0 sm:grid-cols-[1fr_auto] sm:items-center"
          >
            <div className="min-w-0">
              <p className="font-mono text-xs font-bold uppercase tracking-[0.14em] text-muted">
                {buyable.service.name}
              </p>
              <p className="mt-1 font-display text-xl font-black tracking-tight">{buyable.name}</p>
              <p className="mt-1 text-sm text-muted">
                {money(buyable.price)}
                {buyable.billing === "monthly" ? "/mo" : ""} · {buyable.description}
              </p>
            </div>

            <div className="flex items-center justify-between gap-4 sm:justify-end">
              <div className="inline-flex items-center rounded-full border border-line bg-paper">
                <button
                  type="button"
                  aria-label="Decrease quantity"
                  onClick={() => setQuantity(item.id, item.quantity - 1)}
                  className="grid size-9 place-items-center rounded-full text-muted transition hover:text-ink"
                >
                  <Minus className="size-4" />
                </button>
                <span className="min-w-8 text-center font-black">{item.quantity}</span>
                <button
                  type="button"
                  aria-label="Increase quantity"
                  onClick={() => setQuantity(item.id, item.quantity + 1)}
                  className="grid size-9 place-items-center rounded-full text-muted transition hover:text-ink"
                >
                  <Plus className="size-4" />
                </button>
              </div>

              <p className="w-24 text-right font-display text-xl font-black">
                {money(buyable.price * item.quantity)}
              </p>

              <button
                type="button"
                aria-label="Remove item"
                onClick={() => remove(item.id)}
                className="grid size-9 place-items-center rounded-full text-muted transition hover:bg-coral-soft hover:text-coral-ink"
              >
                <Trash2 className="size-4" />
              </button>
            </div>
          </div>
        ))}
      </section>

      <aside className="h-fit rounded-2xl border border-line bg-ink p-6 text-paper shadow-soft">
        <p className="font-mono text-xs font-bold uppercase tracking-[0.18em] text-lime">Checkout</p>
        <h2 className="mt-3 font-display text-3xl font-black tracking-tight">Order summary</h2>

        <div className="mt-5 flex items-center justify-between border-b border-white/10 pb-4">
          <span className="text-sm text-[#d9d5e2]">Subtotal</span>
          <span className="font-display text-2xl font-black">{money(subtotal)}</span>
        </div>
        {hasMonthly ? (
          <p className="mt-3 text-xs leading-5 text-[#bdb7c9]">
            {paymentsOn
              ? "You're paying the first month now. We'll invoice you for each following month."
              : "Monthly services bill each month after the first invoice."}
          </p>
        ) : null}

        <div className="mt-5 grid gap-4">
          <label className="block">
            <span className="mb-2 flex items-center gap-2 text-sm font-black">
              <Target className="size-4 text-lime" />
              Brief <span className="font-normal text-[#bdb7c9]">(optional)</span>
            </span>
            <textarea
              value={brief}
              onChange={(event) => setBrief(event.target.value)}
              className="min-h-24 w-full rounded-xl border border-white/15 bg-white/8 px-4 py-3 text-paper outline-none transition placeholder:text-[#9a93a8] focus:border-lime"
              placeholder="Anchors, target pages, restrictions, competitors…"
            />
          </label>
        </div>

        {error ? <p className="mt-4 rounded-xl bg-coral/20 px-4 py-3 text-sm font-bold text-white">{error}</p> : null}

        {paymentsOn ? (
          <>
            <PaypalCheckout
              clientId={PAYPAL_CLIENT_ID as string}
              lines={items}
              brief={brief.trim()}
              disabled={!hydrated || resolved.length === 0}
              onPaid={handlePaid}
              onError={setError}
            />
            <p className="mt-3 flex items-center justify-center gap-1.5 text-center text-xs text-[#bdb7c9]">
              <Lock className="size-3.5 text-lime" />
              Secure payment via PayPal. Your order starts the moment payment clears.
            </p>
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={checkout}
              disabled={pending || !hydrated}
              className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-full bg-lime px-5 py-4 text-sm font-black text-lime-ink transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {pending ? "Placing order…" : "Place order"}
              {pending ? null : <ArrowRight className="size-4" />}
            </button>
            <p className="mt-3 text-center text-xs text-[#bdb7c9]">
              No card required yet — payment is added later. This creates live orders the team starts on.
            </p>
          </>
        )}
      </aside>
    </div>
  );
}
