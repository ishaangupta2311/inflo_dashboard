"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowser } from "@/lib/supabase-browser";

// Keeps an open order page in sync with a counterpart's edits. Prefers an
// instant Supabase Realtime push (a content-free "changed" ping → re-fetch);
// falls back to polling when Realtime isn't configured. A slow backstop poll
// and a focus refresh guard against any missed ping.
export function OrderRealtime({ orderId }: { orderId: string }) {
  const router = useRouter();

  useEffect(() => {
    const supabase = getSupabaseBrowser();

    const refresh = () => {
      if (document.visibilityState === "visible") {
        router.refresh();
      }
    };

    document.addEventListener("visibilitychange", refresh);

    const channel = supabase
      ?.channel(`order-${orderId}`)
      .on("broadcast", { event: "changed" }, () => router.refresh())
      .subscribe();

    // Backstop: infrequent when realtime is active, faster when polling is the
    // only mechanism.
    const pollMs = supabase ? 30000 : 8000;
    const intervalId = window.setInterval(refresh, pollMs);

    return () => {
      document.removeEventListener("visibilitychange", refresh);
      window.clearInterval(intervalId);
      if (channel) {
        supabase?.removeChannel(channel);
      }
    };
  }, [router, orderId]);

  return null;
}
