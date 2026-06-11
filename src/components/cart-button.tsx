"use client";

import Link from "next/link";
import { ShoppingCart } from "lucide-react";
import { useCart } from "@/components/cart-context";

export function CartButton() {
  const { count, hydrated } = useCart();
  const showBadge = hydrated && count > 0;

  return (
    <Link
      href="/cart"
      aria-label={`Cart${showBadge ? ` (${count} item${count === 1 ? "" : "s"})` : ""}`}
      className="relative grid size-11 place-items-center rounded-xl border border-line bg-card text-muted transition hover:border-ink hover:text-ink"
    >
      <ShoppingCart className="size-5" />
      {showBadge ? (
        <span className="absolute -right-1 -top-1 grid min-w-5 place-items-center rounded-full bg-coral px-1 text-xs font-black text-white">
          {count}
        </span>
      ) : null}
    </Link>
  );
}
