import type { Home } from "./myHome";

/*
HOME CONTEXT CONTRACT:

- A user has exactly ONE active home at any time
- Active home is defined by user_state.current_home_id
- All features MUST derive home context from this contract only
*/

/*
All /dashboard pages MUST derive home context via homeContext helpers.
No page should directly compute home filtering logic independently.
*/

export type UserHomeState = {
  current_home_id: string | null;
};

function resolveCurrentHomeId(
  userState: UserHomeState | string | null
): string | null {
  if (userState === null) {
    return null;
  }
  if (typeof userState === "string") {
    return userState.trim() || null;
  }
  const id = userState.current_home_id?.trim() ?? "";
  return id || null;
}

/** Active home: homes.find(h => h.id === user_state.current_home_id) */
export function getCurrentHome(
  homes: Home[],
  userState: UserHomeState | string | null
): Home | null {
  const currentHomeId = resolveCurrentHomeId(userState);
  if (!currentHomeId) {
    return null;
  }
  return homes.find((h) => h.id === currentHomeId) ?? null;
}

/** Single entry point for current home from raw lists. */
export function resolveHomeContext(
  homes: Home[],
  userState: UserHomeState | string | null
): { currentHome: Home | null } {
  const currentHomeId = resolveCurrentHomeId(userState);
  return {
    currentHome: getCurrentHome(homes, currentHomeId),
  };
}
