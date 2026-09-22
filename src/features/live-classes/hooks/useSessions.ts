import { useScope } from "../../../shared/hooks/useScope";
export function useSessions() {
  return useScope().sessions;
}
