import { requireAdmin } from "@/lib/auth";
import {
  isValidDiscountCode,
  isValidDiscountPercentage,
  normalizeDiscountCode,
  type AppliedDiscount
} from "@/lib/discount-code";
import { prisma } from "@/lib/prisma";

export type DiscountCodeSummary = {
  id: string;
  code: string;
  percentage: number;
  active: boolean;
  createdAt: string;
};

export async function resolveActiveDiscount(rawCode?: string): Promise<AppliedDiscount | undefined> {
  const code = normalizeDiscountCode(rawCode ?? "");
  if (!code) return undefined;
  if (!isValidDiscountCode(code)) {
    throw new Error("Enter a valid discount code.");
  }

  const discount = await prisma.discountCode.findUnique({ where: { code } });
  if (!discount || !discount.active) {
    throw new Error("This discount code is invalid or no longer active.");
  }

  return { code: discount.code, percentage: discount.percentage };
}

export async function listDiscountCodes(): Promise<DiscountCodeSummary[]> {
  await requireAdmin();
  const rows = await prisma.discountCode.findMany({ orderBy: { createdAt: "desc" } });
  return rows.map((row) => ({
    id: row.id,
    code: row.code,
    percentage: row.percentage,
    active: row.active,
    createdAt: row.createdAt.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric"
    })
  }));
}

export async function createDiscountCode(input: {
  code: string;
  percentage: number;
}): Promise<DiscountCodeSummary> {
  await requireAdmin();
  const code = normalizeDiscountCode(input.code);
  if (!isValidDiscountCode(code)) {
    throw new Error("Use 3–32 uppercase letters, numbers, hyphens, or underscores.");
  }
  if (!isValidDiscountPercentage(input.percentage)) {
    throw new Error("Discount percentage must be a whole number from 1 to 99.");
  }

  try {
    const row = await prisma.discountCode.create({
      data: { code, percentage: input.percentage }
    });
    return {
      id: row.id,
      code: row.code,
      percentage: row.percentage,
      active: row.active,
      createdAt: row.createdAt.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric"
      })
    };
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "P2002") {
      throw new Error("That discount code already exists.");
    }
    throw error;
  }
}

export async function setDiscountCodeActive(id: string, active: boolean): Promise<void> {
  await requireAdmin();
  if (!id) throw new Error("Missing discount code.");
  await prisma.discountCode.update({ where: { id }, data: { active } });
}
