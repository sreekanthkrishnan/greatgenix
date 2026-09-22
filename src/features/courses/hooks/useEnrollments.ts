import { useWorkspace } from "../../../app/providers/OrgContextProvider";
export function useEnrollments(courseId: string) {
  return (
    useWorkspace().state.courses.find((c) => c.id === courseId)?.studentIds ||
    []
  );
}
