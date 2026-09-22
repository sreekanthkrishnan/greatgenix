import { useWorkspace } from "../../../app/providers/OrgContextProvider";
export function useAttendance(sessionId: string) {
  return useWorkspace().state.attendance[sessionId] || {};
}
