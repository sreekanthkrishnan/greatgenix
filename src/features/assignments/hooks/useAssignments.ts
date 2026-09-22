import { useWorkspace } from "../../../app/providers/OrgContextProvider";
export function useAssignments() {
  return useWorkspace().state.assignments;
}
