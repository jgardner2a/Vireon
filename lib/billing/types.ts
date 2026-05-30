export const PLAN_TIERS = ["free", "pro"] as const;

export type PlanTier = (typeof PLAN_TIERS)[number];

export function isPlanTier(value: string): value is PlanTier {
  return (PLAN_TIERS as readonly string[]).includes(value);
}

export type UserProfile = {
  id: string;
  plan: PlanTier;
  storage_bytes_used: number;
  export_credits: number;
  pro_included_export_used: boolean;
  stripe_customer_id: string | null;
  created_at: string;
  updated_at: string;
};

export type ExportEntitlementSource = "pro_included" | "purchase";

export type ExportEligibility =
  | {
      ok: true;
      source: ExportEntitlementSource;
    }
  | {
      ok: false;
      message: string;
    };

export type SubscriptionStatus =
  | "active"
  | "trialing"
  | "past_due"
  | "canceled"
  | "incomplete"
  | "incomplete_expired"
  | "unpaid";

export type UserSubscription = {
  id: string;
  user_id: string;
  plan: "pro";
  status: SubscriptionStatus;
  stripe_subscription_id: string | null;
  stripe_price_id: string | null;
  current_period_start: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  created_at: string;
  updated_at: string;
};
