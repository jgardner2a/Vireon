/**
 * Active home domain contract.
 *
 * READ:  user_state.current_home_id → getActiveHomeId(userId) only
 * WRITE: user_state.current_home_id → setCurrentHome(homeId) in lib/myHome.ts only
 *
 * Do not query user_state.current_home_id directly anywhere else.
 */

export const HOME_CONTRACT = {
  ACTIVE_HOME_READ: "getActiveHomeId",
  ACTIVE_HOME_WRITE: "setCurrentHome",
} as const;

/** Dev-only reminder — not enforcement at runtime. */
export function assertNoDirectHomeQuery(): void {
  if (process.env.NODE_ENV === "development") {
    console.warn(
      "[HOME CONTRACT] Do not query user_state.current_home_id directly. Use getActiveHomeId()."
    );
  }
}
