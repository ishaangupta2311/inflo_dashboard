import { Bot, Link2, Megaphone, Store, TrendingUp } from "lucide-react";
import type { ComponentType } from "react";

export type OrderStatus = "In Progress" | "Completed";

export type Order = {
  id: string;
  service: string;
  category: "Link Building" | "Digital PR" | "AI SEO" | "SEO Reseller" | "Grow";
  status: OrderStatus;
  orderedAt: string;
  dueAt: string;
  amount: number;
  progress: number;
  linkTotal?: number;
  linksDelivered?: number;
  prTotal?: number;
  prDelivered?: number;
  targetUrl: string;
  deliverables: string[];
  owner: string;
  invoiceId?: string;
  quoteStatus?: string;
};

export type ServiceOption = {
  name: Order["category"];
  description: string;
  startingPrice: number;
  icon: ComponentType<{ className?: string }>;
};

export const serviceOptions: ServiceOption[] = [
  {
    name: "Link Building",
    description: "Editorial guest posts and niche placements on vetted domains.",
    startingPrice: 95,
    icon: Link2
  },
  {
    name: "Digital PR",
    description: "Campaign-led journalist outreach for tier-one media coverage.",
    startingPrice: 899,
    icon: Megaphone
  },
  {
    name: "AI SEO",
    description: "Entity and citation work for AI Overviews, ChatGPT, and Gemini.",
    startingPrice: 499,
    icon: Bot
  },
  {
    name: "SEO Reseller",
    description: "White-label fulfilment with reports ready for agency clients.",
    startingPrice: 149,
    icon: Store
  },
  {
    name: "Grow",
    description: "Managed strategy, content, PR, and links against one roadmap.",
    startingPrice: 1950,
    icon: TrendingUp
  }
];

export const money = (amount: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0
  }).format(amount);

export const categoryIcons: Record<Order["category"], ComponentType<{ className?: string }>> = {
  "Link Building": Link2,
  "Digital PR": Megaphone,
  "AI SEO": Bot,
  "SEO Reseller": Store,
  Grow: TrendingUp
};

export const invoiceHref = (invoiceId: string) =>
  `/api/invoices/${encodeURIComponent(invoiceId)}`;
