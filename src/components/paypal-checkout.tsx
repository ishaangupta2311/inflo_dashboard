"use client";

import { useEffect, useRef, useState } from "react";
import type { CartLine } from "@/lib/order-backend";

// Minimal shape of the slice of the PayPal JS SDK we use.
type PaypalButtons = {
  Buttons: (options: Record<string, unknown>) => {
    render: (el: HTMLElement) => Promise<void>;
    close?: () => void;
  };
};

declare global {
  interface Window {
    paypal?: PaypalButtons;
  }
}

const SDK_ID = "paypal-sdk";

// Inject the PayPal JS SDK once (idempotent across mounts / re-renders).
function loadSdk(clientId: string): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.paypal) return Promise.resolve();

  const existing = document.getElementById(SDK_ID) as HTMLScriptElement | null;
  if (existing) {
    return new Promise((resolve, reject) => {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("PayPal SDK failed to load.")));
    });
  }

  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.id = SDK_ID;
    script.src = `https://www.paypal.com/sdk/js?client-id=${encodeURIComponent(
      clientId
    )}&currency=USD&intent=capture&components=buttons`;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("PayPal SDK failed to load."));
    document.body.appendChild(script);
  });
}

export function PaypalCheckout({
  clientId,
  lines,
  brief,
  discountCode,
  disabled,
  onPaid,
  onError
}: {
  clientId: string;
  lines: CartLine[];
  brief: string;
  discountCode?: string;
  disabled?: boolean;
  onPaid: (count: number) => void;
  onError: (message: string) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  // Keep the freshest cart + callbacks in refs so the (render-once) button
  // callbacks always read current values without re-rendering the buttons.
  const dataRef = useRef({ lines, brief, discountCode, disabled });
  const cbRef = useRef({ onPaid, onError });

  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);

  // Sync refs after each render (writing them during render is disallowed).
  useEffect(() => {
    dataRef.current = { lines, brief, discountCode, disabled };
    cbRef.current = { onPaid, onError };
  });

  useEffect(() => {
    let cancelled = false;
    loadSdk(clientId)
      .then(() => !cancelled && setReady(true))
      .catch(() => !cancelled && setFailed(true));
    return () => {
      cancelled = true;
    };
  }, [clientId]);

  useEffect(() => {
    if (!ready || !containerRef.current || !window.paypal) return;
    const container = containerRef.current;

    const buttons = window.paypal.Buttons({
      style: { layout: "vertical", color: "gold", shape: "pill", label: "paypal", height: 48 },
      createOrder: async () => {
        if (dataRef.current.disabled) {
          throw new Error("Apply the discount code before checking out.");
        }
        const res = await fetch("/api/paypal/create-order", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            lines: dataRef.current.lines,
            brief: dataRef.current.brief,
            discountCode: dataRef.current.discountCode
          })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Could not start checkout.");
        return data.id as string;
      },
      onApprove: async (approval: { orderID: string }) => {
        const res = await fetch("/api/paypal/capture", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ paypalOrderId: approval.orderID })
        });
        const data = await res.json();
        if (!res.ok) {
          cbRef.current.onError(data.error || "Payment could not be completed.");
          return;
        }
        cbRef.current.onPaid(data.count ?? 0);
      },
      onCancel: () => {
        // User backed out of the PayPal window — nothing to do, no error.
      },
      onError: (err: unknown) => {
        console.error("[paypal] button error:", err);
        cbRef.current.onError("Something went wrong with PayPal. Please try again.");
      }
    });

    buttons.render(container).catch(() => setFailed(true));

    return () => {
      try {
        buttons.close?.();
      } catch {
        // ignore — container is being torn down anyway
      }
      container.innerHTML = "";
    };
  }, [ready]);

  if (failed) {
    return (
      <p className="mt-5 rounded-xl bg-coral/20 px-4 py-3 text-sm font-bold text-white">
        Couldn&apos;t load PayPal. Check your connection and refresh.
      </p>
    );
  }

  return (
    <div className="mt-5">
      {!ready ? (
        <div className="grid h-12 w-full place-items-center rounded-full bg-white/10 text-sm font-bold text-[#bdb7c9]">
          Loading payment…
        </div>
      ) : null}
      <div
        ref={containerRef}
        className={disabled ? "pointer-events-none opacity-50" : undefined}
        aria-busy={disabled}
      />
    </div>
  );
}
