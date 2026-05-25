// Former redirect route (archived reference; app/dashboard/issues removed)

import { redirect } from "next/navigation";
import { ROUTE_DASHBOARD_MAINTENANCE } from "@/lib/appNavigation";

export default function IssuesRedirectPage() {
  redirect(ROUTE_DASHBOARD_MAINTENANCE);
}
