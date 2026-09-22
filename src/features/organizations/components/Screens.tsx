import { Plus } from "lucide-react";
import { useState } from "react";
import { useWorkspace } from "../../../app/providers/OrgContextProvider";
import {
  Badge,
  Button,
  Notice,
  PageHeading,
  Unavailable,
} from "../../../shared/components";
import { ActionForm } from "../../../shared/components/ActionForm";
import { featureLabels, type Feature } from "../../../shared/types";

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
        summary={[{ value: state.orgs.length, label: "organizations" }, { value: state.orgs.filter(o => o.active).length, label: "active" }]}
        eyebrow="YOUR PLATFORM SPACE"
        title="Organizations"
        description="Manage organizations, platform access and available features."
        action={
          <Button onClick={() => setForm(true)}>
            <Plus size={17} />
            Create organization
          </Button>
        }
      />
      <Notice>
        Platform administrators can manage organization status and features.
        Educational records remain scoped to organization membership.
      </Notice>
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
                  {Object.values(o.features).filter(Boolean).length} enabled
                  features
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
              {org.active ? "Active" : "Suspended"}
            </Badge>
          </div>
          <h3>Organization features</h3>
          <p className="muted">Feature changes apply to this organization.</p>
          {(Object.entries(featureLabels) as [Feature, string][]).map(
            ([key, label]) => (
              <div className="setting-row" key={key}>
                <span>{label}</span>
                <button
                  className={`toggle ${org.features[key] ? "on" : ""}`}
                  role="switch"
                  aria-checked={org.features[key]}
                  aria-label={`${label} for ${org.name}`}
                  onClick={() =>
                    act(
                      {
                        type: "feature",
                        orgId: org.id,
                        feature: key,
                        enabled: !org.features[key],
                      },
                      `${label} changed for ${org.name} in the only.`,
                    )
                  }
                >
                  <span />
                </button>
              </div>
            ),
          )}
          <p className="fine-print">
            Disabling a feature hides its views; existing records are preserved.
            No subscription or billing change occurs.
          </p>
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
      {form && <ActionForm kind="organization" close={() => setForm(false)} />}
    </>
  );
}
