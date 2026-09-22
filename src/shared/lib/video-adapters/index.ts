import { database } from "../supabase";
export interface MediaGateway {
  getPlayback(lessonId: string): Promise<{ url: string; expiresAt: string }>;
  joinSession(sessionId: string): Promise<{ roomUrl: string; token: string }>;
  authorizeUpload(lessonId: string): Promise<{ uploadUrl: string }>;
}
async function invoke<T>(
  name: string,
  body: Record<string, unknown>,
): Promise<T> {
  const { data, error } = await database().functions.invoke(name, { body });
  if (error) {
    let message = error.message;
    try {
      const detail = await error.context?.json();
      if (detail?.error) message = detail.error;
    } catch {}
    throw new Error(message);
  }
  return data as T;
}
export const mediaGateway: MediaGateway = {
  getPlayback: (lessonId) => invoke("playback-token-issue", { lessonId }),
  joinSession: (sessionId) => invoke("live-token-issue", { sessionId }),
  authorizeUpload: (lessonId) => invoke("video-upload-authorize", { lessonId }),
};
