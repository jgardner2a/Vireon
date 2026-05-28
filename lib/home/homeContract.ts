/**
 * Active home domain contract.
 *
 * READ:  user_state.current_home_id → getActiveHomeId(userId) only
 * WRITE (user selects home): setCurrentHome(homeId) in lib/myHome.ts only
 * WRITE (invalid pointer cleanup): reconcileDashboardHome in lib/dashboard/dashboardOrchestrator.ts only
 *
 * Do not query or update user_state.current_home_id directly anywhere else.
 */

export const HOME_CONTRACT = {
  ACTIVE_HOME_READ: "getActiveHomeId",
  ACTIVE_HOME_WRITE: "setCurrentHome",
  ACTIVE_HOME_CLEAR_INVALID: "reconcileDashboardHome",
} as const;

/** Dev-only reminder — not enforcement at runtime. */
export function assertNoDirectHomeQuery(): void {
  if (process.env.NODE_ENV === "development") {
    console.warn(
      "[HOME CONTRACT] Do not query user_state.current_home_id directly. Use getActiveHomeId()."
    );
  }
}
