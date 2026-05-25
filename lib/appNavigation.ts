/**

 * Top-level routes for header, footer, and login redirects.

 */



export type AppTopNavItem = {

  href: string;

  label: string;

  exact?: boolean;

};



export const APP_TOP_NAV_ITEMS: AppTopNavItem[] = [

  { href: "/", label: "Home", exact: true },

  { href: "/dashboard", label: "Dashboard" },

];



export const ROUTE_HOME = "/";

export const ROUTE_DASHBOARD = "/dashboard";

export const ROUTE_DASHBOARD_GALLERY = "/dashboard/gallery";

export const ROUTE_DASHBOARD_MAINTENANCE = "/dashboard/maintenance";

export const ROUTE_DASHBOARD_NOTES = "/dashboard/notes";

export const ROUTE_DASHBOARD_COMMUNICATIONS = "/dashboard/communications";

export const ROUTE_DASHBOARD_VAULT = "/dashboard/vault";

export const ROUTE_LOGIN = "/login";



export const DEFAULT_SIGN_IN_REDIRECT = ROUTE_DASHBOARD;

export const DEFAULT_SIGN_UP_REDIRECT = ROUTE_DASHBOARD;



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

