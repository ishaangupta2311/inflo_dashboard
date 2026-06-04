import { Bot, Link2, Megaphone, PackageCheck, Store, TrendingUp } from "lucide-react";
import type { ComponentType } from "react";

export type OrderStatus =
  | "Brief received"
  | "In outreach"
  | "Content review"
  | "Publishing"
  | "Completed";

export type Order = {
  id: string;
  service: string;
  category: "Link Building" | "Digital PR" | "AI SEO" | "SEO Reseller" | "Grow";
  status: OrderStatus;
  orderedAt: string;
  dueAt: string;
  amount: number;
  progress: number;
  targetUrl: string;
  deliverables: string[];
  owner: string;
  invoiceId?: string;
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

export const seedOrders: Order[] = [
  {
    id: "INF-48201",
    service: "Q3 Authority Sprint",
    category: "Link Building",
    status: "In outreach",
    orderedAt: "May 24, 2026",
    dueAt: "Jun 14, 2026",
    amount: 2850,
    progress: 58,
    targetUrl: "https://northstarcrm.com/features",
    deliverables: ["30 vetted publisher prospects", "10 DR60+ guest posts", "Anchor mix approved"],
    owner: "Maya Shah"
  },
  {
    id: "INF-48177",
    service: "AI Search Visibility Pack",
    category: "AI SEO",
    status: "Content review",
    orderedAt: "May 18, 2026",
    dueAt: "Jun 7, 2026",
    amount: 1497,
    progress: 76,
    targetUrl: "https://ledgerly.io",
    deliverables: ["Entity audit", "Citation target map", "5 comparison page drafts"],
    owner: "Arjun Mehta"
  },
  {
    id: "INF-48093",
    service: "Launch PR Push",
    category: "Digital PR",
    status: "Publishing",
    orderedAt: "May 9, 2026",
    dueAt: "Jun 5, 2026",
    amount: 4200,
    progress: 91,
    targetUrl: "https://cloudcart.ai/launch",
    deliverables: ["Press angles approved", "142 journalists contacted", "3 features scheduled"],
    owner: "Elena Ruiz"
  },
  {
    id: "INF-47742",
    service: "Authority Starter",
    category: "Link Building",
    status: "Completed",
    orderedAt: "Apr 12, 2026",
    dueAt: "Apr 29, 2026",
    amount: 285,
    progress: 100,
    targetUrl: "https://finopsdesk.com/blog",
    deliverables: ["3 DR50+ guest posts", "Live URL report", "Invoice ready"],
    owner: "Maya Shah",
    invoiceId: "INV-47742"
  },
  {
    id: "INF-47480",
    service: "Agency White-label Batch",
    category: "SEO Reseller",
    status: "Completed",
    orderedAt: "Mar 28, 2026",
    dueAt: "Apr 18, 2026",
    amount: 1788,
    progress: 100,
    targetUrl: "https://client-agency.example",
    deliverables: ["12 placements delivered", "White-label report", "Invoice ready"],
    owner: "Noah Brown",
    invoiceId: "INV-47480"
  }
];

export const money = (amount: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0
  }).format(amount);

export const iconForCategory = (category: Order["category"]) =>
  serviceOptions.find((option) => option.name === category)?.icon ?? PackageCheck;

export const invoiceHref = (invoiceId: string) =>
  `/api/invoices/${encodeURIComponent(invoiceId)}`;
