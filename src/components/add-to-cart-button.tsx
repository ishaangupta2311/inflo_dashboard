"use client";

import { useRef, useState } from "react";
import { Check, Plus } from "lucide-react";
import { useCart } from "@/components/cart-context";

export function AddToCartButton({
  id,
  label = "Add to cart",
  className
}: {
  id: string;
  label?: string;
  className?: string;
}) {
  const { add, bump, count } = useCart();
  const [added, setAdded] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  return (
    <button
      type="button"
      onClick={() => {
        if (count === 0) {
          bump();
        }
        add(id);
        setAdded(true);
        if (timer.current) {
          clearTimeout(timer.current);
        }
        timer.current = setTimeout(() => setAdded(false), 1400);
      }}
      className={
        className ??
        "inline-flex w-full items-center justify-center gap-2 rounded-full bg-ink px-4 py-3 text-sm font-black text-paper transition hover:-translate-y-0.5 hover:bg-violet"
      }
    >
      {added ? (
        <>
          <Check className="size-4" />
          Added to cart
        </>
      ) : (
        <>
          <Plus className="size-4" />
          {label}
        </>
      )}
    </button>
  );
}
