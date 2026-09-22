import { useWorkspace } from "../../app/providers/OrgContextProvider";
export function useCurrentOrg() {
  const { state, viewer } = useWorkspace();
  return state.orgs.find((o) => o.id === viewer.orgId)!;
}
