import { useWorkspace } from "../../../app/providers/OrgContextProvider";
export function useReports() {
  return useWorkspace().state.reports;
}
