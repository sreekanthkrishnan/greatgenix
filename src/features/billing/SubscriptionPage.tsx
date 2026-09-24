import { useState } from "react";
import { useWorkspace } from "../../app/providers/OrgContextProvider";
import {
  Badge,
  Button,
  Field,
  Notice,
  PageHeading,
} from "../../shared/components";
import {
  cancelSubscription,
  money,
  quoteSubscription,
  requestSubscription,
  type Quote,
} from "./api";
import { FeatureList, useBilling } from "./shared";

export function SubscriptionPage() {
  const { state, viewer } = useWorkspace();
  const org = state.orgs.find((o) => o.id === viewer.orgId)!;
  const admin = viewer.role === "teacher-admin";
  const billing = useBilling(admin ? org.id : "");
  const [plan, setPlan] = useState("");
  const [code, setCode] = useState("");
  const [quote, setQuote] = useState<Quote>();
  const [quoting, setQuoting] = useState(false);
  const [quoteError, setQuoteError] = useState("");
  const approval = org.approval_status || "approved";
  const current = billing.data?.subscriptions.find(
    (s) =>
      s.status === "pending_payment" ||
      (s.status === "active" &&
        s.ends_at &&
        new Date(s.ends_at).getTime() > Date.now()),
  );
  const allowed = admin && approval === "approved" && org.active;
  async function preview() {
    setQuoting(true);
    setQuote(undefined);
    setQuoteError("");
    try {
      setQuote(await quoteSubscription(org.id, plan, code));
    } catch (e) {
      setQuoteError((e as Error).message);
    } finally {
      setQuoting(false);
    }
  }
  return (
    <>
      <PageHeading
        section="organizations"
        eyebrow="ORGANIZATION ACCESS"
        title="Subscription & approval"
        description="Review your organization’s approval, subscription and included features."
      />
      <section className="panel billing-status">
        <Badge tone={approval === "approved" ? "sage" : "peach"}>
          {approval === "pending" ? "Awaiting review" : approval}
        </Badge>
        <h2>{org.name}</h2>
        {!org.active ? (
          <Notice>
            This organization is suspended. Contact the platform administrator.
          </Notice>
        ) : approval === "pending" ? (
          <Notice>
            Your request is awaiting platform administrator review. You can
            choose a subscription after approval.
          </Notice>
        ) : approval === "rejected" ? (
          <Notice>
            Your request was not approved. Contact the platform administrator to
            discuss the review.
          </Notice>
        ) : (
          <p className="muted">
            An active subscription is required to use the workspace. Features
            are included automatically from your plan and coupon.
          </p>
        )}
        {org.review_note && (
          <p>
            <strong>Review note:</strong> {org.review_note}
          </p>
        )}
        {!admin && (
          <Notice>
            Your organization administrator manages approval and payment.
            Contact them to restore workspace access.
          </Notice>
        )}
      </section>
      {admin && (
        <>
          {billing.isPending && <p role="status">Loading subscriptions…</p>}
          {billing.isError && (
            <Notice>
              {billing.error?.message || "Unable to load subscriptions."}
              <Button onClick={() => billing.refetch()}>Try again</Button>
            </Notice>
          )}
          {billing.saveError && <p role="alert">{billing.saveError}</p>}
          {current ? (
            <section className="panel billing-status">
              <Badge>
                {current.status === "active"
                  ? "Active subscription"
                  : "Awaiting payment confirmation"}
              </Badge>
              <h2>{current.plan_name}</h2>
              <p>
                {money(current.total_minor, current.currency)} ·{" "}
                {current.duration_days} days
              </p>
              <FeatureList features={current.features} />
              {current.status === "active" ? (
                <p>
                  Access until {new Date(current.ends_at!).toLocaleString()}.
                </p>
              ) : (
                <>
                  <Notice>
                    Arrange payment of{" "}
                    {money(current.total_minor, current.currency)} with the
                    platform administrator. Your subscription starts when they
                    verify the payment. This request does not charge your
                    account.
                  </Notice>
                  <Button
                    variant="secondary"
                    disabled={billing.saving}
                    onClick={() =>
                      billing.run(
                        () => cancelSubscription(current.id),
                        "Payment request cancelled.",
                      )
                    }
                  >
                    Cancel payment request
                  </Button>
                </>
              )}
            </section>
          ) : (
            allowed &&
            !billing.isPending &&
            !billing.isError && (
              <>
                <h2>Choose a plan</h2>
                <div className="billing-plan-grid">
                  {billing.data?.plans
                    .filter((p) => p.active)
                    .map((p) => (
                      <button
                        key={p.id}
                        className={`panel billing-plan ${plan === p.id ? "selected" : ""}`}
                        aria-pressed={plan === p.id}
                        disabled={quoting || billing.saving}
                        onClick={() => {
                          setPlan(p.id);
                          setQuote(undefined);
                          setQuoteError("");
                        }}
                      >
                        <h3>{p.name}</h3>
                        <strong>{money(p.price_minor, p.currency)}</strong>
                        <p>{p.duration_days} days of access</p>
                        <FeatureList features={p.features} />
                      </button>
                    ))}
                </div>
                {!billing.data?.plans.some((p) => p.active) && (
                  <Notice>
                    No plans are available yet. Contact the platform
                    administrator.
                  </Notice>
                )}
                {plan && (
                  <section className="panel billing-checkout">
                    <h2>Review your subscription</h2>
                    <Field label="Coupon code (optional)">
                      <input
                        value={code}
                        maxLength={40}
                        disabled={quoting || billing.saving}
                        onChange={(e) => {
                          setCode(e.target.value.toUpperCase());
                          setQuote(undefined);
                          setQuoteError("");
                        }}
                      />
                    </Field>
                    <Button
                      variant="secondary"
                      disabled={quoting || billing.saving}
                      onClick={preview}
                    >
                      {quoting ? "Checking…" : "Validate and preview"}
                    </Button>
                    {quoteError && <p role="alert">{quoteError}</p>}
                    {quote && (
                      <div className="billing-quote">
                        <p>
                          Plan price: {money(quote.price_minor, quote.currency)}
                        </p>
                        <p>
                          Discount:{" "}
                          {money(
                            quote.price_minor - quote.total_minor,
                            quote.currency,
                          )}
                        </p>
                        <h3>
                          Total: {money(quote.total_minor, quote.currency)}
                        </h3>
                        <p>
                          {quote.duration_days} days · features included below
                        </p>
                        <FeatureList features={quote.features} />
                        <Button
                          disabled={billing.saving}
                          onClick={() =>
                            billing.run(
                              () => requestSubscription(org.id, plan, code),
                              quote.total_minor === 0
                                ? "Subscription activated."
                                : "Payment request sent for confirmation.",
                            )
                          }
                        >
                          {billing.saving
                            ? "Saving…"
                            : quote.total_minor === 0
                              ? "Activate subscription"
                              : "Request payment confirmation"}
                        </Button>
                      </div>
                    )}
                  </section>
                )}
              </>
            )
          )}
        </>
      )}
    </>
  );
}
