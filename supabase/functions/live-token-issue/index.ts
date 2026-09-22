import { access, handler } from "../_shared/http.ts";
import { daily, ensureRoom } from "../_shared/daily.ts";
handler(async (request) => {
  const { sessionId } = await request.json();
  const { data, user } = await access(request, sessionId, "join");
  const room = await ensureRoom(sessionId, data.exp);
  const { token } = await daily("meeting-tokens", {
    properties: {
      room_name: room.name,
      user_id: user.id,
      user_name: data.name,
      is_owner: data.owner,
      exp: data.exp,
      eject_at_token_exp: true,
    },
  });
  return { roomUrl: room.url, token };
});
