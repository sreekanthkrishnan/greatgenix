// Google Meet (GMeet) Interactive Live Video Adapter interface and implementation

export interface GoogleMeetAdapter {
  createMeetingLink(orgId: string, title: string): Promise<{ meetingUrl: string; meetingCode: string }>;
}

export const gmeetAdapter: GoogleMeetAdapter = {
  async createMeetingLink(orgId, title) {
    console.log('[GoogleMeetAdapter] Generating Google Meet link:', { orgId, title });
    const cleanTitle = title.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 9);
    const meetingCode = `${cleanTitle.slice(0, 3)}-${cleanTitle.slice(3, 6) || 'ggx'}-${cleanTitle.slice(6, 9) || 'mtg'}`;
    const meetingUrl = `https://meet.google.com/${meetingCode}`;

    return {
      meetingUrl,
      meetingCode,
    };
  },
};
