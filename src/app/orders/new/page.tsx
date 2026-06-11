import { redirect } from "next/navigation";

// The brief-based order form has been replaced by the service store + cart.
export default function NewOrderPage() {
  redirect("/store");
}
