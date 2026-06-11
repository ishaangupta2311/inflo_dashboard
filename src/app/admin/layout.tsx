import { redirect } from "next/navigation";
import { isStaff } from "@/lib/auth";

// Gates every /admin route. Non-admins (and signed-out users, already caught by
// middleware) are bounced to their client dashboard.
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  if (!(await isStaff())) {
    redirect("/orders");
  }

  return <>{children}</>;
}
