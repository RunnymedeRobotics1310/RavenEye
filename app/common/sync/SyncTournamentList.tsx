import { useTournamentListSyncStatus } from "~/common/sync/sync.ts";
import SyncStatusLayout from "~/common/sync/SyncStatusLayout.tsx";

const SyncTournamentList = () => {
  const status = useTournamentListSyncStatus();
  return <SyncStatusLayout status={status}></SyncStatusLayout>;
};

export default SyncTournamentList;
