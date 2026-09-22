import { database } from "../../shared/lib/supabase";
export async function loadAudit(orgId: string) {
  const { data, error } = await database()
    .from("audit_events")
    .select("id,action,createdAt")
    .eq("orgId", orgId)
    .order("createdAt", { ascending: false })
    .limit(30);
  if (error) throw error;
  return data as { id: number; action: string; createdAt: string }[];
}

import { rpc } from "../../shared/lib/supabase";
import type { Action } from "../../shared/types/actions";
export const save = (
  orgId: string,
  action: Extract<Action, { type: "report" }>,
) => rpc("apply_action", { p_org: orgId, p_action: action });
