import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { CartView } from "@/components/cart-view";
import { DashboardShell } from "@/components/dashboard-shell";

export default function CartPage() {
  return (
    <DashboardShell>
      <div className="mb-6">
        <Link href="/store" className="inline-flex items-center gap-2 text-sm font-black text-muted transition hover:text-ink">
          <ArrowLeft className="size-4" />
          Continue shopping
        </Link>
        <h1 className="mt-4 font-display text-4xl font-black tracking-tight sm:text-5xl">Your cart</h1>
      </div>

      <CartView />
    </DashboardShell>
  );
}
