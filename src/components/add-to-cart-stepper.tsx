"use client";

import { Minus, Plus } from "lucide-react";
import { useCart } from "@/components/cart-context";

export function AddToCartStepper({ id }: { id: string }) {
  const { items, add, setQuantity, bump, count } = useCart();
  const quantity = items.find((item) => item.id === id)?.quantity ?? 0;

  if (quantity === 0) {
    return (
      <button
        type="button"
        onClick={() => {
          if (count === 0) {
            bump();
          }
          add(id);
        }}
        className="inline-flex items-center justify-center gap-2 rounded-full border border-ink px-4 py-2 text-sm font-black text-ink transition hover:bg-ink hover:text-paper"
      >
        <Plus className="size-4" />
        Add to cart
      </button>
    );
  }

  return (
    <div className="inline-flex items-center rounded-full border border-ink bg-paper">
      <button
        type="button"
        aria-label="Decrease quantity"
        onClick={() => setQuantity(id, quantity - 1)}
        className="grid size-9 place-items-center rounded-full text-ink transition hover:bg-ink hover:text-paper"
      >
        <Minus className="size-4" />
      </button>
      <span className="min-w-8 text-center text-sm font-black tabular-nums">{quantity}</span>
      <button
        type="button"
        aria-label="Increase quantity"
        onClick={() => add(id)}
        className="grid size-9 place-items-center rounded-full text-ink transition hover:bg-ink hover:text-paper"
      >
        <Plus className="size-4" />
      </button>
    </div>
  );
}
