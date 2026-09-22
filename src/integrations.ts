import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// A boundary for future integration, deliberately not called by the demo UI.
// Environment values alone never switch this prototype to real data.
let client: SupabaseClient | undefined;
export function createConfiguredSupabaseClient() {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new Error('Supabase is not configured. The local demo remains available.');
  client ??= createClient(url, key);
  return client;
}
export interface MediaGateway {
  getPlayback(lessonId: string): Promise<{ url: string; expiresAt: string }>;
  joinSession(sessionId: string): Promise<{ roomUrl: string; token: string }>;
  authorizeUpload(lessonId: string): Promise<{ uploadUrl: string }>;
}
export const demoMedia: MediaGateway = {
  async getPlayback() { throw new Error('Recorded video is not connected. No video has been loaded or streamed.'); },
  async joinSession() { throw new Error('Live classes are not connected. No room was created and your camera and microphone were not accessed.'); },
  async authorizeUpload() { throw new Error('Video uploads are not connected. Only lesson metadata can be saved in this local demo.'); },
};
