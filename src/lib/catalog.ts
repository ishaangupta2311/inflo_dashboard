import { Bot, Link2, Megaphone, TrendingUp } from "lucide-react";
import type { ComponentType } from "react";
import type { Order } from "@/lib/orders";

export type BillingInterval = "one_time" | "monthly";

export type CatalogPackage = {
  id: string;
  name: string;
  price: number;
  billing: BillingInterval;
  tagline: string;
  highlight?: string;
  features: string[];
  links?: number; // number of links/placements this package delivers (Link Building)
  dr?: string; // DR tier of those links, e.g. "DR 50+"
};

export type CatalogAddOn = {
  id: string;
  name: string;
  price: number;
  unit: string;
  dr: string; // DR tier of the placement, e.g. "DR 30+"
};

export type CatalogService = {
  slug: string;
  category: Order["category"];
  name: string;
  tagline: string;
  description: string;
  icon: ComponentType<{ className?: string }>;
  sourceUrl: string;
  mode: "packages" | "quote";
  highlights: string[];
  packages: CatalogPackage[];
  addOns?: CatalogAddOn[];
};

export const catalog: CatalogService[] = [
  {
    slug: "link-building",
    category: "Link Building",
    name: "Link Building",
    tagline: "Editorial guest posts on human-vetted, real-traffic domains.",
    description:
      "Niche-relevant guest posts and placements on vetted domains, with original content and a live tracking dashboard. Every link is backed by a 12-month live guarantee.",
    icon: Link2,
    sourceUrl: "https://outreachinfluencers.com/link-building",
    mode: "packages",
    highlights: [
      "12-month live guarantee — free replacement if a link drops",
      "100% human-vetted, real-traffic sites",
      "Average 14-day turnaround"
    ],
    addOns: [
      { id: "lb-dr30", name: "Single guest post — DR 30+", price: 120, unit: "per placement", dr: "DR 30+" },
      { id: "lb-dr40", name: "Single guest post — DR 40+", price: 160, unit: "per placement", dr: "DR 40+" },
      { id: "lb-dr50", name: "Single guest post — DR 50+", price: 250, unit: "per placement", dr: "DR 50+" },
      { id: "lb-dr60", name: "Single guest post — DR 60+", price: 300, unit: "per placement", dr: "DR 60+" }
    ],
    packages: [
      {
        id: "lb-starter",
        name: "Starter",
        price: 600,
        billing: "one_time",
        tagline: "3 links, DR 50+",
        links: 3,
        dr: "DR 50+",
        features: [
          "3 guest posts on DR 50+ sites",
          "Niche-relevant matching",
          "Original content included",
          "Live tracking dashboard"
        ]
      },
      {
        id: "lb-growth",
        name: "Growth",
        price: 1600,
        billing: "one_time",
        tagline: "8 links, DR 50+",
        highlight: "Best value",
        links: 8,
        dr: "DR 50+",
        features: [
          "8 guest posts on DR 50+ sites",
          "Anchor & target strategy review",
          "Priority turnaround",
          "Dedicated account manager"
        ]
      },
      {
        id: "lb-domination",
        name: "Domination",
        price: 2500,
        billing: "one_time",
        tagline: "15 links, DR 40–50+",
        links: 15,
        dr: "DR 40–50+",
        features: [
          "15 guest posts on DR 40–50+ sites",
          "Custom anchor distribution plan",
          "Competitor gap analysis",
          "Monthly strategy call"
        ]
      }
    ]
  },
  {
    slug: "digital-pr",
    category: "Digital PR",
    name: "Digital PR",
    tagline: "Campaign-led journalist outreach for tier-one media coverage.",
    description:
      "Data-led PR campaigns that land features in tier-one and niche publications, with expert quote placement and a full coverage report. Backed by 2,000+ journalist relationships.",
    icon: Megaphone,
    sourceUrl: "https://outreachinfluencers.com/digital-pr",
    mode: "packages",
    highlights: [
      "~21 days to first placement",
      "2,000+ journalist relationships",
      "Coverage report with links & reach estimates"
    ],
    packages: [
      {
        id: "pr-spotlight",
        name: "PR Spotlight",
        price: 499,
        billing: "one_time",
        tagline: "1 media feature",
        features: [
          "1 guaranteed tier-1 / niche feature",
          "Expert quote placement",
          "DR 70+ publication minimum",
          "Coverage report included"
        ]
      },
      {
        id: "pr-power-play",
        name: "PR Power Play",
        price: 999,
        billing: "one_time",
        tagline: "3 media features",
        highlight: "Most popular",
        features: [
          "3 tier-1 media features",
          "Story angle & asset creation",
          "Dedicated PR strategist",
          "Coverage report included"
        ]
      },
      {
        id: "pr-engine",
        name: "PR Engine",
        price: 1999,
        billing: "one_time",
        tagline: "8 media features",
        features: [
          "8 tier-1 media features",
          "Full data-led campaign",
          "Reactive newsjacking",
          "Strategy session & reporting"
        ]
      }
    ]
  },
  {
    slug: "ai-seo",
    category: "AI SEO",
    name: "AI SEO — Brand Mentions",
    tagline: "Brand-mention placements that surface you across AI search.",
    description:
      "Entity, citation, and brand-mention work to grow your visibility across ChatGPT, Gemini, Perplexity, and Google AI Overviews — delivered through high-authority placements.",
    icon: Bot,
    sourceUrl: "https://outreachinfluencers.com/ai-seo",
    mode: "packages",
    highlights: [
      "Visibility across ChatGPT, Gemini, Perplexity & Google AI Overviews",
      "Entity & citation authority building",
      "AI visibility tracking"
    ],
    packages: [
      {
        id: "ai-starter",
        name: "Starter",
        price: 600,
        billing: "one_time",
        tagline: "3 links, DR 50+",
        features: [
          "3 brand-mention placements on DR 50+ sites",
          "Entity-aligned content",
          "AI visibility baseline"
        ]
      },
      {
        id: "ai-growth",
        name: "Growth",
        price: 1600,
        billing: "one_time",
        tagline: "8 links, DR 50+",
        highlight: "Best value",
        features: [
          "8 brand-mention placements on DR 50+ sites",
          "Entity & citation strategy",
          "Monthly AI visibility tracking"
        ]
      },
      {
        id: "ai-domination",
        name: "Domination",
        price: 2500,
        billing: "one_time",
        tagline: "15 links, DR 40–50+",
        features: [
          "15 brand-mention placements on DR 40–50+ sites",
          "Full entity & schema strategy",
          "Dedicated AI SEO strategist"
        ]
      }
    ]
  },
  {
    slug: "grow",
    category: "Grow",
    name: "Grow",
    tagline: "Managed strategy, content, PR, and links on one roadmap.",
    description:
      "A fully managed program combining strategy, content, digital PR, and link building against a single roadmap. Scoped to your goals — request a quote.",
    icon: TrendingUp,
    sourceUrl: "https://outreachinfluencers.com",
    mode: "quote",
    highlights: [
      "Managed strategy + execution",
      "Content, PR & links on one roadmap",
      "Monthly reporting & strategy calls"
    ],
    packages: []
  }
];

