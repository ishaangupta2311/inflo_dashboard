"use client";

import { useActionState } from "react";
import { UserPlus } from "lucide-react";
import { addMemberAction, type TeamActionResult } from "@/app/settings/actions";
import { ROLE_LABEL, type StaffRole } from "@/lib/roles";

export function AddMemberForm({ roles }: { roles: StaffRole[] }) {
  const [state, action, pending] = useActionState<TeamActionResult | null, FormData>(
    addMemberAction,
    null
  );

  return (
    <form action={action} className="mt-5 grid gap-3 sm:grid-cols-[1fr_auto_auto] sm:items-end">
      <label className="block">
        <span className="mb-2 block text-sm font-black">Email</span>
        <input
          name="email"
          type="email"
          required
          placeholder="teammate@company.com"
          className="w-full rounded-xl border border-line bg-paper px-4 py-3 outline-none transition focus:border-violet focus:ring-4 focus:ring-violet/15"
        />
      </label>

      <label className="block">
        <span className="mb-2 block text-sm font-black">Role</span>
        <select
          name="role"
          defaultValue={roles[0]}
          className="w-full rounded-xl border border-line bg-paper px-4 py-3 outline-none transition focus:border-violet focus:ring-4 focus:ring-violet/15 sm:w-40"
        >
          {roles.map((role) => (
            <option key={role} value={role}>
              {ROLE_LABEL[role]}
            </option>
          ))}
        </select>
      </label>

      <button
        type="submit"
        disabled={pending}
        className="inline-flex items-center justify-center gap-2 rounded-full bg-ink px-5 py-3 text-sm font-black text-paper transition hover:-translate-y-0.5 hover:bg-violet disabled:opacity-60"
      >
        <UserPlus className="size-4" />
        {pending ? "Adding…" : "Add member"}
      </button>

      {state ? (
        <p
          className={`sm:col-span-3 text-sm font-bold ${
            state.ok ? "text-mint" : "text-coral-ink"
          }`}
        >
          {state.ok ? state.message : state.error}
        </p>
      ) : null}
    </form>
  );
}
