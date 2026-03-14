export interface NexusAnnouncement {
  content: string;
}

export interface NexusQueueStatus {
  nowQueuing: string | null;
  teamStatus: string | null;
  teamMatchLabel: string | null;
  teamAlliance: string | null;
  estimatedQueueTime: number | null;
  estimatedStartTime: number | null;
  announcements: NexusAnnouncement[];
}
