"use client";

import { useState, useTransition } from "react";
import { Check, ExternalLink, Save } from "lucide-react";
import { updateOrderPrItemsClientAction } from "@/app/actions";
import { updateOrderPrItemsAdminAction } from "@/app/admin/actions";
import type { OrderPrItemEntry } from "@/lib/order-backend";

type Variant = "client" | "admin";

const inputClass =
  "w-full min-w-36 rounded-lg border border-line bg-paper px-2.5 py-1.5 text-sm outline-none transition focus:border-violet focus:ring-2 focus:ring-violet/15";

const headClass = "px-3 py-2 text-left font-mono text-xs font-bold uppercase tracking-[0.12em] text-muted";
const cellClass = "px-3 py-3 align-top text-sm";

// Ensure a user-entered URL is absolute so it opens the external site rather than
// resolving as an in-app relative path (e.g. "drive.google.com" → "https://…").
function toExternalHref(url: string): string {
  const trimmed = url.trim();
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

// Format a YYYY-MM-DD value as e.g. "Jun 15, 2026"; show anything else verbatim.
function formatPrDate(value: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!match) {
    return value.trim();
  }
  const [, y, m, d] = match;
  const date = new Date(Number(y), Number(m) - 1, Number(d));
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(date);
}

function LinkCell({ value, label }: { value: string; label: string }) {
  return value.trim() ? (
    <a
      href={toExternalHref(value)}
      target="_blank"
      rel="noreferrer noopener"
      className="inline-flex items-center gap-1 break-all font-bold text-violet hover:text-violet-ink"
    >
      {label}
      <ExternalLink className="size-3.5 shrink-0" />
    </a>
  ) : (
    <span className="text-muted">Pending</span>
  );
}

export function OrderPrTable({
  orderId,
  items,
  variant
}: {
  orderId: string;
  items: OrderPrItemEntry[];
  variant: Variant;
}) {
  const [rows, setRows] = useState<OrderPrItemEntry[]>(items);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const isStaffView = variant === "admin";

  const update = (id: string, patch: Partial<OrderPrItemEntry>) => {
    setSaved(false);
    setError(null);
    setRows((prev) => prev.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  };

  const save = () => {
    setError(null);
    startTransition(async () => {
      const result = isStaffView
        ? await updateOrderPrItemsAdminAction({
            orderId,
            items: rows.map((r) => ({
              id: r.id,
              title: r.title,
              docUrl: r.docUrl,
              publishDate: r.publishDate,
              excelUrl: r.excelUrl
            }))
          })
        : await updateOrderPrItemsClientAction({
            orderId,
            items: rows.map((r) => ({ id: r.id, title: r.title, docUrl: r.docUrl }))
          });

      if (result.ok) {
        setSaved(true);
      } else {
        setError(result.error);
      }
    });
  };

  return (
    <div>
      <div className="overflow-x-auto rounded-2xl border border-line bg-card shadow-card">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-line bg-paper">
              <th className={headClass}>#</th>
              <th className={headClass}>Title</th>
              <th className={headClass}>PR doclink</th>
              <th className={headClass}>Publish date</th>
              <th className={headClass}>Publish excel link</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const delivered = row.publishDate.trim() !== "";
              return (
                <tr key={row.id} className="border-b border-line last:border-b-0">
                  <td className={`${cellClass} whitespace-nowrap font-black`}>
                    <span className="inline-flex items-center gap-1.5">
                      {row.position}
                      {delivered ? (
                        <span
                          className="grid size-4 place-items-center rounded-full bg-mint text-white"
                          title="Published"
                        >
                          <Check className="size-2.5" />
                        </span>
                      ) : null}
                    </span>
                  </td>

                  {/* Title — editable by the client and by staff */}
                  <td className={cellClass}>
                    <input
                      value={row.title}
                      onChange={(e) => update(row.id, { title: e.target.value })}
                      placeholder="Feature title"
                      className={inputClass}
                    />
                  </td>

                  {/* PR doclink — editable by the client and by staff */}
                  <td className={cellClass}>
                    <input
                      value={row.docUrl}
                      onChange={(e) => update(row.id, { docUrl: e.target.value })}
                      placeholder="https://docs.google.com/…"
                      className={inputClass}
                    />
                  </td>

                  {/* Publish date — admin-editable; client sees a formatted date */}
                  <td className={cellClass}>
                    {isStaffView ? (
                      <input
                        type="date"
                        value={row.publishDate}
                        onChange={(e) => update(row.id, { publishDate: e.target.value })}
                        className={`${inputClass} min-w-44`}
                      />
                    ) : delivered ? (
                      <span className="text-ink">{formatPrDate(row.publishDate)}</span>
                    ) : (
                      <span className="text-muted">Pending</span>
                    )}
                  </td>

                  {/* Publish excel link — admin-editable; client sees a link */}
                  <td className={cellClass}>
                    {isStaffView ? (
                      <input
                        value={row.excelUrl}
                        onChange={(e) => update(row.id, { excelUrl: e.target.value })}
                        placeholder="Drive / .xlsx / download link"
                        className={inputClass}
                      />
                    ) : (
                      <LinkCell value={row.excelUrl} label="Open report" />
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={save}
          disabled={pending}
          className="inline-flex items-center justify-center gap-2 rounded-full bg-ink px-5 py-2.5 text-sm font-black text-paper transition hover:-translate-y-0.5 hover:bg-violet disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saved && !pending ? <Check className="size-4" /> : <Save className="size-4" />}
          {pending ? "Saving…" : saved ? "Saved" : isStaffView ? "Save features" : "Save changes"}
        </button>
        {isStaffView ? (
          <p className="text-sm text-muted">Setting a publish date marks that feature published.</p>
        ) : (
          <p className="text-sm text-muted">Set the title and PR doc for each feature.</p>
        )}
        {error ? (
          <p className="rounded-lg bg-coral-soft px-3 py-1.5 text-sm font-bold text-coral-ink">{error}</p>
        ) : null}
      </div>
    </div>
  );
}
