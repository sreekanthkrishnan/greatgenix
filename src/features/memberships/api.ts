import { database, rpc } from "../../shared/lib/supabase";
export type Invitation = {
  id: string;
  email: string;
  role: string;
  expiresAt: string;
  acceptedAt: string | null;
  revoked: boolean;
};
export async function listInvitations(orgId: string) {
  const { data, error } = await database()
    .from("invitations")
    .select("id,email,role,expiresAt,acceptedAt,revoked")
    .eq("orgId", orgId);
  if (error) throw error;
  return data as Invitation[];
}
export const createInvitation = (
  orgId: string,
  email: string,
  name: string,
  role: string,
  courseId?: string,
) =>
  rpc<string>("create_invitation", {
    p_org: orgId,
    p_email: email,
    p_name: name,
    p_role: role,
    p_course: courseId || null,
  });
export const acceptInvitation = (token: string) =>
  rpc("accept_invitation", { p_token: token });
export const revokeInvitation = (id: string) =>
  rpc("revoke_invitation", { p_id: id });

import type { Action } from "../../shared/types/actions";
export const save = (
  orgId: string,
  action: Extract<Action, { type: "membership" }>,
) => rpc("apply_action", { p_org: orgId, p_action: action });
