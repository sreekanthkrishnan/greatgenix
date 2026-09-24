import { OrganizationBilling } from "../../billing/OrganizationBilling";
import { Plus } from "lucide-react";
import { useState } from "react";
import { useWorkspace } from "../../../app/providers/OrgContextProvider";
import {
  Badge,
  Button,
  Empty,
  Notice,
  PageHeading,
  Unavailable,
} from "../../../shared/components";
import { ActionForm } from "../../../shared/components/ActionForm";

export function Organizations() {
  const { state, viewer, act } = useWorkspace();
  const [form, setForm] = useState(false);
  const [selected, setSelected] = useState(state.orgs[0]?.id || "genix");
  if (viewer.role !== "super-admin")
    return (
      <Unavailable
        title="Platform access is restricted"
        text="A platform administrator assignment is required for these controls."
      />
    );
  const org = state.orgs.find((o) => o.id === selected) || state.orgs[0];
  return (
    <>
      <PageHeading
        section="organizations"
        summary={[
          { value: state.orgs.length, label: "organizations" },
          { value: state.orgs.filter((o) => o.active).length, label: "active" },
        ]}
        eyebrow="YOUR PLATFORM SPACE"
        title="Organizations"
        description="Review organization requests, confirm payments and manage access."
        action={
          <Button onClick={() => setForm(true)}>
            <Plus size={17} />
            Create organization
          </Button>
        }
      />
      <Notice>
        Organizations need approval and an active subscription. Plan and coupon
        features are applied automatically.
      </Notice>
      {org ? (
        <div className="platform-grid">
          <div className="org-list">
            {state.orgs.map((o) => (
              <button
                key={o.id}
                className={`org-card ${org.id === o.id ? "active" : ""}`}
                onClick={() => setSelected(o.id)}
              >
                <span className="org-symbol">{o.name.charAt(0)}</span>
                <div>
                  <strong>{o.name}</strong>
                  <small>
                    {o.billing_status?.replaceAll("_", " ") ||
                      "Subscription required"}
                  </small>
                </div>
                <span className={`status-dot ${o.active ? "" : "off"}`} />
              </button>
            ))}
          </div>
          <section className="panel org-detail">
            <div className="section-heading">
              <h2>{org.name}</h2>
              <Badge tone={org.active ? "sage" : "peach"}>
                {org.billing_status?.replaceAll("_", " ") ||
                  (org.active ? "Active" : "Suspended")}
              </Badge>
            </div>
            <OrganizationBilling key={org.id} org={org} />
            <div className="org-status-action">
              <Button
                variant={org.active ? "secondary" : "primary"}
                onClick={() =>
                  act(
                    { type: "org-status", orgId: org.id },
                    `${org.name} ${org.active ? "suspended" : "restored"}.`,
                  )
                }
              >
                {org.active ? "Suspend organization" : "Restore organization"}
              </Button>
            </div>
          </section>
        </div>
      ) : (
        <Empty
          title="No organizations yet"
          text="Create an organization to get started."
        />
      )}
      {form && <ActionForm kind="organization" close={() => setForm(false)} />}
    </>
  );
}
