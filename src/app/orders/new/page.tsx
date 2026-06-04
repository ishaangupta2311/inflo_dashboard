import Link from "next/link";
import { ArrowLeft, ArrowRight, CalendarDays, Link2, Target } from "lucide-react";
import { DashboardShell } from "@/components/dashboard-shell";
import { money, serviceOptions } from "@/lib/orders";

export default function NewOrderPage() {
  return (
    <DashboardShell>
      <div className="mb-6">
        <Link href="/orders" className="inline-flex items-center gap-2 text-sm font-black text-muted transition hover:text-ink">
          <ArrowLeft className="size-4" />
          Current Orders
        </Link>
        <div className="mt-4 flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
          <div>
            <p className="font-mono text-xs font-bold uppercase tracking-[0.18em] text-violet">New Order</p>
            <h1 className="mt-2 font-display text-4xl font-black tracking-tight sm:text-5xl">
              Start a new outreach order
            </h1>
          </div>
          <span className="w-fit rounded-full bg-lime px-4 py-2 text-sm font-black text-lime-ink">
            Prototype form
          </span>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
        <section className="rounded-3xl border border-line bg-card p-5 shadow-card sm:p-6">
          <h2 className="font-display text-2xl font-black tracking-tight">Choose a service</h2>
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {serviceOptions.map((service, index) => (
              <label
                key={service.name}
                className={`group rounded-2xl border p-4 transition hover:-translate-y-0.5 hover:border-ink ${
                  index === 0 ? "border-ink bg-paper" : "border-line bg-card"
                }`}
              >
                <input className="sr-only" type="radio" name="service" defaultChecked={index === 0} />
                <div className="flex items-start gap-3">
                  <span className="grid size-11 place-items-center rounded-xl bg-violet-soft text-violet">
                    <service.icon className="size-5" />
                  </span>
                  <span>
                    <span className="block font-display text-xl font-black">{service.name}</span>
                    <span className="mt-1 block text-sm leading-5 text-muted">{service.description}</span>
                    <span className="mt-3 block font-mono text-xs font-bold uppercase tracking-[0.14em] text-coral-ink">
                      from {money(service.startingPrice)}
                    </span>
                  </span>
                </div>
              </label>
            ))}
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-2">
            <label className="block">
              <span className="mb-2 flex items-center gap-2 text-sm font-black">
                <Target className="size-4 text-violet" />
                Campaign name
              </span>
              <input className="w-full rounded-xl border border-line bg-paper px-4 py-3 outline-none transition focus:border-violet focus:ring-4 focus:ring-violet/15" defaultValue="June authority sprint" />
            </label>
            <label className="block">
              <span className="mb-2 flex items-center gap-2 text-sm font-black">
                <Link2 className="size-4 text-violet" />
                Target URL
              </span>
              <input className="w-full rounded-xl border border-line bg-paper px-4 py-3 outline-none transition focus:border-violet focus:ring-4 focus:ring-violet/15" placeholder="https://example.com/page" />
            </label>
            <label className="block">
              <span className="mb-2 flex items-center gap-2 text-sm font-black">
                <CalendarDays className="size-4 text-violet" />
                Preferred delivery window
              </span>
              <select className="w-full rounded-xl border border-line bg-paper px-4 py-3 outline-none transition focus:border-violet focus:ring-4 focus:ring-violet/15" defaultValue="standard">
                <option value="standard">Standard · 14-21 days</option>
                <option value="priority">Priority · 7-10 days</option>
                <option value="managed">Managed roadmap · monthly</option>
              </select>
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-black">Budget range</span>
              <select className="w-full rounded-xl border border-line bg-paper px-4 py-3 outline-none transition focus:border-violet focus:ring-4 focus:ring-violet/15" defaultValue="1000-2500">
                <option value="under-1000">Under $1,000</option>
                <option value="1000-2500">$1,000 - $2,500</option>
                <option value="2500-5000">$2,500 - $5,000</option>
                <option value="5000-plus">$5,000+</option>
              </select>
            </label>
          </div>

          <label className="mt-4 block">
            <span className="mb-2 block text-sm font-black">Brief</span>
            <textarea
              className="min-h-36 w-full rounded-xl border border-line bg-paper px-4 py-3 outline-none transition focus:border-violet focus:ring-4 focus:ring-violet/15"
              defaultValue="We want placements for our main product page with branded and partial-match anchors. Avoid coupon, casino, and generic directory sites."
            />
          </label>
        </section>

        <aside className="h-fit rounded-3xl border border-line bg-ink p-5 text-paper shadow-soft sm:p-6">
          <p className="font-mono text-xs font-bold uppercase tracking-[0.18em] text-lime">Order summary</p>
          <h2 className="mt-3 font-display text-3xl font-black tracking-tight">Authority Starter</h2>
          <p className="mt-3 text-sm leading-6 text-[#d9d5e2]">
            This mock submission keeps the prototype working while the production checkout and billing source are selected.
          </p>

          <div className="mt-6 space-y-3 rounded-2xl border border-white/10 bg-white/8 p-4">
            <div className="flex justify-between gap-4 text-sm">
              <span className="text-[#d9d5e2]">Estimated subtotal</span>
              <span className="font-black">$1,000 - $2,500</span>
            </div>
            <div className="flex justify-between gap-4 text-sm">
              <span className="text-[#d9d5e2]">Delivery</span>
              <span className="font-black">14-21 days</span>
            </div>
            <div className="flex justify-between gap-4 text-sm">
              <span className="text-[#d9d5e2]">Next step</span>
              <span className="font-black">Team review</span>
            </div>
          </div>

          <button className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full bg-coral px-5 py-4 text-sm font-black text-white shadow-coral transition hover:-translate-y-0.5 hover:bg-coral-ink">
            Submit New Order
            <ArrowRight className="size-4" />
          </button>
          <p className="mt-3 text-center text-xs text-[#bdb7c9]">
            Prototype button only. Production will create an order and invoice session.
          </p>
        </aside>
      </div>
    </DashboardShell>
  );
}
