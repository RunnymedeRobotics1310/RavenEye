import { useEffect, useState } from "react";
import { NavLink } from "react-router";
import RequireLogin from "~/common/auth/RequireLogin.tsx";
import PmvaTournamentView from "~/common/components/pmva/PmvaTournamentView.tsx";
import { useOwnerTeam } from "~/common/hooks/useOwnerTeam.ts";
import Spinner from "~/common/Spinner.tsx";
import { getRobotPerformanceReport } from "~/common/storage/rb.ts";
import type { PmvaReport } from "~/types/PmvaReport.ts";

const RobotPerformancePage = () => {
  const [report, setReport] = useState<PmvaReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { teamNumber: ownerTeam } = useOwnerTeam();

  useEffect(() => {
    setLoading(true);
    getRobotPerformanceReport()
      .then((resp) => {
        if (resp.success && resp.report) {
          setReport(resp.report);
        } else {
          setError(resp.reason || "Failed to load Robot Performance report");
        }
        setLoading(false);
      })
      .catch((e) => {
        setError(e.message);
        setLoading(false);
      });
  }, []);

  const teamLabel = ownerTeam ?? report?.teamNumber ?? "";

  return (
    <main>
      <div className="page-header">
        <h1>
          Robot Performance Report
          {teamLabel ? ` — Team ${teamLabel}` : ""}
        </h1>
        <p>
          <NavLink to="/report">&larr; Back to Reports</NavLink>
        </p>
      </div>
      <RequireLogin>
        {loading && <Spinner />}
        {error && <p className="banner banner-warning">{error}</p>}
        {report && report.matchCount === 0 && (
          <p>No PMVA data recorded for the current season yet.</p>
        )}
        {report && report.matchCount > 0 && (
          <>
            <p>
              <strong>Matches analyzed:</strong> {report.matchCount}
              <span className="pmva-legend">
                {" "}
                (P = Practice, Q = Qualification, E = Elimination)
              </span>
            </p>

            <PmvaTournamentView report={report} showTournamentInLabels={true} />
          </>
        )}
      </RequireLogin>
    </main>
  );
};

export default RobotPerformancePage;
