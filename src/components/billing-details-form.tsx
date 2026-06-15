"use client";

import { useActionState } from "react";
import { Check, Save } from "lucide-react";
import { updateBillingDetailsAction } from "@/app/settings/actions";
import type { BillingDetails } from "@/lib/order-backend";

const fieldClass =
  "w-full rounded-xl border border-line bg-paper px-4 py-3 outline-none transition focus:border-violet focus:ring-4 focus:ring-violet/15";

export function BillingDetailsForm({ details }: { details: BillingDetails }) {
  const [state, formAction, pending] = useActionState(updateBillingDetailsAction, null);

  return (
    <form action={formAction} className="mt-5 grid gap-4">
      <label className="block">
        <span className="mb-2 block text-sm font-black">Company / legal name</span>
        <input name="companyName" defaultValue={details.companyName} placeholder="Acme Inc." className={fieldClass} />
      </label>

      <label className="block">
        <span className="mb-2 block text-sm font-black">Billing address</span>
        <textarea
          name="billingAddress"
          defaultValue={details.billingAddress}
          placeholder={"123 Market St\nSan Francisco, CA 94103\nUnited States"}
          className={`min-h-28 ${fieldClass}`}
        />
      </label>

      <label className="block">
        <span className="mb-2 block text-sm font-black">Tax / VAT ID</span>
        <input name="taxId" defaultValue={details.taxId} placeholder="GB123456789" className={fieldClass} />
      </label>

      {state && !state.ok ? (
        <p className="rounded-xl bg-coral-soft px-4 py-3 text-sm font-bold text-coral-ink">{state.error}</p>
      ) : null}
      {state?.ok ? (
        <p className="inline-flex items-center gap-2 rounded-xl bg-mint/10 px-4 py-3 text-sm font-bold text-ink">
          <Check className="size-4 text-mint" />
          {state.message}
        </p>
      ) : null}

      <button
        disabled={pending}
        className="inline-flex w-fit items-center justify-center gap-2 rounded-full bg-ink px-5 py-3 text-sm font-black text-paper transition hover:-translate-y-0.5 hover:bg-violet disabled:cursor-not-allowed disabled:opacity-60"
      >
        <Save className="size-4" />
        {pending ? "Saving…" : "Save billing details"}
      </button>
    </form>
  );
}
