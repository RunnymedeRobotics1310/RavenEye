import { useTeamTournamentsSyncStatus } from "~/common/sync/sync.ts";
import SyncStatusLayout from "~/common/sync/SyncStatusLayout.tsx";

const SyncTeamTournaments = () => {
  const status = useTeamTournamentsSyncStatus();
  return <SyncStatusLayout status={status}></SyncStatusLayout>;
};

export default SyncTeamTournaments;
