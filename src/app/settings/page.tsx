import { redirect } from "next/navigation";
import { currentUser } from "@clerk/nextjs/server";
import { Receipt, Shield, Users } from "lucide-react";
import { changeRoleAction, removeMemberAction, revokeInviteAction } from "@/app/settings/actions";
import { AddMemberForm } from "@/components/add-member-form";
import { BillingDetailsForm } from "@/components/billing-details-form";
import { DashboardShell } from "@/components/dashboard-shell";
import { canManageTeam, getRole } from "@/lib/auth";
import { getBillingDetails } from "@/lib/order-backend";
import { ROLE_LABEL, assignableRoles, canManage, type StaffRole } from "@/lib/roles";
import { getTeam } from "@/lib/team";

const roleTone: Record<StaffRole, string> = {
  admin: "bg-ink text-paper",
  "sub-admin": "bg-violet-soft text-violet-ink",
  employee: "bg-lime text-lime-ink"
};

function initials(name: string | null, email: string): string {
  const base = (name ?? email).trim();
  const parts = base.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return base.slice(0, 2).toUpperCase();
}

export default async function SettingsPage() {
  const user = await currentUser();
  if (!user) {
    redirect("/sign-in");
  }

  const [role, manage] = await Promise.all([getRole(), canManageTeam()]);
  const email = user.primaryEmailAddress?.emailAddress ?? user.emailAddresses[0]?.emailAddress ?? "";
  const name = user.fullName?.trim() || null;

  const roster = manage ? await getTeam(user.id) : null;
  const grantable = role ? assignableRoles(role) : [];
  // Clients (no staff role) manage the billing details that appear on their invoices.
  const billing = role ? null : await getBillingDetails();

  return (
    <DashboardShell>
      <section className="rounded-3xl border border-line bg-card p-6 shadow-card lg:p-8">
        <p className="font-mono text-xs font-bold uppercase tracking-[0.16em] text-muted">Account</p>
        <div className="mt-4 flex items-center gap-4">
          <span className="grid size-16 shrink-0 place-items-center rounded-2xl bg-violet-soft font-display text-xl font-black text-violet">
            {initials(name, email)}
          </span>
          <div className="min-w-0">
            <h1 className="truncate font-display text-3xl font-black tracking-tight">{name ?? "Your account"}</h1>
            <p className="truncate text-muted">{email}</p>
          </div>
          <span
            className={`ml-auto shrink-0 rounded-full px-3 py-1 text-sm font-black ${
              role ? roleTone[role] : "bg-paper-2 text-muted"
            }`}
          >
            {role ? ROLE_LABEL[role] : "Client"}
          </span>
        </div>
        <p className="mt-4 text-sm text-muted">
          Manage your profile, email, and password from the account menu (your avatar, top right).
        </p>
      </section>

      {billing ? (
        <section className="mt-6 rounded-3xl border border-line bg-card p-6 shadow-card lg:p-8">
          <div className="flex items-center gap-2">
            <Receipt className="size-5 text-violet" />
            <h2 className="font-display text-2xl font-black tracking-tight">Billing details</h2>
          </div>
          <p className="mt-1 text-sm text-muted">
            Company name, address, and tax ID shown on your invoices. Leave blank to bill to your account email.
          </p>
          <BillingDetailsForm details={billing} />
        </section>
      ) : null}

      {manage && role && roster ? (
        <section className="mt-6 rounded-3xl border border-line bg-card p-6 shadow-card lg:p-8">
          <div className="flex items-center gap-2">
            <Users className="size-5 text-violet" />
            <h2 className="font-display text-2xl font-black tracking-tight">Team</h2>
          </div>
          <p className="mt-1 text-sm text-muted">
            {role === "admin"
              ? "Add and manage everyone who can run the dashboard — they can view and update every client's orders."
              : "Add and manage team member accounts — they can view and update every client's orders."}
          </p>

          <AddMemberForm roles={grantable} />

          <div className="mt-6 overflow-hidden rounded-2xl border border-line">
            {roster.members.map((member) => {
              const editable = role === "admin" && !member.isSelf;
              const removable = !member.isSelf && canManage(role, member.role);

              return (
                <div
                  key={member.id}
                  className="flex flex-wrap items-center gap-3 border-b border-line px-4 py-3 last:border-0"
                >
                  <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-paper-2 font-display text-sm font-black text-ink">
                    {initials(member.name, member.email)}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate font-bold">
                      {member.name ?? member.email}
                      {member.isSelf ? <span className="text-muted"> · You</span> : null}
                    </p>
                    {member.name ? <p className="truncate text-sm text-muted">{member.email}</p> : null}
                  </div>

                  <div className="ml-auto flex flex-wrap items-center gap-2">
                    {editable ? (
                      <form action={changeRoleAction} className="flex items-center gap-2">
                        <input type="hidden" name="userId" value={member.id} />
                        <select
                          name="role"
                          defaultValue={member.role}
                          className="rounded-xl border border-line bg-paper px-3 py-2 text-sm outline-none transition focus:border-violet focus:ring-4 focus:ring-violet/15"
                        >
                          {grantable.map((grant) => (
                            <option key={grant} value={grant}>
                              {ROLE_LABEL[grant]}
                            </option>
                          ))}
                        </select>
                        <button className="rounded-full border border-ink px-3 py-2 text-sm font-black text-ink transition hover:bg-ink hover:text-paper">
                          Update
                        </button>
                      </form>
                    ) : (
                      <span className={`rounded-full px-3 py-1 text-sm font-black ${roleTone[member.role]}`}>
                        {ROLE_LABEL[member.role]}
                      </span>
                    )}
                    {removable ? (
                      <form action={removeMemberAction}>
                        <input type="hidden" name="userId" value={member.id} />
                        <button className="rounded-full border border-line px-3 py-2 text-sm font-black text-muted transition hover:border-coral hover:text-coral-ink">
                          Remove
                        </button>
                      </form>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>

          {roster.invites.length > 0 ? (
            <div className="mt-6">
              <h3 className="font-display text-lg font-black tracking-tight">Pending invites</h3>
              <div className="mt-3 overflow-hidden rounded-2xl border border-dashed border-line">
                {roster.invites.map((invite) => {
                  const canRevoke = role === "admin" || invite.role === "employee";
                  return (
                    <div
                      key={invite.id}
                      className="flex flex-wrap items-center gap-3 border-b border-line px-4 py-3 last:border-0"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-bold">{invite.email}</p>
                        <p className="text-sm text-muted">
                          Invited as {ROLE_LABEL[invite.role]} · {invite.createdAtLabel}
                        </p>
                      </div>
                      <span className="ml-auto rounded-full bg-coral-soft px-3 py-1 text-xs font-black text-coral-ink">
                        Pending
                      </span>
                      {canRevoke ? (
                        <form action={revokeInviteAction}>
                          <input type="hidden" name="invitationId" value={invite.id} />
                          <button className="rounded-full border border-line px-3 py-2 text-sm font-black text-muted transition hover:border-coral hover:text-coral-ink">
                            Revoke
                          </button>
                        </form>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : null}
        </section>
      ) : null}

      {role === "employee" ? (
        <section className="mt-6 flex items-center gap-3 rounded-3xl border border-line bg-card p-6 shadow-card">
          <Shield className="size-6 shrink-0 text-violet" />
          <p className="text-sm text-muted">
            You can view and update every client&apos;s order from the{" "}
            <span className="font-black text-ink">Orders</span> console. Team management is handled by an
            admin.
          </p>
        </section>
      ) : null}
    </DashboardShell>
  );
}
