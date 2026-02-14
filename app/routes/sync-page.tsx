import type { Route } from "../routes/+types/sync-page";
import RequireLogin from "~/common/auth/RequireLogin.tsx";
import SyncTournamentList from "~/common/sync/SyncTournamentList.tsx";
import SyncStrategyAreas from "~/common/sync/SyncStrategyAreas.tsx";
import SyncMatchSchedule from "~/common/sync/SyncMatchSchedule.tsx";
import SyncEventTypes from "~/common/sync/SyncEventTypes.tsx";
import SyncSequenceTypes from "~/common/sync/SyncSequenceTypes.tsx";
import SyncQuickComments from "~/common/sync/SyncQuickComments.tsx";
import SyncTrackingData from "~/common/sync/SyncTrackingData.tsx";
import SyncDashboardData from "~/common/sync/SyncDashboardData.tsx";
import SyncNowButton from "~/common/sync/SyncNowButton.tsx";
import FrcSyncButton from "~/common/sync/FrcSyncButton.tsx";
import { useRole } from "~/common/storage/rbauth.ts";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Sync | 1310 Raven Eye" },
    {
      name: "description",
      content: "Sync with the server",
    },
  ];
}
const SyncPage = () => {
  const { isSuperuser } = useRole();

  return (
    <main>
      <RequireLogin>
        <h1>Sync Central</h1>
        <p>
          The following dashboard displays the sync status of your environment.
          Some actions happen in the background, while others need to be
          initiated by you.
        </p>
        <SyncNowButton />
        <h2>Manual Sync</h2>
        <SyncQuickComments />
        <SyncTrackingData />
        <h2>Background Sync</h2>
        <SyncTournamentList />
        <SyncStrategyAreas />
        <SyncMatchSchedule />
        <SyncEventTypes />
        <SyncSequenceTypes />
        <SyncDashboardData />
        {isSuperuser && (
          <>
            <h2>Force Sync with FRC</h2>
            <p>
              Forces RavenBrain to immediately re-sync with FRC, without waiting
              for the scheduled sync to run. Once complete, RavenEye will sync
              the updated data from RavenBrain.
            </p>
            <FrcSyncButton />
          </>
        )}
      </RequireLogin>
    </main>
  );
};

export default SyncPage;
