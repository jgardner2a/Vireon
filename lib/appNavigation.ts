/**
 * Top-level app routes: public home, Places, My Home workspace.
 * Use for sidebars, header, and login redirect defaults.
 */

export type AppTopNavItem = {
  href: string;
  label: string;
  /** Active only on exact pathname (required for `/`). */
  exact?: boolean;
};

export const APP_TOP_NAV_ITEMS: AppTopNavItem[] = [
  { href: "/", label: "Home", exact: true },
  { href: "/places", label: "Places" },
  { href: "/my-home", label: "My Home" },
];

export const ROUTE_HOME = "/";
export const ROUTE_PLACES = "/places";
export const ROUTE_MY_HOME = "/my-home";

/** Default post-auth destination for sign-in (workspace). */
export const DEFAULT_SIGN_IN_REDIRECT = ROUTE_MY_HOME;

/** Default post-auth destination for sign-up (public home). */
export const DEFAULT_SIGN_UP_REDIRECT = ROUTE_HOME;

export function isAppNavActive(
  pathname: string,
  href: string,
  exact?: boolean
): boolean {
  if (exact || href === ROUTE_HOME) {
    return pathname === href;
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function loginHref(redirectPath: string, options?: { signup?: boolean }): string {
  const redirect = encodeURIComponent(redirectPath);
  if (options?.signup) {
    return `/login?signup=1&redirect=${redirect}`;
  }
  return `/login?redirect=${redirect}`;
}

export function resolveSafeRedirectPath(raw: string | null, fallback: string): string {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) {
    return fallback;
  }
  return raw;
}
