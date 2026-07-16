import { redirect } from "next/navigation";
import { DashboardShell } from "@/components/dashboard-shell";
import { DiscountCodeManager } from "@/components/discount-code-manager";
import { isAdmin } from "@/lib/auth";
import { listDiscountCodes } from "@/lib/discount-code-backend";

export default async function DiscountCodesPage() {
  if (!(await isAdmin())) {
    redirect("/admin");
  }

  const codes = await listDiscountCodes();

  return (
    <DashboardShell>
      <section>
        <p className="font-mono text-xs font-bold uppercase tracking-[0.18em] text-violet">Admin</p>
        <h1 className="mt-2 font-display text-4xl font-black tracking-tight">Discount codes</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-muted">
          Create percentage discounts for the client checkout. Each code is validated and priced on the server before PayPal is opened.
        </p>
      </section>

      <section className="mt-8">
        <DiscountCodeManager codes={codes} />
      </section>
    </DashboardShell>
  );
}
