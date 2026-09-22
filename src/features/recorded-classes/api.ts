import { rpc } from "../../shared/lib/supabase";
import type { Action } from "../../shared/types/actions";
export const save = (
  orgId: string,
  action: Extract<
    Action,
    {
      type:
        | "lesson"
        | "lesson-status"
        | "lesson-reference"
        | "remove-lesson-reference"
        | "complete"
        | "delete-lesson";
    }
  >,
) => rpc("apply_action", { p_org: orgId, p_action: action });
