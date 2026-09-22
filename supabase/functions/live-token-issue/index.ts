import { access, handler } from "../_shared/http.ts";
import { createGoogleMeetLink } from "../_shared/gmeet.ts";

handler(async (request) => {
  const { sessionId } = await request.json();
  const { data } = await access(request, sessionId, "join");
  const meetingUrl = await createGoogleMeetLink("live-session");
  return { roomUrl: meetingUrl, token: "gmeet-active" };
});
