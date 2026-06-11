import { clerkClient } from "@clerk/nextjs/server";
import {
  assignableRoles,
  canManage,
  compareMembers,
  parseStaffRole,
  type StaffRole
} from "@/lib/roles";

export type TeamMember = {
  id: string;
  email: string;
  name: string | null;
  role: StaffRole;
  isSelf: boolean;
};

export type PendingInvite = {
  id: string;
  email: string;
  role: StaffRole;
  createdAtLabel: string;
};

export type TeamRoster = { members: TeamMember[]; invites: PendingInvite[] };

type ClerkUserish = {
  id: string;
  firstName: string | null;
  lastName: string | null;
  primaryEmailAddressId: string | null;
  emailAddresses: { id: string; emailAddress: string }[];
  publicMetadata: UserPublicMetadata;
};

function emailOf(user: ClerkUserish): string {
  const primary = user.emailAddresses.find((e) => e.id === user.primaryEmailAddressId);
  return primary?.emailAddress ?? user.emailAddresses[0]?.emailAddress ?? "";
}

function nameOf(user: ClerkUserish): string | null {
  const name = [user.firstName, user.lastName].filter(Boolean).join(" ").trim();
  return name.length > 0 ? name : null;
}

/**
 * The full staff roster + pending invites, read straight from Clerk (the source
 * of truth for roles).
 *
 * NOTE: filtering happens in memory over the first page of users. That's fine at
 * the current scale; past a few hundred total users this should move to a
 * DB-backed staff index or full pagination.
 */
export async function getTeam(selfId: string): Promise<TeamRoster> {
  const client = await clerkClient();

  const userList = await client.users.getUserList({ limit: 200, orderBy: "-created_at" });
  const members: TeamMember[] = [];
  for (const user of userList.data) {
    const role = parseStaffRole(user.publicMetadata?.role);
    if (!role) continue;
    members.push({
      id: user.id,
      email: emailOf(user),
      name: nameOf(user),
      role,
      isSelf: user.id === selfId
    });
  }
  members.sort(compareMembers);

  const invites: PendingInvite[] = [];
  try {
    const inviteList = await client.invitations.getInvitationList({ status: "pending" });
    const rows = Array.isArray(inviteList) ? inviteList : inviteList.data;
    for (const invite of rows) {
      const role = parseStaffRole(invite.publicMetadata?.role);
      if (!role) continue;
      invites.push({
        id: invite.id,
        email: invite.emailAddress,
        role,
        createdAtLabel: new Date(invite.createdAt).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric"
        })
      });
    }
  } catch {
    // Invitations may be unavailable on some plans/permissions — degrade quietly.
  }

  return { members, invites };
}

/**
 * Add a member by email. If a Clerk account already exists, their role is set
 * immediately; otherwise an invitation is sent that applies the role on sign-up.
 */
export async function addOrInviteMember(opts: {
  actorRole: StaffRole;
  actorId: string;
  email: string;
  role: StaffRole;
  signUpUrl: string;
}): Promise<{ status: "updated" | "invited"; email: string }> {
  const email = opts.email.trim().toLowerCase();
  if (!email) {
    throw new Error("Enter an email address.");
  }
  if (!assignableRoles(opts.actorRole).includes(opts.role)) {
    throw new Error("You don't have permission to assign that role.");
  }

  const client = await clerkClient();
  const existing = (await client.users.getUserList({ emailAddress: [email], limit: 1 })).data[0];

  if (existing) {
    if (existing.id === opts.actorId) {
      throw new Error("You can't change your own role.");
    }
    const currentRole = parseStaffRole(existing.publicMetadata?.role);
    if (currentRole && !canManage(opts.actorRole, currentRole)) {
      throw new Error("You don't have permission to change that member.");
    }
    await client.users.updateUserMetadata(existing.id, { publicMetadata: { role: opts.role } });
    return { status: "updated", email };
  }

  await client.invitations.createInvitation({
    emailAddress: email,
    publicMetadata: { role: opts.role },
    redirectUrl: opts.signUpUrl,
    ignoreExisting: true
  });
  return { status: "invited", email };
}

export async function changeMemberRole(opts: {
  actorRole: StaffRole;
  actorId: string;
  userId: string;
  role: StaffRole;
}): Promise<void> {
  if (opts.userId === opts.actorId) {
    throw new Error("You can't change your own role.");
  }
  if (!assignableRoles(opts.actorRole).includes(opts.role)) {
    throw new Error("You don't have permission to assign that role.");
  }

  const client = await clerkClient();
  const user = await client.users.getUser(opts.userId);
  const currentRole = parseStaffRole(user.publicMetadata?.role);
  if (!currentRole || !canManage(opts.actorRole, currentRole)) {
    throw new Error("You don't have permission to change that member.");
  }

  await client.users.updateUserMetadata(opts.userId, { publicMetadata: { role: opts.role } });
}

export async function removeMember(opts: {
  actorRole: StaffRole;
  actorId: string;
  userId: string;
}): Promise<void> {
  if (opts.userId === opts.actorId) {
    throw new Error("You can't remove yourself.");
  }

  const client = await clerkClient();
  const user = await client.users.getUser(opts.userId);
  const currentRole = parseStaffRole(user.publicMetadata?.role);
  if (!currentRole || !canManage(opts.actorRole, currentRole)) {
    throw new Error("You don't have permission to remove that member.");
  }

  // Clearing the role (Clerk deletes a metadata key set to null) reverts them to
  // a normal client — it does not delete their account.
  await client.users.updateUserMetadata(opts.userId, { publicMetadata: { role: null } });
}

export async function revokeInvite(opts: {
  actorRole: StaffRole;
  invitationId: string;
}): Promise<void> {
  const client = await clerkClient();

  if (opts.actorRole !== "admin") {
    const inviteList = await client.invitations.getInvitationList({ status: "pending" });
    const rows = Array.isArray(inviteList) ? inviteList : inviteList.data;
    const invite = rows.find((i) => i.id === opts.invitationId);
    if (parseStaffRole(invite?.publicMetadata?.role) !== "employee") {
      throw new Error("You can only revoke employee invites.");
    }
  }

  await client.invitations.revokeInvitation(opts.invitationId);
}
