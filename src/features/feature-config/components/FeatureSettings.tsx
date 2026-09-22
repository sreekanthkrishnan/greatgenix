import { useWorkspace } from "../../../app/providers/OrgContextProvider";
import { featureLabels, type Feature } from "../../../shared/types";
export function FeatureSettings() {
  const { state, viewer, act, busy } = useWorkspace();
  const org = state.orgs.find((o) => o.id === viewer.orgId)!;
  return (
    <section className="panel">
      <h2>Enabled features</h2>
      <p className="muted">
        Choose the tools your organization needs. Disabling a feature preserves
        its records.
      </p>
      {(Object.entries(featureLabels) as [Feature, string][]).map(
        ([key, label]) => (
          <div className="setting-row" key={key}>
            <span>{label}</span>
            <button
              disabled={busy}
              className={`toggle ${org.features[key] ? "on" : ""}`}
              role="switch"
              aria-checked={org.features[key]}
              aria-label={label}
              onClick={() =>
                act({
                  type: "feature",
                  orgId: org.id,
                  feature: key,
                  enabled: !org.features[key],
                })
              }
            >
              <span />
            </button>
          </div>
        ),
      )}
      <p className="fine-print">
        Attendance requires live classes. These settings do not create
        subscription charges.
      </p>
    </section>
  );
}
