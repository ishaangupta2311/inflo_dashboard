import { AlertTriangle } from "lucide-react";

type DataUnavailableNoticeProps = {
  title?: string;
  message?: string;
};

export function DataUnavailableNotice({
  title = "Order data is temporarily unavailable",
  message = "You are signed in, but we could not load your order data right now. Please try again shortly."
}: DataUnavailableNoticeProps) {
  return (
    <div className="rounded-2xl border border-coral-soft bg-coral-soft/60 p-5 text-coral-ink shadow-card">
      <div className="flex gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-card text-coral-ink">
          <AlertTriangle className="size-5" />
        </span>
        <div>
          <p className="font-display text-lg font-black tracking-tight">{title}</p>
          <p className="mt-1 text-sm font-medium leading-6">{message}</p>
        </div>
      </div>
    </div>
  );
}
