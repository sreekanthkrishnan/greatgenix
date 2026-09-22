// Shared Google Meet utility for edge functions

export async function createGoogleMeetLink(title: string): Promise<string> {
  const cleanTitle = title.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 9);
  const meetingCode = `${cleanTitle.slice(0, 3) || "ggx"}-${cleanTitle.slice(3, 6) || "mtg"}-${cleanTitle.slice(6, 9) || "live"}`;
  return `https://meet.google.com/${meetingCode}`;
}
