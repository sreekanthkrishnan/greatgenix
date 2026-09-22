import { useWorkspace } from "../../../app/providers/OrgContextProvider";
import {
  Button,
  Field,
  PageHeading,
  Unavailable,
} from "../../../shared/components";
import { canAdmin } from "../../../shared/types";
import { FeatureSettings } from "../../feature-config/components/FeatureSettings";
import { Members } from "../../memberships/components/Members";
import { Reports } from "../../reports/components/Reports";
import { BrandingSettings } from "./BrandingSettings";
export function Settings() {
  const { state, viewer, act, busy, notify } = useWorkspace();
  const org = state.orgs.find((o) => o.id === viewer.orgId)!;
  if (!canAdmin(viewer.role))
    return (
      <Unavailable
        title="Organization administrator access required"
        text="Your administrator can assign organization management permissions."
      />
    );
  return (
    <>
      <PageHeading
        section="settings"
        summary={[
          {
            value: state.members.filter(
              (m) => m.orgId === viewer.orgId && m.active,
            ).length,
            label: "active members",
          },
          {
            value: Object.values(org.features).filter(Boolean).length,
            label: "enabled features",
          },
        ]}
        eyebrow="YOUR ORGANIZATION CONTROLS"
        title="Organization settings"
        description="Manage your organization’s members, appearance and enabled features."
      />
      <div className="settings-grid">
        <section className="panel">
          <h2>Organization profile</h2>
          <form
            className="form"
            onSubmit={async (e) => {
              e.preventDefault();
              await act({
                type: "rename",
                name: String(new FormData(e.currentTarget).get("name")),
              });
            }}
          >
            <Field label="Organization name">
              <input
                name="name"
                required
                defaultValue={org.name}
                maxLength={80}
              />
            </Field>
            <Field label="Organization link">
              <input
                readOnly
                value={`${location.origin}/?org=${org.slug}`}
                onFocus={(e) => e.target.select()}
              />
            </Field>
            <Button
              type="button"
              variant="secondary"
              onClick={() =>
                navigator.clipboard
                  .writeText(`${location.origin}/?org=${org.slug}`)
                  .then(() => notify("Organization link copied."))
                  .catch(() => notify("Select and copy the link above."))
              }
            >
              Copy organization link
            </Button>
            <Button disabled={busy} type="submit">
              Save profile
            </Button>
          </form>
        </section>
        <FeatureSettings />
      </div>
      <BrandingSettings />
      <Members />
      <Reports />
    </>
  );
}
