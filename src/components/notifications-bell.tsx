"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";
import type { NotificationItem } from "@/lib/order-backend";

const STORAGE_KEY = "inflo.notifications.lastSeen.v1";

export function NotificationsBell({ updates }: { updates: NotificationItem[] }) {
  const [open, setOpen] = useState(false);
  const [lastSeen, setLastSeen] = useState(0);
  const [mounted, setMounted] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    setLastSeen(raw ? Number(raw) || 0 : 0);
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) {
      return;
    }
    const onClick = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  const unseen = mounted ? updates.filter((u) => Date.parse(u.createdAtISO) > lastSeen).length : 0;

  const toggle = () => {
    const next = !open;
    setOpen(next);
    if (next && updates.length > 0) {
      const newest = Math.max(...updates.map((u) => Date.parse(u.createdAtISO)));
      setLastSeen(newest);
      try {
        window.localStorage.setItem(STORAGE_KEY, String(newest));
      } catch {
        // ignore write failures (private mode / quota)
      }
    }
  };

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={toggle}
        aria-label={unseen > 0 ? `Notifications (${unseen} new)` : "Notifications"}
        className="relative grid size-11 place-items-center rounded-xl border border-line bg-card text-muted transition hover:border-ink hover:text-ink"
      >
        <Bell className="size-5" />
        {unseen > 0 ? (
          <span className="absolute -right-1 -top-1 grid min-w-5 place-items-center rounded-full bg-coral px-1 text-xs font-black text-white">
            {unseen}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="absolute right-0 z-30 mt-2 w-80 overflow-hidden rounded-2xl border border-line bg-card shadow-soft">
          <div className="border-b border-line px-4 py-3">
            <p className="font-display text-lg font-black tracking-tight">Updates</p>
          </div>
          <div className="max-h-96 overflow-y-auto">
            {updates.length > 0 ? (
              updates.map((u) => (
                <Link
                  key={u.id}
                  href={`/orders/${u.orderId}`}
                  onClick={() => setOpen(false)}
                  className="block border-b border-line px-4 py-3 transition last:border-b-0 hover:bg-paper"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-black">{u.service}</p>
                    <p className="shrink-0 font-mono text-[11px] text-muted">{u.createdAtLabel}</p>
                  </div>
                  <p className="mt-1 line-clamp-2 text-sm text-muted">{u.body}</p>
                </Link>
              ))
            ) : (
              <p className="px-4 py-8 text-center text-sm text-muted">No updates yet.</p>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
