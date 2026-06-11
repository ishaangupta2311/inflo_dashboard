"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FileText, Settings, ShoppingBag, Store } from "lucide-react";
import type { ComponentType } from "react";

type NavItem = {
  label: string;
  href: string;
  icon: ComponentType<{ className?: string }>;
  activePrefix?: string;
};

export function SidebarNav({ admin }: { admin: boolean }) {
  const pathname = usePathname();

  // Admins get a management-only nav (no Store/cart/buy flow); their "Orders"
  // points at the admin console where they manage every client's orders.
  const items: NavItem[] = admin
    ? [
        { label: "Orders", href: "/admin", icon: ShoppingBag, activePrefix: "/admin" },
        { label: "Settings", href: "#", icon: Settings }
      ]
    : [
        { label: "Orders", href: "/orders", icon: ShoppingBag, activePrefix: "/orders" },
        { label: "Store", href: "/store", icon: Store, activePrefix: "/store" },
        { label: "Invoices", href: "/orders#completed", icon: FileText },
        { label: "Settings", href: "#", icon: Settings }
      ];

  const isActive = (item: NavItem) =>
    item.activePrefix
      ? pathname === item.activePrefix || pathname.startsWith(`${item.activePrefix}/`)
      : false;

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
