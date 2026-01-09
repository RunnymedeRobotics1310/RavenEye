export interface SyncStatus {
  loading: boolean;
  component: string;
  lastSync: Date;
  inProgress: boolean;
  isComplete: boolean;
  remaining: number;
  error: Error | null;
}
