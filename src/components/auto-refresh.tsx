"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// Polls the current route on an interval (while the tab is visible) so server
// data — order status, delivered count, link details, and the updates timeline —
// appears without a manual reload. router.refresh() re-runs the server
// components and flows fresh props into client components without remounting them.
export function AutoRefresh({ intervalMs = 8000 }: { intervalMs?: number }) {
  const router = useRouter();

  useEffect(() => {
    const tick = () => {
      if (document.visibilityState === "visible") {
        router.refresh();
      }
    };
    const id = window.setInterval(tick, intervalMs);
    // Refresh immediately when the tab regains focus.
    const onVisible = () => {
      if (document.visibilityState === "visible") {
        router.refresh();
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [router, intervalMs]);

  return null;
}
