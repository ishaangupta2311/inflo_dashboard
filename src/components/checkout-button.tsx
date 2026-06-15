"use client";

import Link from "next/link";
import { ArrowRight, ShoppingCart } from "lucide-react";
import { useCart } from "@/components/cart-context";
import { money } from "@/lib/orders";

export function CheckoutButton() {
  const { count, subtotal, hydrated } = useCart();
  const hasItems = hydrated && count > 0;

  if (!hasItems) {
    return (
      <p className="rounded-full border border-dashed border-line bg-card px-6 py-4 text-center text-sm font-bold text-muted">
        Your cart is empty — add a package to get started.
      </p>
    );
  }

  return (
    <Link
      href="/cart"
      className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-coral px-6 py-4 text-sm font-black text-white shadow-coral transition hover:-translate-y-0.5 hover:bg-coral-ink sm:w-auto"
    >
      <ShoppingCart className="size-4" />
      Checkout · {count} item{count === 1 ? "" : "s"} · {money(subtotal)}
      <ArrowRight className="size-4" />
    </Link>
  );
}
