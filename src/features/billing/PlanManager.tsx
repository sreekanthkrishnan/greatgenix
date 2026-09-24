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
import { money, savePlan, type Plan, type Features } from "./api";
import { FeatureFields, FeatureList, useBilling } from "./shared";
export function PlanManager() {
  const { viewer } = useWorkspace();
  const billing = useBilling();
  const [edit, setEdit] = useState<Partial<Plan> | null>(null);
  const [features, setFeatures] = useState<Features>({});
  if (viewer.role !== "super-admin")
    return (
      <Unavailable
        title="Platform administrator access required"
        text="Only platform administrators can manage subscription plans."
      />
    );
  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const ok = await billing.run(
      () =>
        savePlan({
          ...edit,
          name: String(f.get("name")).trim(),
          price_minor: Math.round(Number(f.get("price")) * 100),
          currency: String(f.get("currency")),
          duration_days: Number(f.get("days")),
          features,
          active: f.get("active") === "on",
        }),
      "Plan saved. Existing subscriptions keep their agreed price and features.",
    );
    if (ok) setEdit(null);
  }
  return (
    <>
      <PageHeading
        section="organizations"
        eyebrow="PLATFORM BILLING"
        title="Subscription plans"
        description="Set pricing, duration and included features. Changes apply to future subscriptions."
        action={
          <Button
            onClick={() => {
              setEdit({
                active: true,
                currency: "INR",
                duration_days: 30,
                price_minor: 0,
              });
              setFeatures({});
              billing.setError("");
            }}
          >
            <Plus size={16} />
            Create plan
          </Button>
        }
      />
      {billing.isPending && <p role="status">Loading plans…</p>}
      {billing.isError && (
        <Notice>
          {billing.error.message}
          <Button onClick={() => billing.refetch()}>Try again</Button>
        </Notice>
      )}
      <div className="billing-plan-grid">
        {billing.data?.plans.map((plan) => (
          <section className="panel billing-plan" key={plan.id}>
            <Badge tone={plan.active ? "sage" : "peach"}>
              {plan.active ? "Available" : "Archived"}
            </Badge>
            <h2>{plan.name}</h2>
            <strong>{money(plan.price_minor, plan.currency)}</strong>
            <p>Every {plan.duration_days} days · manual renewal</p>
            <FeatureList features={plan.features} />
            <Button
              variant="secondary"
              onClick={() => {
                setEdit(plan);
                setFeatures(plan.features);
                billing.setError("");
              }}
            >
              Edit {plan.name}
            </Button>
          </section>
        ))}
      </div>
      {billing.data && !billing.data.plans.length && (
        <Notice>
          Create your first plan to let approved organizations subscribe.
        </Notice>
      )}
      {edit && (
        <Modal
          title={
            edit.id ? "Edit subscription plan" : "Create subscription plan"
          }
          close={() => !billing.saving && setEdit(null)}
        >
          <form className="form" onSubmit={save}>
            <fieldset className="profile-fields" disabled={billing.saving}>
              <Field label="Plan name">
                <input
                  name="name"
                  required
                  maxLength={80}
                  defaultValue={edit.name}
                />
              </Field>
              <div className="form-row">
                <Field label="Price">
                  <input
                    name="price"
                    required
                    type="number"
                    min={0}
                    max={1000000}
                    step="0.01"
                    defaultValue={(edit.price_minor || 0) / 100}
                  />
                </Field>
                <Field label="Currency">
                  <select name="currency" defaultValue={edit.currency}>
                    {["INR", "USD", "EUR", "GBP", "AUD", "CAD"].map((c) => (
                      <option key={c}>{c}</option>
                    ))}
                  </select>
                </Field>
              </div>
              <Field label="Subscription duration (days)">
                <input
                  name="days"
                  type="number"
                  required
                  min={1}
                  max={3660}
                  defaultValue={edit.duration_days}
                />
              </Field>
              <FeatureFields features={features} onChange={setFeatures} />
              <label className="checkbox-row">
                <input
                  name="active"
                  type="checkbox"
                  defaultChecked={edit.active}
                />
                Available for new subscriptions
              </label>
              {billing.saveError && <p role="alert">{billing.saveError}</p>}
              <Button type="submit">
                {billing.saving ? "Saving…" : "Save plan"}
              </Button>
            </fieldset>
          </form>
        </Modal>
      )}
    </>
  );
}
