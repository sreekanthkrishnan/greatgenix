import { useCurrentOrg } from "./useCurrentOrg";
export function useEffectiveFeatures() {
  const org = useCurrentOrg();
  return org.features;
}
