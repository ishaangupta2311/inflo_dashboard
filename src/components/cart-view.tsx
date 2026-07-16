"use client";

import { useCallback, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight, BadgePercent, Lock, Minus, Plus, ShoppingCart, Target, Trash2 } from "lucide-react";
import { checkoutAction } from "@/app/actions";
import { useCart, type CartItem } from "@/components/cart-context";
import { PaypalCheckout } from "@/components/paypal-checkout";
import { findBuyable, type Buyable } from "@/lib/catalog";
import { money } from "@/lib/orders";

// When a PayPal client id is configured, checkout requires payment before any
// order is created. Without it, the free "place order, pay later" flow stays.
const PAYPAL_CLIENT_ID = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID;

type DiscountPreview = {
  code: string;
  percentage: number;
  amount: number;
  cartSignature: string;
};

export function CartView() {
  const { items, subtotal, hasMonthly, hydrated, setQuantity, remove, clear } = useCart();
  const router = useRouter();
  const [brief, setBrief] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [discountCode, setDiscountCode] = useState("");
  const [discount, setDiscount] = useState<DiscountPreview | null>(null);
  const [discountError, setDiscountError] = useState<string | null>(null);
  const [applyingDiscount, setApplyingDiscount] = useState(false);
  const discountRequestRef = useRef(0);
  const [pending, startTransition] = useTransition();
  const paymentsOn = Boolean(PAYPAL_CLIENT_ID);

  const resolved = items
    .map((item) => ({ item, buyable: findBuyable(item.id) }))
    .filter((entry): entry is { item: CartItem; buyable: Buyable } => Boolean(entry.buyable));
  const cartSignature = items.map((item) => `${item.id}:${item.quantity}`).join("|");
  const normalizedInputCode = discountCode.trim().toUpperCase();
  const currentDiscount =
    discount?.cartSignature === cartSignature && discount.code === normalizedInputCode ? discount : null;
  const discountNeedsApplying = Boolean(normalizedInputCode) && !currentDiscount;
  const checkoutDisabled = !hydrated || resolved.length === 0 || discountNeedsApplying;
  const total = currentDiscount ? currentDiscount.amount : subtotal;
  const savings = currentDiscount ? subtotal - currentDiscount.amount : 0;

  // Any cart/code edit invalidates an outstanding validation response. Without
  // this, a slow response could reapply a code for an older cart.
  const invalidateDiscountRequest = () => {
    discountRequestRef.current += 1;
    setApplyingDiscount(false);
  };

  const applyDiscount = async () => {
    if (!normalizedInputCode) {
      setDiscount(null);
      setDiscountError("Enter a discount code first.");
      return;
    }

    const requestId = ++discountRequestRef.current;
    const requestedCode = normalizedInputCode;
    const requestedSignature = cartSignature;
    setApplyingDiscount(true);
    setDiscountError(null);
    try {
      const res = await fetch("/api/discounts/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lines: items, discountCode: requestedCode })
      });
      const data = (await res.json()) as {
        amount?: number;
        discount?: { code: string; percentage: number };
        error?: string;
      };
      if (!res.ok || !data.discount || typeof data.amount !== "number") {
        throw new Error(data.error || "Could not apply discount code.");
      }
      if (discountRequestRef.current !== requestId) return;
      setDiscountCode(data.discount.code);
      setDiscount({ ...data.discount, amount: data.amount, cartSignature: requestedSignature });
    } catch (applyError) {
      if (discountRequestRef.current !== requestId) return;
      setDiscount(null);
      setDiscountError(applyError instanceof Error ? applyError.message : "Could not apply discount code.");
    } finally {
      if (discountRequestRef.current === requestId) setApplyingDiscount(false);
    }
  };

  // Free fallback flow (no PayPal configured): create orders immediately.
  const checkout = () => {
    setError(null);
    startTransition(async () => {
      const result = await checkoutAction({
        lines: items,
        brief: brief.trim(),
        discountCode: currentDiscount?.code
      });
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
                  onClick={() => {
                    invalidateDiscountRequest();
                    setQuantity(item.id, item.quantity - 1);
                  }}
                  className="grid size-9 place-items-center rounded-full text-muted transition hover:text-ink"
                >
                  <Minus className="size-4" />
                </button>
                <span className="min-w-8 text-center font-black">{item.quantity}</span>
                <button
                  type="button"
                  aria-label="Increase quantity"
                  onClick={() => {
                    invalidateDiscountRequest();
                    setQuantity(item.id, item.quantity + 1);
                  }}
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
                onClick={() => {
                  invalidateDiscountRequest();
                  remove(item.id);
                }}
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
        {currentDiscount ? (
          <>
            <div className="flex items-center justify-between border-b border-white/10 py-4">
              <span className="flex items-center gap-2 text-sm font-bold text-lime">
                <BadgePercent className="size-4" />
                {currentDiscount.code} · {currentDiscount.percentage}% off
              </span>
              <span className="font-black text-lime">−{money(savings)}</span>
            </div>
            <div className="flex items-center justify-between pt-4">
              <span className="text-sm font-black text-[#d9d5e2]">Total today</span>
              <span className="font-display text-3xl font-black text-lime">{money(total)}</span>
            </div>
          </>
        ) : null}
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
              <BadgePercent className="size-4 text-lime" />
              Discount code <span className="font-normal text-[#bdb7c9]">(optional)</span>
            </span>
            <div className="flex gap-2">
              <input
                value={discountCode}
                onChange={(event) => {
                  invalidateDiscountRequest();
                  setDiscountCode(event.target.value.toUpperCase());
                  setDiscountError(null);
                }}
                maxLength={32}
                autoCapitalize="characters"
                placeholder="Enter code"
                className="min-w-0 flex-1 rounded-xl border border-white/15 bg-white/8 px-4 py-3 font-mono text-sm font-bold tracking-[0.12em] text-paper outline-none transition placeholder:font-sans placeholder:font-normal placeholder:tracking-normal placeholder:text-[#9a93a8] focus:border-lime"
              />
              <button
                type="button"
                onClick={applyDiscount}
                disabled={applyingDiscount || !hydrated}
                className="rounded-xl bg-white/12 px-4 text-sm font-black text-paper transition hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {applyingDiscount ? "Checking…" : "Apply"}
              </button>
            </div>
            {discountError ? <span className="mt-2 block text-xs font-bold text-[#ffb4a6]">{discountError}</span> : null}
            {discountNeedsApplying && !discountError ? (
              <span className="mt-2 block text-xs text-[#bdb7c9]">Apply this code to update the total before checkout.</span>
            ) : null}
          </label>

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
              discountCode={currentDiscount?.code}
              disabled={checkoutDisabled}
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
              disabled={pending || checkoutDisabled}
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
