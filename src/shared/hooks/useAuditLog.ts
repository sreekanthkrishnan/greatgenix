import { useQuery } from "@tanstack/react-query";
import { loadAudit } from "../../features/reports/api";
import { useCurrentOrg } from "./useCurrentOrg";
export function useAuditLog() {
  const org = useCurrentOrg();
  return useQuery({
    queryKey: ["audit", org.id],
    queryFn: () => loadAudit(org.id),
  });
}
