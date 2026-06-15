"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { findBuyable } from "@/lib/catalog";

export type CartItem = { id: string; quantity: number };

type CartContextValue = {
  items: CartItem[];
  count: number;
  subtotal: number;
  hasMonthly: boolean;
  hydrated: boolean;
  pulseToken: number;
  add: (id: string, quantity?: number) => void;
  bump: () => void;
  setQuantity: (id: string, quantity: number) => void;
  remove: (id: string) => void;
  clear: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);
const STORAGE_KEY = "inflo.cart.v1";

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [hydrated, setHydrated] = useState(false);
  // Bumped only on an empty→first-item transition so the cart icon can draw the
  // eye. Resets to 0 on reload, so it never fires on hydration — only real adds.
  const [pulseToken, setPulseToken] = useState(0);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as CartItem[];
        if (Array.isArray(parsed)) {
          setItems(
            parsed
              .filter((item) => item && typeof item.id === "string" && Boolean(findBuyable(item.id)))
              .map((item) => ({ id: item.id, quantity: Math.max(1, Math.min(99, Math.round(item.quantity) || 1)) }))
          );
        }
      }
    } catch {
      // ignore malformed storage
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) {
      return;
    }
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      // ignore write failures (private mode, quota)
    }
  }, [items, hydrated]);

  const add = useCallback((id: string, quantity = 1) => {
    if (!findBuyable(id)) {
      return;
    }
    setItems((prev) => {
      const existing = prev.find((item) => item.id === id);
      if (existing) {
        return prev.map((item) =>
          item.id === id ? { ...item, quantity: Math.min(99, item.quantity + quantity) } : item
        );
      }
      return [...prev, { id, quantity: Math.max(1, Math.min(99, quantity)) }];
    });
  }, []);

  const setQuantity = useCallback((id: string, quantity: number) => {
    setItems((prev) =>
      quantity <= 0
        ? prev.filter((item) => item.id !== id)
        : prev.map((item) => (item.id === id ? { ...item, quantity: Math.min(99, Math.round(quantity)) } : item))
    );
  }, []);

  const remove = useCallback((id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const clear = useCallback(() => setItems([]), []);

  const bump = useCallback(() => setPulseToken((token) => token + 1), []);

  const { count, subtotal, hasMonthly } = useMemo(() => {
    let nextCount = 0;
    let nextSubtotal = 0;
    let monthly = false;
    for (const item of items) {
      const buyable = findBuyable(item.id);
      if (!buyable) {
        continue;
      }
      nextCount += item.quantity;
      nextSubtotal += buyable.price * item.quantity;
      if (buyable.billing === "monthly") {
        monthly = true;
      }
    }
    return { count: nextCount, subtotal: nextSubtotal, hasMonthly: monthly };
  }, [items]);

  const value: CartContextValue = {
    items,
    count,
    subtotal,
    hasMonthly,
    hydrated,
    pulseToken,
    add,
    bump,
    setQuantity,
    remove,
    clear
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return ctx;
}
