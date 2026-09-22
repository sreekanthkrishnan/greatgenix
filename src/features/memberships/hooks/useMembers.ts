import { useWorkspace } from "../../../app/providers/OrgContextProvider";
export function useMembers() {
  return useWorkspace().state.members;
}
