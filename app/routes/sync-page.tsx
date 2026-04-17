import type { Route } from "../routes/+types/sync-page";
import RequireLogin from "~/common/auth/RequireLogin.tsx";
import SyncTournamentList from "~/common/sync/SyncTournamentList.tsx";
import SyncTeamTournaments from "~/common/sync/SyncTeamTournaments.tsx";
import SyncStrategyAreas from "~/common/sync/SyncStrategyAreas.tsx";
import SyncMatchSchedule from "~/common/sync/SyncMatchSchedule.tsx";
import SyncEventTypes from "~/common/sync/SyncEventTypes.tsx";
import SyncSequenceTypes from "~/common/sync/SyncSequenceTypes.tsx";
import SyncQuickComments from "~/common/sync/SyncQuickComments.tsx";
import SyncTrackingData from "~/common/sync/SyncTrackingData.tsx";
import SyncRobotAlerts from "~/common/sync/SyncRobotAlerts.tsx";
import SyncStrategyPlans from "~/common/sync/SyncStrategyPlans.tsx";
import SyncRobotAlertList from "~/common/sync/SyncRobotAlertList.tsx";
import SyncDashboardData from "~/common/sync/SyncDashboardData.tsx";
import SyncNowButton from "~/common/sync/SyncNowButton.tsx";
import SyncServerDataButton from "~/common/sync/SyncServerDataButton.tsx";
import FrcSyncButton from "~/common/sync/FrcSyncButton.tsx";
import ClearReportCacheButton from "~/common/ClearReportCacheButton.tsx";
import { useRole } from "~/common/storage/rbauth.ts";
import { useManualSyncStatus } from "~/common/sync/sync.ts";

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
  const { isAdmin, isSuperuser } = useRole();
  const manualStatus = useManualSyncStatus();

  return (
    <main>
      <RequireLogin>
        <div className="page-header">
          <h1>Sync Central</h1>
          <p>
            Sync status for your environment. Some actions happen in the
            background, others need to be initiated by you.
          </p>
        </div>
        <section className="card">
          <h2>
            My Tracking Data
            {manualStatus.remaining > 0 && (
              <span className="pending-badge">
                {manualStatus.remaining} pending
              </span>
            )}
          </h2>
          <SyncQuickComments />
          <SyncTrackingData />
          <SyncRobotAlerts />
          <SyncStrategyPlans />
          <SyncNowButton />
        </section>
        <section className="card">
          <h2>Team Data from Server</h2>
          <SyncTournamentList />
          <SyncTeamTournaments />
          <SyncStrategyAreas />
          <SyncMatchSchedule />
          <SyncEventTypes />
          <SyncSequenceTypes />
          <SyncRobotAlertList />
          {/* <SyncDashboardData /> — not yet implemented */}
          <SyncServerDataButton />
        </section>
        {isSuperuser && (
          <section className="card">
            <h2>Force Sync with FRC</h2>
            <p>
              Forces RavenBrain to immediately re-sync with FRC, without waiting
              for the scheduled sync to run. Once complete, RavenEye will sync
              the updated data from RavenBrain.
            </p>
            <FrcSyncButton />
          </section>
        )}
        {(isAdmin || isSuperuser) && (
          <section className="card">
            <h2>Report Cache</h2>
            <p>
              Clear the server-side report cache to force reports to regenerate
              with the latest data.
            </p>
            <ClearReportCacheButton />
          </section>
        )}
      </RequireLogin>
    </main>
  );
};

export default SyncPage;
