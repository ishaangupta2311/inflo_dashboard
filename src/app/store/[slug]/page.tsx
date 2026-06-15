import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Check, ExternalLink, Link2, Star, Target } from "lucide-react";
import { createQuoteRequestAction } from "@/app/actions";
import { AddToCartButton } from "@/components/add-to-cart-button";
import { AddToCartStepper } from "@/components/add-to-cart-stepper";
import { CheckoutButton } from "@/components/checkout-button";
import { DashboardShell } from "@/components/dashboard-shell";
import { isStaff } from "@/lib/auth";
import { catalogBySlug } from "@/lib/catalog";
import { money } from "@/lib/orders";

export default async function StoreServicePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  if (await isStaff()) {
    redirect("/admin");
  }

  const service = catalogBySlug(slug);

  if (!service) {
    notFound();
  }

  const priceLabel = (price: number, billing: string) =>
    billing === "monthly" ? `${money(price)}/mo` : money(price);

  return (
    <DashboardShell>
      <div className="mb-6">
        <Link href="/store" className="inline-flex items-center gap-2 text-sm font-black text-muted transition hover:text-ink">
          <ArrowLeft className="size-4" />
          Service store
        </Link>
      </div>

      <section className="overflow-hidden rounded-3xl border border-line bg-card p-6 shadow-card lg:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-2xl">
            <div className="flex items-center gap-3">
              <span className="grid size-12 place-items-center rounded-xl bg-violet-soft text-violet">
                <service.icon className="size-6" />
              </span>
              <div>
                <p className="font-mono text-xs font-bold uppercase tracking-[0.16em] text-muted">
                  {service.category}
                </p>
                <h1 className="font-display text-3xl font-black tracking-tight sm:text-4xl">{service.name}</h1>
              </div>
            </div>
            <p className="mt-4 text-base leading-7 text-muted">{service.description}</p>
          </div>

          <ul className="w-full shrink-0 space-y-2 rounded-2xl border border-line bg-paper p-5 lg:w-80">
            {service.highlights.map((highlight) => (
              <li key={highlight} className="flex gap-2 text-sm font-bold text-ink">
                <Check className="mt-0.5 size-4 shrink-0 text-mint" />
                <span>{highlight}</span>
              </li>
            ))}
            <li>
              <a
                href={service.sourceUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-2 inline-flex items-center gap-2 text-sm font-black text-violet hover:text-violet-ink"
              >
                <ExternalLink className="size-4" />
                See full details
              </a>
            </li>
          </ul>
        </div>
      </section>

      {service.mode === "packages" ? (
        <>
          <section className="mt-8">
            <h2 className="font-display text-2xl font-black tracking-tight">Packages</h2>
            <div className="mt-4 grid gap-4 md:grid-cols-3">
              {service.packages.map((pkg) => (
                <div
                  key={pkg.id}
                  className={`flex flex-col rounded-2xl border bg-card p-5 shadow-card ${
                    pkg.highlight ? "border-violet ring-2 ring-violet/20" : "border-line"
                  }`}
                >
                  {pkg.highlight ? (
                    <span className="mb-3 inline-flex w-fit items-center gap-1 rounded-full bg-violet px-3 py-1 text-xs font-black text-white">
                      <Star className="size-3" />
                      {pkg.highlight}
                    </span>
                  ) : null}
                  <h3 className="font-display text-xl font-black tracking-tight">{pkg.name}</h3>
                  <p className="mt-1 text-sm text-muted">{pkg.tagline}</p>
                  <p className="mt-4 font-display text-4xl font-black tracking-tight">
                    {priceLabel(pkg.price, pkg.billing)}
                  </p>

                  <ul className="mt-4 flex-1 space-y-2">
                    {pkg.features.map((feature) => (
                      <li key={feature} className="flex gap-2 text-sm text-ink">
                        <Check className="mt-0.5 size-4 shrink-0 text-mint" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <div className="mt-5">
                    <AddToCartButton id={pkg.id} />
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 flex justify-center">
              <CheckoutButton />
            </div>
          </section>

          {service.addOns && service.addOns.length > 0 ? (
            <section className="mt-8">
              <h2 className="font-display text-2xl font-black tracking-tight">À la carte</h2>
              <p className="mt-1 text-sm text-muted">Single placements you can add individually.</p>
              <div className="mt-4 overflow-hidden rounded-2xl border border-line bg-card shadow-card">
                {service.addOns.map((addOn) => (
                  <div
                    key={addOn.id}
                    className="grid gap-3 border-b border-line px-5 py-4 last:border-b-0 sm:grid-cols-[1fr_auto_auto] sm:items-center"
                  >
                    <div>
                      <p className="font-bold">{addOn.name}</p>
                      <p className="text-sm text-muted">{addOn.unit}</p>
                    </div>
                    <p className="font-display text-2xl font-black">{money(addOn.price)}</p>
                    <div className="sm:justify-self-end">
                      <AddToCartStepper id={addOn.id} />
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ) : null}
        </>
      ) : (
        <section className="mt-8 grid gap-6 lg:grid-cols-[1fr_380px]">
          <div className="rounded-2xl border border-line bg-card p-6 shadow-card">
            <h2 className="font-display text-2xl font-black tracking-tight">Request a quote</h2>
            <p className="mt-2 text-sm leading-6 text-muted">
              {service.name} is scoped to your goals and volume. Send your details and the team replies
              with pricing — it appears as an order in your dashboard so you can track it end to end.
            </p>
            <form action={createQuoteRequestAction} className="mt-6 grid gap-4">
              <input type="hidden" name="slug" value={service.slug} />
              <label className="block">
                <span className="mb-2 flex items-center gap-2 text-sm font-black">
                  <Link2 className="size-4 text-violet" />
                  Target URL
                </span>
                <input
                  name="targetUrl"
                  required
                  type="url"
                  placeholder="https://example.com"
                  className="w-full rounded-xl border border-line bg-paper px-4 py-3 outline-none transition focus:border-violet focus:ring-4 focus:ring-violet/15"
                />
              </label>
              <label className="block">
                <span className="mb-2 flex items-center gap-2 text-sm font-black">
                  <Target className="size-4 text-violet" />
                  What do you need?
                </span>
                <textarea
                  name="brief"
                  className="min-h-32 w-full rounded-xl border border-line bg-paper px-4 py-3 outline-none transition focus:border-violet focus:ring-4 focus:ring-violet/15"
                  placeholder="Goals, monthly volume, target markets, anything we should know."
                />
              </label>
              <button className="inline-flex items-center justify-center gap-2 rounded-full bg-coral px-5 py-4 text-sm font-black text-white shadow-coral transition hover:-translate-y-0.5 hover:bg-coral-ink">
                Request quote
              </button>
            </form>
          </div>

          <aside className="h-fit rounded-2xl border border-line bg-ink p-6 text-paper shadow-soft">
            <p className="font-mono text-xs font-bold uppercase tracking-[0.18em] text-lime">What happens next</p>
            <ol className="mt-4 space-y-4 text-sm leading-6 text-[#d9d5e2]">
              <li><span className="font-black text-paper">1.</span> We review your brief and scope the work.</li>
              <li><span className="font-black text-paper">2.</span> Pricing is added to the order in your dashboard.</li>
              <li><span className="font-black text-paper">3.</span> You approve and we begin — with live progress updates.</li>
            </ol>
          </aside>
        </section>
      )}
    </DashboardShell>
  );
}
