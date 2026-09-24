import { useState } from "react";
import { Badge, Button, Field, Notice } from "../../shared/components";
import type { Org } from "../../shared/types";
import {
  cancelSubscription,
  confirmPayment,
  money,
  reviewOrganization,
} from "./api";
import { FeatureList, useBilling } from "./shared";
export function OrganizationBilling({ org }: { org: Org }) {
  const billing = useBilling(org.id);
  const [note, setNote] = useState(org.review_note || "");
  return (
    <div className="billing-admin">
      <h3>Organization review</h3>
      <Badge tone={org.approval_status === "approved" ? "sage" : "peach"}>
        {org.approval_status || "approved"}
      </Badge>
      <Field label="Review note">
        <textarea
          rows={2}
          maxLength={2000}
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      </Field>
      <div className="billing-actions">
        <Button
          disabled={billing.saving || org.approval_status === "approved"}
          onClick={() =>
            billing.run(
              () => reviewOrganization(org.id, true, note),
              "Organization approved. A subscription is required before access starts.",
            )
          }
        >
          Approve organization
        </Button>
        <Button
          variant="secondary"
          disabled={billing.saving || org.approval_status === "rejected"}
          onClick={() =>
            billing.run(
              () => reviewOrganization(org.id, false, note),
              "Organization request rejected. Workspace access is blocked.",
            )
          }
        >
          Reject organization
        </Button>
      </div>
      <h3>Subscription & payment</h3>
      {billing.isPending && <p role="status">Loading subscriptions…</p>}
      {billing.isError && (
        <Notice>
          {billing.error.message}
          <Button onClick={() => billing.refetch()}>Try again</Button>
        </Notice>
      )}
      {!billing.data?.subscriptions.length &&
        !billing.isPending &&
        !billing.isError && (
          <p className="muted">No subscription requested yet.</p>
        )}
      {billing.data?.subscriptions.map((s) => (
        <section className="billing-payment" key={s.id}>
          <h4>
            {s.plan_name} · {money(s.total_minor, s.currency)}
          </h4>
          <Badge>
            {s.status === "active" &&
            s.ends_at &&
            new Date(s.ends_at) <= new Date()
              ? "Expired"
              : s.status.replaceAll("_", " ")}
          </Badge>
          <p>
            {s.duration_days} days
            {s.ends_at
              ? ` · Ends ${new Date(s.ends_at).toLocaleString()}`
              : " · Starts after payment confirmation"}
          </p>
          <FeatureList features={s.features} />
          {s.status === "pending_payment" && (
            <form
              className="form"
              onSubmit={(e) => {
                e.preventDefault();
                const f = new FormData(e.currentTarget);
                billing.run(
                  () => confirmPayment(s.id, String(f.get("reference"))),
                  "Payment confirmed. Subscription and features activated.",
                );
              }}
            >
              <Field label={`Payment reference for ${s.plan_name}`}>
                <input
                  name="reference"
                  required
                  maxLength={200}
                  placeholder="Verified bank transfer or receipt reference"
                />
              </Field>
              <Button
                disabled={
                  billing.saving ||
                  org.approval_status !== "approved" ||
                  !org.active
                }
              >
                Confirm received payment
              </Button>
            </form>
          )}
          {s.payment_reference && (
            <p>Payment reference: {s.payment_reference}</p>
          )}
          {s.status !== "cancelled" && (
            <Button
              variant="ghost"
              disabled={billing.saving}
              onClick={() => {
                if (
                  window.confirm(
                    "Cancel this subscription? Active workspace access will end immediately.",
                  )
                )
                  billing.run(
                    () => cancelSubscription(s.id),
                    "Subscription cancelled.",
                  );
              }}
            >
              Cancel subscription
            </Button>
          )}
        </section>
      ))}
      {billing.saveError && <p role="alert">{billing.saveError}</p>}
      <h3>Effective features</h3>
      <FeatureList features={org.features} />
    </div>
  );
}
