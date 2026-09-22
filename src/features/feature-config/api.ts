import { rpc } from "../../shared/lib/supabase";
import type { Action } from "../../shared/types/actions";
export const save = (
  _orgId: string,
  action: Extract<Action, { type: "feature" }>,
) => rpc("apply_action", { p_org: action.orgId, p_action: action });
