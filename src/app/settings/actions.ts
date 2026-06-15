"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { requireStaff } from "@/lib/auth";
import { ROLE_LABEL, type StaffRole } from "@/lib/roles";
import {
  addOrInviteMember,
  changeMemberRole,
  removeMember,
  revokeInvite
} from "@/lib/team";
import { updateBillingDetails } from "@/lib/order-backend";

export type TeamActionResult = { ok: true; message: string } | { ok: false; error: string };
export type BillingActionResult = { ok: true; message: string } | { ok: false; error: string };

export async function updateBillingDetailsAction(
  _prev: BillingActionResult | null,
  formData: FormData
): Promise<BillingActionResult> {
  try {
    await updateBillingDetails({
      companyName: String(formData.get("companyName") || ""),
      billingAddress: String(formData.get("billingAddress") || ""),
      taxId: String(formData.get("taxId") || "")
    });
    revalidatePath("/settings");
    revalidatePath("/invoices");
    return { ok: true, message: "Billing details saved." };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Could not save billing details." };
  }
}

async function signUpUrl(): Promise<string> {
  const h = await headers();
  const host = h.get("host");
  const origin = h.get("origin") ?? (host ? `https://${host}` : "");
  return `${origin}/sign-up`;
}

function requireManager(role: StaffRole): void {
  if (role === "employee") {
    throw new Error("You don't have access to manage the team.");
  }
}

export async function addMemberAction(
  _prev: TeamActionResult | null,
  formData: FormData
): Promise<TeamActionResult> {
  try {
    const { userId: actorId, role: actorRole } = await requireStaff();
    requireManager(actorRole);

    const email = String(formData.get("email") || "");
    const role = String(formData.get("role") || "") as StaffRole;

    const result = await addOrInviteMember({
      actorRole,
      actorId,
      email,
      role,
      signUpUrl: await signUpUrl()
    });
    revalidatePath("/settings");

    return {
      ok: true,
      message:
        result.status === "invited"
          ? `Invite sent to ${result.email}.`
          : `${result.email} is now ${ROLE_LABEL[role]}.`
    };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Could not add member." };
  }
}

export async function changeRoleAction(formData: FormData): Promise<void> {
  const { userId: actorId, role: actorRole } = await requireStaff();
  requireManager(actorRole);

  await changeMemberRole({
    actorRole,
    actorId,
    userId: String(formData.get("userId") || ""),
    role: String(formData.get("role") || "") as StaffRole
  });
  revalidatePath("/settings");
}

export async function removeMemberAction(formData: FormData): Promise<void> {
  const { userId: actorId, role: actorRole } = await requireStaff();
  requireManager(actorRole);

  await removeMember({ actorRole, actorId, userId: String(formData.get("userId") || "") });
  revalidatePath("/settings");
}

export async function revokeInviteAction(formData: FormData): Promise<void> {
  const { role: actorRole } = await requireStaff();
  requireManager(actorRole);

  await revokeInvite({ actorRole, invitationId: String(formData.get("invitationId") || "") });
  revalidatePath("/settings");
}
