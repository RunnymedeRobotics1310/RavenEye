import { useEffect, useState } from "react";
import { NavLink, useParams } from "react-router";
import RequireLogin from "~/common/auth/RequireLogin.tsx";
import PmvaTournamentView from "~/common/components/pmva/PmvaTournamentView.tsx";
import { useSequenceTypeList } from "~/common/storage/dbhooks.ts";
import {
  getPmvaReport,
  getTournamentSequenceReport,
} from "~/common/storage/rb.ts";
import Spinner from "~/common/Spinner.tsx";
import type { TournamentSequenceReport } from "~/types/SequenceReport.ts";
import type { PmvaReport } from "~/types/PmvaReport.ts";

function RelatedReports({
  tournamentId,
  teamNumber,
}: {
  tournamentId: string;
  teamNumber: number;
}) {
  const currentYear = new Date().getFullYear();
  const { list: sequenceTypes } = useSequenceTypeList();
  const activeTypes = sequenceTypes.filter(
    (st) => !st.disabled && st.frcyear === currentYear,
  );

  return (
    <section className="card">
      <h2>Related Reports</h2>
      <ul className="nav-list">
        <li>
          <NavLink
            to={`/report/mega/${tournamentId}/${teamNumber}`}
            className="btn-secondary"
          >
            Mega Report
          </NavLink>
        </li>
        <li>
          <NavLink
            to={`/report/chrono/${tournamentId}/${teamNumber}`}
            className="btn-secondary"
          >
            Chronological Events
          </NavLink>
        </li>
      </ul>
      {activeTypes.length > 0 && (
        <>
          <h3>Cycle Reports</h3>
          {activeTypes.map((st) => (
            <SequenceTypeSummary
              key={st.id}
              code={st.code}
              id={st.id}
              name={st.name}
              teamNumber={teamNumber}
              tournamentId={tournamentId}
            />
          ))}
        </>
      )}
    </section>
  );
}

function msToSec(ms: number): string {
  return (ms / 1000).toFixed(2);
}

function SequenceTypeSummary({
  code,
  id,
  name,
  teamNumber,
  tournamentId,
}: {
  code: string;
  id: number;
  name: string;
  teamNumber: number;
  tournamentId: string;
}) {
  const [data, setData] = useState<TournamentSequenceReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    getTournamentSequenceReport(
      teamNumber,
      tournamentId,
      new Date().getFullYear(),
      id,
    )
      .then((resp) => {
        if (resp.success && resp.report) {
          setData(resp.report);
        }
        setLoading(false);
      })
      .catch(() => {
        setError(true);
        setLoading(false);
      });
  }, [teamNumber, tournamentId, id]);

  const seqCount = data?.aggregate?.sequences?.length ?? 0;
  const link = `/report/tournament/${code}/${teamNumber}/${tournamentId}`;

  return (
    <div className="pmva-seq-summary">
      <h3>{name}</h3>
      {loading && <Spinner />}
      {error && <p>Failed to load</p>}
      {!loading && !error && seqCount === 0 && <p>No data</p>}
      {!loading && !error && seqCount > 0 && data && (
        <>
          <table className="pmva-stats-table">
            <tbody>
              <tr>
                <td>Cycle</td>
                <td>{seqCount}</td>
              </tr>
              <tr>
                <td>Average</td>
                <td>{msToSec(data.aggregate.averageDuration)}s</td>
              </tr>
              <tr>
                <td>Fastest</td>
                <td>{msToSec(data.aggregate.fastestDuration)}s</td>
              </tr>
              <tr>
                <td>Slowest</td>
                <td>{msToSec(data.aggregate.slowestDuration)}s</td>
              </tr>
            </tbody>
          </table>
          <NavLink to={link} className="btn-secondary">
            View Details
          </NavLink>
        </>
      )}
    </div>
  );
}

const PmvaReportPage = () => {
  const { tournamentId } = useParams<{ tournamentId: string }>();
  const [report, setReport] = useState<PmvaReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!tournamentId) return;
    setLoading(true);
    getPmvaReport(tournamentId)
      .then((resp) => {
        if (resp.success && resp.report) {
          setReport(resp.report);
        } else {
          setError(resp.reason || "Failed to load PMVA report");
        }
        setLoading(false);
      })
      .catch((e) => {
        setError(e.message);
        setLoading(false);
      });
  }, [tournamentId]);

  return (
    <main>
      <div className="page-header">
        <h1>Post-Match Video Analysis Report — {tournamentId}</h1>
        <p>
          <NavLink to="/report/pmva">&larr; Back to Tournaments</NavLink>
        </p>
      </div>
      <RequireLogin>
        {loading && <Spinner />}
        {error && <p className="banner banner-warning">{error}</p>}
        {report && report.matchCount === 0 && (
          <p>No PMVA data recorded for this tournament.</p>
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

            <PmvaTournamentView report={report} />

            <RelatedReports
              tournamentId={tournamentId!}
              teamNumber={report.teamNumber}
            />
          </>
        )}
      </RequireLogin>
    </main>
  );
};

export default PmvaReportPage;
