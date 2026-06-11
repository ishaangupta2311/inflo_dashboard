import Link from "next/link";
import { ArrowRight, Check, Sparkles } from "lucide-react";
import { DashboardShell } from "@/components/dashboard-shell";
import { catalog, type CatalogService } from "@/lib/catalog";
import { money } from "@/lib/orders";

function fromPrice(service: CatalogService): number | null {
  const prices = [
    ...service.packages.map((pkg) => pkg.price),
    ...(service.addOns?.map((addOn) => addOn.price) ?? [])
  ];
  return prices.length ? Math.min(...prices) : null;
}

export default function StorePage() {
  return (
    <DashboardShell>
      <section className="overflow-hidden rounded-3xl border border-line bg-ink p-6 text-paper shadow-soft lg:p-8">
        <p className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 font-mono text-xs font-bold uppercase tracking-[0.18em] text-lime">
          <Sparkles className="size-4" />
          Service store
        </p>
        <h1 className="mt-4 max-w-3xl font-display text-4xl font-black leading-none tracking-tight sm:text-5xl">
          Pick a service, add it to your cart, and we start the work.
        </h1>
        <p className="mt-4 max-w-2xl text-sm leading-6 text-[#d9d5e2]">
          Every package below maps to a live order with progress tracking and invoice downloads. Need
          something bespoke? Request a quote and the team scopes it for you.
        </p>
      </section>

      <section className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {catalog.map((service) => {
          const from = fromPrice(service);

          return (
            <Link
              key={service.slug}
              href={`/store/${service.slug}`}
              className="group flex flex-col rounded-2xl border border-line bg-card p-5 shadow-card transition hover:-translate-y-0.5 hover:border-ink"
            >
              <div className="flex items-start justify-between gap-4">
                <span className="grid size-12 place-items-center rounded-xl bg-violet-soft text-violet">
                  <service.icon className="size-6" />
                </span>
                <span className="rounded-full border border-line px-3 py-1 font-mono text-xs font-bold uppercase tracking-[0.12em] text-muted">
                  {service.mode === "quote" ? "Custom" : `from ${money(from ?? 0)}`}
                </span>
              </div>

              <h2 className="mt-4 font-display text-2xl font-black tracking-tight">{service.name}</h2>
              <p className="mt-2 text-sm leading-6 text-muted">{service.tagline}</p>

              <ul className="mt-4 space-y-2">
                {service.highlights.slice(0, 3).map((highlight) => (
                  <li key={highlight} className="flex gap-2 text-sm text-ink">
                    <Check className="mt-0.5 size-4 shrink-0 text-mint" />
                    <span>{highlight}</span>
                  </li>
                ))}
              </ul>

              <span className="mt-5 inline-flex items-center gap-2 text-sm font-black text-violet transition group-hover:gap-3">
                {service.mode === "quote" ? "Request a quote" : "View packages"}
                <ArrowRight className="size-4" />
              </span>
            </Link>
          );
        })}
      </section>
    </DashboardShell>
  );
}
