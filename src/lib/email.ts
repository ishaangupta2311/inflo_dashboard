import { Resend } from "resend";

// Transactional email via Resend. Everything is gated behind RESEND_API_KEY:
// with no key the senders no-op (logging in dev) so the app builds and runs
// before email is configured. Every send is wrapped so it can never throw into
// the order action that triggered it.

const apiKey = process.env.RESEND_API_KEY;
const FROM = process.env.EMAIL_FROM || "Influencer Outreach <onboarding@resend.dev>";
const APP_URL = (process.env.APP_URL || "http://localhost:3001").replace(/\/+$/, "");

const resend = apiKey ? new Resend(apiKey) : null;

type Attachment = { filename: string; content: Uint8Array };

async function sendEmail(opts: {
  to?: string | null;
  subject: string;
  html: string;
  attachments?: Attachment[];
}): Promise<void> {
  if (!opts.to) {
    return;
  }
  if (!resend) {
    console.info(`[email] RESEND_API_KEY unset — skipping "${opts.subject}" → ${opts.to}`);
    return;
  }
  try {
    await resend.emails.send({
      from: FROM,
      to: opts.to,
      subject: opts.subject,
      html: opts.html,
      attachments: opts.attachments?.map((a) => ({ filename: a.filename, content: Buffer.from(a.content) }))
    });
  } catch (err) {
    console.error(`[email] failed to send "${opts.subject}" → ${opts.to}:`, err);
  }
}

function esc(value: string): string {
  return value.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
}

function money(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
}

// Branded HTML wrapper matching the dashboard palette.
function shell(heading: string, bodyHtml: string, cta?: { label: string; href: string }): string {
  return `<div style="background:#faf6ee;padding:32px 0;font-family:Helvetica,Arial,sans-serif;color:#14131a;">
  <div style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #e5dcc9;border-radius:18px;overflow:hidden;">
    <div style="background:#14131a;padding:20px 28px;">
      <span style="color:#ffffff;font-size:18px;font-weight:800;">Influencer Outreach </span><span style="color:#d6fb5a;font-size:18px;font-weight:800;">Solutions</span>
    </div>
    <div style="padding:28px;">
      <h1 style="margin:0 0 14px;font-size:20px;font-weight:800;">${esc(heading)}</h1>
      ${bodyHtml}
      ${cta ? `<a href="${esc(cta.href)}" style="display:inline-block;margin-top:22px;background:#ff5a3c;color:#ffffff;text-decoration:none;font-weight:800;padding:12px 22px;border-radius:999px;">${esc(cta.label)}</a>` : ""}
    </div>
    <div style="padding:16px 28px;border-top:1px solid #e5dcc9;color:#6b6675;font-size:12px;">Influencer Outreach Solutions · outreachinfluencers.com</div>
  </div>
</div>`;
}

export async function sendOrderReceivedEmail(opts: {
  to?: string | null;
  orders: { id: string; service: string; amount: number; billing: string }[];
  paid?: boolean;
}): Promise<void> {
  const rows = opts.orders
    .map(
      (o) =>
        `<tr><td style="padding:10px 0;border-bottom:1px solid #e5dcc9;">${esc(o.service)}</td><td style="padding:10px 0;border-bottom:1px solid #e5dcc9;text-align:right;font-weight:800;white-space:nowrap;">${money(o.amount)}${o.billing === "monthly" ? "/mo" : ""}</td></tr>`
    )
    .join("");
  const multiple = opts.orders.length > 1;
  const total = opts.orders.reduce((sum, o) => sum + o.amount, 0);
  const intro = opts.paid
    ? `Thanks — your payment has been received and the team is getting started on your ${multiple ? "orders" : "order"}. Here's what you paid for:`
    : `Thanks — we've received your ${multiple ? "orders" : "order"} and the team is getting started. Here's what you ordered:`;
  const totalRow = opts.paid
    ? `<tr><td style="padding:12px 0 0;font-weight:800;">Paid today</td><td style="padding:12px 0 0;text-align:right;font-weight:800;white-space:nowrap;">${money(total)}</td></tr>`
    : "";
  const body = `<p style="margin:0 0 16px;color:#6b6675;">${intro}</p>
    <table style="width:100%;border-collapse:collapse;font-size:14px;">${rows}${totalRow}</table>`;
  await sendEmail({
    to: opts.to,
    subject: opts.paid
      ? "Payment received — your order is in"
      : multiple
        ? "We've received your orders"
        : "We've received your order",
    html: shell(opts.paid ? "Payment received" : "Order received", body, {
      label: "View your orders",
      href: `${APP_URL}/orders`
    })
  });
}

export async function sendPublishedEmail(opts: {
  to?: string | null;
  orderId: string;
  service: string;
  kind: "links" | "mentions" | "features";
  items: { title: string; url?: string }[];
}): Promise<void> {
  if (opts.items.length === 0) {
    return;
  }
  const noun = opts.kind === "features" ? "media features" : opts.kind === "mentions" ? "brand mentions" : "links";
  const list = opts.items
    .map(
      (i) =>
        `<li style="margin:8px 0;">${esc(i.title)}${i.url ? ` — <a href="${esc(i.url)}" style="color:#5b3df5;font-weight:700;">view</a>` : ""}</li>`
    )
    .join("");
  const count = opts.items.length;
  const body = `<p style="margin:0 0 12px;color:#6b6675;">Good news — ${count} new ${noun} just went live on <strong>${esc(opts.service)}</strong>:</p>
    <ul style="margin:0;padding-left:18px;font-size:14px;">${list}</ul>`;
  await sendEmail({
    to: opts.to,
    subject: `New ${noun} published on your order`,
    html: shell(`${count} new ${noun} live`, body, { label: "View details", href: `${APP_URL}/orders/${opts.orderId}` })
  });
}

export async function sendMessageEmail(opts: {
  to?: string | null;
  orderId: string;
  service: string;
  authorName: string;
  body: string;
}): Promise<void> {
  const body = `<p style="margin:0 0 12px;color:#6b6675;"><strong>${esc(opts.authorName)}</strong> posted an update on <strong>${esc(opts.service)}</strong>:</p>
    <div style="background:#faf6ee;border:1px solid #e5dcc9;border-radius:12px;padding:14px 16px;font-size:14px;white-space:pre-wrap;">${esc(opts.body)}</div>`;
  await sendEmail({
    to: opts.to,
    subject: "New update on your order",
    html: shell("New update on your order", body, { label: "Open order", href: `${APP_URL}/orders/${opts.orderId}` })
  });
}

export async function sendOrderCompletedEmail(opts: {
  to?: string | null;
  orderId: string;
  service: string;
  invoiceId?: string | null;
  invoicePdf?: Uint8Array;
}): Promise<void> {
  const body = `<p style="margin:0 0 12px;color:#6b6675;">Your order <strong>${esc(opts.service)}</strong> is complete.${opts.invoicePdf ? " Your invoice is attached to this email." : ""}</p>`;
  const attachments = opts.invoicePdf
    ? [{ filename: `${opts.invoiceId ?? opts.orderId}.pdf`, content: opts.invoicePdf }]
    : undefined;
  await sendEmail({
    to: opts.to,
    subject: "Your order is complete",
    html: shell("Order complete 🎉", body, { label: "View order", href: `${APP_URL}/orders/${opts.orderId}` }),
    attachments
  });
}
