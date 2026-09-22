import { access, handler } from "../_shared/http.ts";
import { ensureRoom } from "../_shared/daily.ts";
handler(async (request) => {
  const { sessionId } = await request.json();
  const { data } = await access(request, sessionId, "host");
  const room = await ensureRoom(sessionId, data.exp);
  return { roomUrl: room.url };
});
