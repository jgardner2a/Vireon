"use client";

import Link from "next/link";
import { loginHref, ROUTE_DASHBOARD, ROUTE_PLANS } from "@/lib/appNavigation";
import { useAuthSession } from "@/lib/useAuthSession";

function usePublicAuthState() {
  const { isAuthenticated, isLoading } = useAuthSession();

  return {
    isAuthenticated,
    isLoading,
    showSignInPrompts: !isLoading && !isAuthenticated,
  };
}

export function HomeHeroAuthActions() {
  const { isLoading, showSignInPrompts } = usePublicAuthState();

  if (isLoading) {
    return null;
  }

  if (!showSignInPrompts) {
    return (
      <div className="vireon-home-cta-row">
        <Link href={ROUTE_DASHBOARD} className="vireon-home-btn-primary">
          Go to dashboard
        </Link>
        <Link href={ROUTE_PLANS} className="vireon-home-btn-secondary">
          View plans
        </Link>
      </div>
    );
  }

  return (
    <div className="vireon-home-cta-row">
      <Link
        href={loginHref(ROUTE_DASHBOARD, { signup: true })}
        className="vireon-home-btn-primary"
      >
        Create free account
      </Link>
      <Link
        href={loginHref(ROUTE_DASHBOARD)}
        className="vireon-home-btn-secondary"
      >
        Sign in
      </Link>
      <Link href={ROUTE_PLANS} className="vireon-home-btn-secondary">
        View plans
      </Link>
    </div>
  );
}

export function HomeFinalAuthActions() {
  const { isLoading, showSignInPrompts } = usePublicAuthState();

  if (isLoading) {
    return null;
  }

  if (!showSignInPrompts) {
    return (
      <div className="vireon-home-cta-row">
        <Link href={ROUTE_DASHBOARD} className="vireon-home-btn-primary">
          Go to dashboard
        </Link>
        <Link href={ROUTE_PLANS} className="vireon-home-btn-secondary">
          Compare plans
        </Link>
      </div>
    );
  }

  return (
    <div className="vireon-home-cta-row">
      <Link
        href={loginHref(ROUTE_DASHBOARD, { signup: true })}
        className="vireon-home-btn-primary"
      >
        Get started free
      </Link>
      <Link href={ROUTE_PLANS} className="vireon-home-btn-secondary">
        Compare plans
      </Link>
    </div>
  );
}

export function FooterAccessLinks() {
  const { isLoading, showSignInPrompts } = usePublicAuthState();

  if (isLoading) {
    return null;
  }

  if (!showSignInPrompts) {
    return (
      <ul className="vireon-global-footer__links">
        <li>
          <Link href={ROUTE_DASHBOARD} className="vireon-global-footer__link">
            Dashboard
          </Link>
        </li>
        <li>
          <Link href={ROUTE_PLANS} className="vireon-global-footer__link">
            Plans
          </Link>
        </li>
      </ul>
    );
  }

  return (
    <ul className="vireon-global-footer__links">
      <li>
        <Link
          href={loginHref(ROUTE_DASHBOARD)}
          className="vireon-global-footer__link"
        >
          Sign In
        </Link>
      </li>
      <li>
        <Link
          href={loginHref(ROUTE_DASHBOARD, { signup: true })}
          className="vireon-global-footer__link"
        >
          Get Started
        </Link>
      </li>
    </ul>
  );
}

export function PlansFreeCardActions() {
  const { isLoading, showSignInPrompts } = usePublicAuthState();

  if (isLoading) {
    return null;
  }

  if (!showSignInPrompts) {
    return (
      <Link
        href={ROUTE_DASHBOARD}
        className="vireon-plans-btn vireon-plans-btn--secondary"
      >
        Go to dashboard
      </Link>
    );
  }

  return (
    <>
      <Link
        href={loginHref(ROUTE_DASHBOARD, { signup: true })}
        className="vireon-plans-btn vireon-plans-btn--secondary"
      >
        Create free account
      </Link>
      <Link
        href={loginHref(ROUTE_DASHBOARD)}
        className="vireon-plans-btn vireon-plans-btn--secondary"
      >
        Sign in
      </Link>
    </>
  );
}
