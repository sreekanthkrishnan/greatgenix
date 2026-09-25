import { database, rpc } from "../../shared/lib/supabase";
import type { Feature } from "../../shared/types";
export type Features = Partial<Record<Feature, boolean>>;
export type Plan = {
  id: string;
  name: string;
  price_minor: number;
  currency: string;
  duration_days: number;
  features: Features;
  active: boolean;
};
export type Coupon = {
  id: string;
  code: string;
  plan_id: string | null;
  org_id: string | null;
  percent_off: number;
  bonus_features: Features;
  starts_at: string;
  expires_at: string;
  max_redemptions: number;
  active: boolean;
};
export type Quote = {
  plan_id: string;
  plan_name: string;
  coupon_id: string | null;
  price_minor: number;
  total_minor: number;
  currency: string;
  duration_days: number;
  features: Features;
};
export type Subscription = Quote & {
  id: string;
  org_id: string;
  status: "pending_payment" | "active" | "cancelled";
  created_at: string;
  starts_at: string | null;
  ends_at: string | null;
  payment_reference: string;
};
export async function loadBilling(orgId: string, platform: boolean) {
  const subscriptions = database()
    .from("organization_subscriptions")
    .select("*")
    .order("created_at", { ascending: false });
  const results = await Promise.all([
    database().from("subscription_plans").select("*").order("name"),
    platform
      ? database()
          .from("subscription_coupons")
          .select("*")
          .order("created_at", { ascending: false })
      : Promise.resolve({ data: [], error: null }),
    orgId
      ? subscriptions.eq("org_id", orgId)
      : platform
        ? subscriptions
        : Promise.resolve({ data: [], error: null }),
  ]);
  for (const result of results)
    if (result.error) throw new Error(result.error.message);
  return {
    plans: results[0].data as Plan[],
    coupons: results[1].data as Coupon[],
    subscriptions: results[2].data as Subscription[],
  };
}
export const savePlan = (plan: Partial<Plan>) =>
  rpc("save_subscription_plan", { p_plan: plan });
export const saveCoupon = (coupon: Partial<Coupon>) =>
  rpc("save_subscription_coupon", { p_coupon: coupon });
export const reviewOrganization = (
  org: string,
  approved: boolean,
  note: string,
) =>
  rpc("review_organization", { p_org: org, p_approve: approved, p_note: note });
export const quoteSubscription = (org: string, plan: string, code: string) =>
  rpc<Quote>("quote_subscription", { p_org: org, p_plan: plan, p_code: code });
export const requestSubscription = (org: string, plan: string, code: string) =>
  rpc("request_subscription", { p_org: org, p_plan: plan, p_code: code });
export const confirmPayment = (subscription: string, reference: string) =>
  rpc("confirm_subscription_payment", {
    p_subscription: subscription,
    p_reference: reference,
  });
export const cancelSubscription = (subscription: string) =>
  rpc("cancel_subscription", { p_subscription: subscription });
export { money } from "../../shared/utils/money";
