"use client";

import Link from "next/link";
import { ShoppingCart } from "lucide-react";
import { useCart } from "@/components/cart-context";

export function CartButton() {
  const { count, hydrated, pulseToken } = useCart();
  const showBadge = hydrated && count > 0;
  const pulsing = pulseToken > 0;

  return (
    <Link
      href="/cart"
      aria-label={`Cart${showBadge ? ` (${count} item${count === 1 ? "" : "s"})` : ""}`}
      className="relative grid size-11 place-items-center rounded-xl border border-line bg-card text-muted transition hover:border-ink hover:text-ink"
    >
      {pulsing ? (
        <span
          key={`ping-${pulseToken}`}
          aria-hidden
          className="cart-ping-once pointer-events-none absolute inset-0 rounded-xl border-2 border-coral"
        />
      ) : null}
      {/* Keyed by pulseToken so each empty→first-item add remounts and replays the pop. */}
      <span key={`pop-${pulseToken}`} className={`grid place-items-center ${pulsing ? "cart-pop text-coral" : ""}`}>
        <ShoppingCart className="size-5" />
      </span>
      {showBadge ? (
        <span className="absolute -right-1 -top-1 grid min-w-5 place-items-center rounded-full bg-coral px-1 text-xs font-black text-white">
          {count}
        </span>
      ) : null}
    </Link>
  );
}
