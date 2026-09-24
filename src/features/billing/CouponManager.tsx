import { useState } from "react";
import { Plus } from "lucide-react";
import { useWorkspace } from "../../app/providers/OrgContextProvider";
import {
  Badge,
  Button,
  Field,
  Modal,
  Notice,
  PageHeading,
  Unavailable,
} from "../../shared/components";
import { saveCoupon, type Coupon, type Features } from "./api";
import { FeatureFields, FeatureList, useBilling } from "./shared";
const localInput = (iso?: string) => {
  const d = iso ? new Date(iso) : new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
};
export function CouponManager() {
  const { viewer, state } = useWorkspace();
  const billing = useBilling();
  const [edit, setEdit] = useState<Partial<Coupon> | null>(null);
  const [features, setFeatures] = useState<Features>({});
  if (viewer.role !== "super-admin")
    return (
      <Unavailable
        title="Platform administrator access required"
        text="Only platform administrators can manage coupons."
      />
    );
  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const ok = await billing.run(
      () =>
        saveCoupon({
          ...edit,
          code: String(f.get("code")).trim().toUpperCase(),
          plan_id: String(f.get("plan")) || null,
          org_id: String(f.get("org")) || null,
          percent_off: Number(f.get("discount")),
          bonus_features: features,
          starts_at: new Date(String(f.get("start"))).toISOString(),
          expires_at: new Date(String(f.get("end"))).toISOString(),
          max_redemptions: Number(f.get("limit")),
          active: f.get("active") === "on",
        }),
      "Coupon saved.",
    );
    if (ok) setEdit(null);
  }
  return (
    <>
      <PageHeading
        section="organizations"
        eyebrow="PLATFORM BILLING"
        title="Coupons"
        description="Offer discounts and extra features with expiry dates and redemption limits."
        action={
          <Button
            onClick={() => {
              setEdit({ active: true, percent_off: 0, max_redemptions: 1 });
              setFeatures({});
              billing.setError("");
            }}
          >
            <Plus size={16} />
            Create coupon
          </Button>
        }
      />
      <Notice>
        Codes apply once per organization. Pending payment requests reserve a
        redemption until cancelled. Extra features last for that subscription’s
        term. A 100% discount activates approved organizations without a payment
        review.
      </Notice>
      {billing.isPending && <p role="status">Loading coupons…</p>}
      {billing.isError && (
        <Notice>
          {billing.error.message}
          <Button onClick={() => billing.refetch()}>Try again</Button>
        </Notice>
      )}
      <div className="billing-plan-grid">
        {billing.data?.coupons.map((coupon) => (
          <section className="panel billing-plan" key={coupon.id}>
            <Badge
              tone={
                coupon.active && new Date(coupon.expires_at) > new Date()
                  ? "sage"
                  : "peach"
              }
            >
              {!coupon.active
                ? "Disabled"
                : new Date(coupon.expires_at) <= new Date()
                  ? "Expired"
                  : new Date(coupon.starts_at) > new Date()
                    ? "Scheduled"
                    : "Available"}
            </Badge>
            <h2>{coupon.code}</h2>
            <strong>{coupon.percent_off}% off</strong>
            <p>
              {coupon.org_id
                ? state.orgs.find((o) => o.id === coupon.org_id)?.name
                : "All organizations"}{" "}
              ·{" "}
              {coupon.plan_id
                ? billing.data?.plans.find((p) => p.id === coupon.plan_id)?.name
                : "All plans"}
            </p>
            <FeatureList features={coupon.bonus_features} />
            <p>Expires {new Date(coupon.expires_at).toLocaleString()}</p>
            <p>
              {
                billing.data?.subscriptions.filter(
                  (s) => s.coupon_id === coupon.id && s.status !== "cancelled",
                ).length
              }{" "}
              / {coupon.max_redemptions} redemptions
            </p>
            <Button
              variant="secondary"
              onClick={() => {
                setEdit(coupon);
                setFeatures(coupon.bonus_features);
                billing.setError("");
              }}
            >
              Edit {coupon.code}
            </Button>
          </section>
        ))}
      </div>
      {edit && (
        <Modal
          title={edit.id ? "Edit coupon" : "Create coupon"}
          close={() => !billing.saving && setEdit(null)}
        >
          <form className="form" onSubmit={save}>
            <fieldset className="profile-fields" disabled={billing.saving}>
              <Field label="Coupon code">
                <input
                  name="code"
                  required
                  minLength={3}
                  maxLength={40}
                  pattern="[A-Za-z0-9][A-Za-z0-9_-]{2,39}"
                  defaultValue={edit.code}
                />
              </Field>
              <Field label="Eligible plan">
                <select name="plan" defaultValue={edit.plan_id || ""}>
                  <option value="">All plans</option>
                  {billing.data?.plans.map((p) => (
                    <option value={p.id} key={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Eligible organization">
                <select name="org" defaultValue={edit.org_id || ""}>
                  <option value="">All organizations</option>
                  {state.orgs.map((o) => (
                    <option value={o.id} key={o.id}>
                      {o.name}
                    </option>
                  ))}
                </select>
              </Field>
              <div className="form-row">
                <Field label="Discount (%)">
                  <input
                    name="discount"
                    type="number"
                    min={0}
                    max={100}
                    required
                    defaultValue={edit.percent_off}
                  />
                </Field>
                <Field label="Redemption limit">
                  <input
                    name="limit"
                    type="number"
                    min={1}
                    max={1000000}
                    required
                    defaultValue={edit.max_redemptions}
                  />
                </Field>
              </div>
              <div className="form-row">
                <Field label="Valid from">
                  <input
                    name="start"
                    type="datetime-local"
                    required
                    defaultValue={localInput(edit.starts_at)}
                  />
                </Field>
                <Field label="Valid until">
                  <input
                    name="end"
                    type="datetime-local"
                    required
                    defaultValue={localInput(
                      edit.expires_at ||
                        new Date(Date.now() + 30 * 86400000).toISOString(),
                    )}
                  />
                </Field>
              </div>
              <p className="muted">
                Extra features are added to the selected plan automatically.
              </p>
              <FeatureFields features={features} onChange={setFeatures} />
              <label className="checkbox-row">
                <input
                  name="active"
                  type="checkbox"
                  defaultChecked={edit.active}
                />
                Coupon enabled
              </label>
              {billing.saveError && <p role="alert">{billing.saveError}</p>}
              <Button type="submit">
                {billing.saving ? "Saving…" : "Save coupon"}
              </Button>
            </fieldset>
          </form>
        </Modal>
      )}
    </>
  );
}
