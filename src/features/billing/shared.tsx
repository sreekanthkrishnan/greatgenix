import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Check } from "lucide-react";
import { useWorkspace } from "../../app/providers/OrgContextProvider";
import { featureLabels, type Feature } from "../../shared/types";
import { loadBilling, type Features } from "./api";
export function useBilling(orgId = "") {
  const { viewer, refresh, notify } = useWorkspace();
  const cache = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const query = useQuery({
    queryKey: ["billing", viewer.userId, viewer.role, orgId],
    queryFn: () => loadBilling(orgId, viewer.role === "super-admin"),
    refetchInterval: 30000,
  });
  async function run(operation: () => Promise<unknown>, message: string) {
    if (saving) return false;
    setSaving(true);
    setError("");
    try {
      await operation();
      await Promise.all([
        refresh(),
        cache.invalidateQueries({ queryKey: ["billing"] }),
      ]);
      notify(message);
      return true;
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Unable to save. Please try again.",
      );
      return false;
    } finally {
      setSaving(false);
    }
  }
  return { ...query, saving, saveError: error, setError, run };
}
export function FeatureList({ features }: { features: Features }) {
  const entries = Object.entries(featureLabels) as [Feature, string][];
  return (
    <ul className="billing-features">
      {entries
        .filter(([key]) => features[key])
        .map(([key, label]) => (
          <li key={key}>
            <Check size={15} />
            {label}
          </li>
        ))}
      {!entries.some(([key]) => features[key]) && (
        <li>No additional features</li>
      )}
    </ul>
  );
}
export function FeatureFields({
  features,
  onChange,
}: {
  features: Features;
  onChange: (features: Features) => void;
}) {
  return (
    <fieldset className="billing-feature-fields">
      <legend>Included features</legend>
      {(Object.entries(featureLabels) as [Feature, string][]).map(
        ([key, label]) => (
          <label className="checkbox-row" key={key}>
            <input
              type="checkbox"
              checked={Boolean(features[key])}
              onChange={(e) =>
                onChange({
                  ...features,
                  [key]: e.target.checked,
                  ...(key === "attendance" && e.target.checked
                    ? { live: true }
                    : {}),
                  ...(key === "live" && !e.target.checked
                    ? { attendance: false }
                    : {}),
                })
              }
            />
            {label}
          </label>
        ),
      )}
    </fieldset>
  );
}
