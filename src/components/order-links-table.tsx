"use client";

import { useState, useTransition } from "react";
import { Check, ExternalLink, Save } from "lucide-react";
import { updateOrderLinksClientAction } from "@/app/actions";
import { updateOrderLinksAdminAction } from "@/app/admin/actions";
import type { OrderLinkEntry } from "@/lib/order-backend";

type Variant = "client" | "admin";

const inputClass =
  "w-full min-w-36 rounded-lg border border-line bg-paper px-2.5 py-1.5 text-sm outline-none transition focus:border-violet focus:ring-2 focus:ring-violet/15";

const headClass = "px-3 py-2 text-left font-mono text-xs font-bold uppercase tracking-[0.12em] text-muted";
const cellClass = "px-3 py-3 align-top text-sm";

function ReadOnlyCell({ value }: { value: string }) {
  return value.trim() ? (
    <span className="text-ink">{value}</span>
  ) : (
    <span className="text-muted">—</span>
  );
}

// Ensure a user-entered URL is absolute so it opens the external site rather than
// resolving as an in-app relative path (e.g. "youtube.com" → "https://youtube.com").
function toExternalHref(url: string): string {
  const trimmed = url.trim();
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

function PublishCell({ value }: { value: string }) {
  return value.trim() ? (
    <a
      href={toExternalHref(value)}
      target="_blank"
      rel="noreferrer noopener"
      className="inline-flex items-center gap-1 break-all font-bold text-violet hover:text-violet-ink"
    >
      Live link
      <ExternalLink className="size-3.5 shrink-0" />
    </a>
  ) : (
    <span className="text-muted">Pending</span>
  );
}

export function OrderLinksTable({
  orderId,
  links,
  variant,
  kind = "links"
}: {
  orderId: string;
  links: OrderLinkEntry[];
  variant: Variant;
  kind?: "links" | "mentions";
}) {
  const [rows, setRows] = useState<OrderLinkEntry[]>(links);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const isStaffView = variant === "admin";
  // Brand-mention orders reuse this table; only the client-provided column and
  // a couple of labels change ("Anchor text" → "Mention text").
  const isMentions = kind === "mentions";
  const anchorLabel = isMentions ? "Mention text" : "Anchor text";
  const anchorPlaceholder = isMentions ? "Add mention text" : "Add anchor text";

  const update = (id: string, patch: Partial<OrderLinkEntry>) => {
    setSaved(false);
    setError(null);
    setRows((prev) => prev.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  };

  const save = () => {
    setError(null);
    startTransition(async () => {
      const result = isStaffView
        ? await updateOrderLinksAdminAction({
            orderId,
            links: rows.map((r) => ({
              id: r.id,
              anchorText: r.anchorText,
              landingPage: r.landingPage,
              prospectUrl: r.prospectUrl,
              deliveredDr: r.deliveredDr,
              traffic: r.traffic,
              publishUrl: r.publishUrl
            }))
          })
        : await updateOrderLinksClientAction({
            orderId,
            links: rows.map((r) => ({ id: r.id, anchorText: r.anchorText, landingPage: r.landingPage }))
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
              <th className={headClass}>DR ordered</th>
              <th className={headClass}>{anchorLabel}</th>
              <th className={headClass}>Landing page</th>
              <th className={headClass}>Prospect URL</th>
              <th className={headClass}>DR delivering</th>
              <th className={headClass}>Traffic</th>
              <th className={headClass}>Publish link</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const delivered = row.publishUrl.trim() !== "";
              return (
                <tr key={row.id} className="border-b border-line last:border-b-0">
                  <td className={`${cellClass} whitespace-nowrap font-black`}>
                    <span className="inline-flex items-center gap-1.5">
                      {row.position}
                      {delivered ? (
                        <span
                          className="grid size-4 place-items-center rounded-full bg-mint text-white"
                          title="Delivered"
                        >
                          <Check className="size-2.5" />
                        </span>
                      ) : null}
                    </span>
                  </td>
                  <td className={`${cellClass} whitespace-nowrap`}>
                    <span className="rounded-full bg-violet-soft px-2.5 py-1 text-xs font-black text-violet-ink">
                      {row.orderedDr}
                    </span>
                  </td>

                  {/* Anchor / mention text — editable by the client and by staff */}
                  <td className={cellClass}>
                    <input
                      value={row.anchorText}
                      onChange={(e) => update(row.id, { anchorText: e.target.value })}
                      placeholder={anchorPlaceholder}
                      className={inputClass}
                    />
                  </td>

                  {/* Landing page — editable by the client and by staff */}
                  <td className={cellClass}>
                    <input
                      value={row.landingPage}
                      onChange={(e) => update(row.id, { landingPage: e.target.value })}
                      placeholder="https://your-site.com/page"
                      className={inputClass}
                    />
                  </td>

                  {/* Prospect URL — admin-editable */}
                  <td className={cellClass}>
                    {isStaffView ? (
                      <input
                        value={row.prospectUrl}
                        onChange={(e) => update(row.id, { prospectUrl: e.target.value })}
                        placeholder="Target site"
                        className={inputClass}
                      />
                    ) : (
                      <ReadOnlyCell value={row.prospectUrl} />
                    )}
                  </td>

                  {/* DR delivering — admin-editable */}
                  <td className={cellClass}>
                    {isStaffView ? (
                      <input
                        value={row.deliveredDr}
                        onChange={(e) => update(row.id, { deliveredDr: e.target.value })}
                        placeholder="DR 55"
                        className={`${inputClass} min-w-20`}
                      />
                    ) : (
                      <ReadOnlyCell value={row.deliveredDr} />
                    )}
                  </td>

                  {/* Traffic — admin-editable */}
                  <td className={cellClass}>
                    {isStaffView ? (
                      <input
                        value={row.traffic}
                        onChange={(e) => update(row.id, { traffic: e.target.value })}
                        placeholder="12k/mo"
                        className={`${inputClass} min-w-24`}
                      />
                    ) : (
                      <ReadOnlyCell value={row.traffic} />
                    )}
                  </td>

                  {/* Publish link — admin-editable, client read-only */}
                  <td className={cellClass}>
                    {isStaffView ? (
                      <input
                        value={row.publishUrl}
                        onChange={(e) => update(row.id, { publishUrl: e.target.value })}
                        placeholder="https://published-post.com"
                        className={inputClass}
                      />
                    ) : (
                      <PublishCell value={row.publishUrl} />
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
          {pending
            ? "Saving…"
            : saved
              ? "Saved"
              : isStaffView
                ? isMentions
                  ? "Save mentions"
                  : "Save links"
                : "Save changes"}
        </button>
        {isStaffView ? (
          <p className="text-sm text-muted">Adding a publish link marks that placement delivered.</p>
        ) : (
          <p className="text-sm text-muted">
            Set {isMentions ? "mention text" : "anchor text"} and landing page for each placement.
          </p>
        )}
        {error ? (
          <p className="rounded-lg bg-coral-soft px-3 py-1.5 text-sm font-bold text-coral-ink">{error}</p>
        ) : null}
      </div>
    </div>
  );
}
