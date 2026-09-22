import { useScope } from "../../../shared/hooks/useScope";
export function useLessons() {
  return useScope().lessons;
}
