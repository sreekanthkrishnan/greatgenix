import { handler, userClient } from "../_shared/http.ts";
handler(async (request) => {
  const { orgId, feature, enabled } = await request.json();
  const { client } = await userClient(request);
  const { error } = await client.rpc("apply_action", {
    p_org: orgId,
    p_action: { type: "feature", orgId, feature, enabled },
  });
  if (error) throw new Error(error.message);
  return { saved: true };
});
