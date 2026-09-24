import { Link } from "react-router-dom";
import { useWorkspace } from "../../../app/providers/OrgContextProvider";
import { FeatureList } from "../../billing/shared";
export function FeatureSettings() {
  const { state, viewer } = useWorkspace();
  const org = state.orgs.find((o) => o.id === viewer.orgId)!;
  return (
    <section className="panel">
      <h2>Subscription features</h2>
      <p className="muted">
        Features come from your active plan and coupon automatically.
      </p>
      <FeatureList features={org.features} />
      <Link className="button secondary" to="/subscription">
        Manage subscription
      </Link>
    </section>
  );
}
