"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BadgePercent, CreditCard, FileText, Settings, ShoppingBag, Store } from "lucide-react";
import type { ComponentType } from "react";

type NavItem = {
  label: string;
  href: string;
  icon: ComponentType<{ className?: string }>;
  activePrefix?: string;
};

export function SidebarNav({ staff, admin }: { staff: boolean; admin: boolean }) {
  const pathname = usePathname();

  // Staff (admin / sub-admin / employee) get a management-only nav — no Store or
  // cart — and their "Orders" points at the console where they manage every
  // client's orders. Team management lives inside Settings.
  const items: NavItem[] = staff
    ? [
        { label: "Orders", href: "/admin", icon: ShoppingBag, activePrefix: "/admin" },
        ...(admin
          ? [
              { label: "Payments", href: "/admin/payments", icon: CreditCard, activePrefix: "/admin/payments" },
              { label: "Discount codes", href: "/admin/discounts", icon: BadgePercent, activePrefix: "/admin/discounts" }
            ]
          : []),
        { label: "Settings", href: "/settings", icon: Settings, activePrefix: "/settings" }
      ]
    : [
        { label: "Orders", href: "/orders", icon: ShoppingBag, activePrefix: "/orders" },
        { label: "Store", href: "/store", icon: Store, activePrefix: "/store" },
        { label: "Invoices", href: "/invoices", icon: FileText, activePrefix: "/invoices" },
        { label: "Settings", href: "/settings", icon: Settings, activePrefix: "/settings" }
      ];

  const isActive = (item: NavItem) => {
    // /admin/discounts is its own workspace, not a selected order-management
    // view, even though it shares the same admin route prefix.
    if (item.href === "/admin") {
      return pathname === "/admin" || pathname.startsWith("/admin/orders/");
    }
    return item.activePrefix
      ? pathname === item.activePrefix || pathname.startsWith(`${item.activePrefix}/`)
      : false;
  };

  return (
    <nav className="mt-10 space-y-2">
      {items.map((item) => {
        const active = isActive(item);

        return (
          <Link
            key={item.label}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-bold transition ${
              active ? "bg-ink text-paper shadow-soft" : "text-muted hover:bg-paper-2 hover:text-ink"
            }`}
          >
            <item.icon className="size-4" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