export const catalogBySlug = (slug: string) => catalog.find((service) => service.slug === slug);

export const catalogByCategory = (category: Order["category"]) =>
  catalog.find((service) => service.category === category);

export function findPackage(packageId: string) {
  for (const service of catalog) {
    const match = service.packages.find((pkg) => pkg.id === packageId);
    if (match) {
      return { service, pkg: match };
    }
  }
  return undefined;
}

export type Buyable = {
  id: string;
  kind: "package" | "addon";
  service: CatalogService;
  name: string;
  price: number;
  billing: BillingInterval;
  description: string;
  links: number; // links/placements per unit — 1 for an add-on, the package's count otherwise
  dr: string; // DR tier label, e.g. "DR 30+" (empty for services without a DR tier)
};

/** Resolves any cart line id (package or à-la-carte add-on) to a uniform buyable. */
export function findBuyable(id: string): Buyable | undefined {
  for (const service of catalog) {
    const pkg = service.packages.find((p) => p.id === id);
    if (pkg) {
      return {
        id: pkg.id,
        kind: "package",
        service,
        name: pkg.name,
        price: pkg.price,
        billing: pkg.billing,
        description: pkg.tagline,
        links: pkg.links ?? 1,
        dr: pkg.dr ?? ""
      };
    }

    const addOn = service.addOns?.find((a) => a.id === id);
    if (addOn) {
      return {
        id: addOn.id,
        kind: "addon",
        service,
        name: addOn.name,
        price: addOn.price,
        billing: "one_time",
        description: addOn.unit,
        links: 1,
        dr: addOn.dr
      };
    }
  }
  return undefined;
}
