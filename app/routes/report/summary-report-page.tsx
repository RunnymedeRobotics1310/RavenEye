import { useEffect, useState } from "react";
import { NavLink, useParams } from "react-router";
import RequireLogin from "~/common/auth/RequireLogin.tsx";
import { getTeamSummaryReport } from "~/common/storage/rb.ts";
import { useTournamentList } from "~/common/storage/dbhooks.ts";
import Spinner from "~/common/Spinner.tsx";
import type {
  TeamReportComment,
  TeamReportRobotAlert,
  SequenceReportLink,
} from "~/types/TeamSummaryReport.ts";

const SummaryReportPage = () => {
  const { teamId } = useParams<{ teamId: string }>();
  const { list: allTournaments } = useTournamentList();
  const [comments, setComments] = useState<TeamReportComment[] | null>(null);
  const [robotAlerts, setRobotAlerts] = useState<
    TeamReportRobotAlert[] | null
  >(null);
  const [sequenceLinks, setSequenceLinks] = useState<
    SequenceReportLink[] | null
  >(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!teamId) return;
    getTeamSummaryReport(Number(teamId))
      .then((resp) => {
        if (resp.success && resp.report) {
          setComments(resp.report.comments);
          setRobotAlerts(resp.report.robotAlerts);
          setSequenceLinks(resp.report.sequenceReportLinks);
        } else {
          setError(resp.reason || "Failed to load team summary report");
        }
        setLoading(false);
      })
      .catch((e) => {
        setError(e.message);
        setLoading(false);
      });
  }, [teamId]);

  const tournamentName = (id: string) => {
    const t = allTournaments.find((t) => t.id === id);
    return t ? t.name : id;
  };

  // Reverse chronological order for comments
  const sortedComments = comments
    ? [...comments].sort(
        (a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
      )
    : null;

  const compLinks = sequenceLinks
    ? sequenceLinks.filter((l) => !l.drill)
    : [];
  const drillLinks = sequenceLinks
    ? sequenceLinks.filter((l) => l.drill)
    : [];

  return (
    <main>
      <div className="page-header">
        <h1>Team Summary — Team {teamId}</h1>
        <p>
          <NavLink to="/report/summary">&larr; Back to Teams</NavLink>
        </p>
      </div>
      <RequireLogin>
        {loading && <Spinner />}
        {error && <p className="banner banner-warning">{error}</p>}

        {sortedComments && (
          <section className="card">
            <h2>Quick Comments</h2>
            {sortedComments.length === 0 ? (
              <p>No quick comments recorded for this team.</p>
            ) : (
              <div className="mega-report-table-wrapper">
                <table className="mega-report-table">
                  <thead>
                    <tr>
                      <th>Time</th>
                      <th>Scout</th>
                      <th>Comment</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedComments.map((c, i) => (
                      <tr key={i}>
                        <td>{new Date(c.timestamp).toLocaleString()}</td>
                        <td>{c.displayName}</td>
                        <td>{c.quickComment}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}

        {robotAlerts && robotAlerts.length > 0 && (
          <section className="card">
            <h2>Robot Alerts</h2>
            <div className="mega-report-table-wrapper">
              <table className="mega-report-table">
                <thead>
                  <tr>
                    <th>Time</th>
                    <th>Scout</th>
                    <th>Competition</th>
                    <th>Alert</th>
                  </tr>
                </thead>
                <tbody>
                  {robotAlerts.map((a, i) => (
                    <tr key={i}>
                      <td>{new Date(a.timestamp).toLocaleString()}</td>
                      <td>{a.displayName}</td>
                      <td>{tournamentName(a.tournamentId)}</td>
                      <td>{a.alert}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {compLinks.length > 0 && (
          <section className="card">
            <h2>Tournament Sequence Reports</h2>
            <ul className="nav-list">
              {compLinks.map((link) => (
                <li key={`${link.sequenceTypeCode}-${link.tournamentId}`}>
                  <NavLink
                    to={`/report/tournament/${link.sequenceTypeCode}/${teamId}/${link.tournamentId}`}
                    className="btn-secondary"
                  >
                    {link.sequenceTypeName} @ {tournamentName(link.tournamentId)}
                  </NavLink>
                </li>
              ))}
            </ul>
          </section>
        )}

        {drillLinks.length > 0 && (
          <section className="card">
            <h2>Drill Sequence Reports</h2>
            <ul className="nav-list">
              {drillLinks.map((link) => (
                <li key={`${link.sequenceTypeCode}-${link.tournamentId}`}>
                  <NavLink
                    to={`/report/drill/${link.sequenceTypeCode}/${link.tournamentId}`}
                    className="btn-secondary"
                  >
                    {link.sequenceTypeName} — {link.tournamentId}
                  </NavLink>
                </li>
              ))}
            </ul>
          </section>
        )}
      </RequireLogin>
    </main>
  );
};

export default SummaryReportPage;
