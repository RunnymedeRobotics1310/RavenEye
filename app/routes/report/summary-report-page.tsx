import { useEffect, useState } from "react";
import { NavLink, useParams } from "react-router";
import RequireLogin from "~/common/auth/RequireLogin.tsx";
import {
  getTeamSummaryReport,
  getCustomTournamentStats,
} from "~/common/storage/rb.ts";
import { repository } from "~/common/storage/db.ts";
import { useTournamentList } from "~/common/storage/dbhooks.ts";
import Spinner from "~/common/Spinner.tsx";
import type {
  TeamReportComment,
  TeamReportRobotAlert,
  SequenceReportLink,
  DefenceNote,
  CustomTournamentStats,
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
  const [defenceNotes, setDefenceNotes] = useState<DefenceNote[] | null>(null);
  const [customStats, setCustomStats] = useState<CustomTournamentStats[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchCustomStats = async (team: number, useCache: boolean) => {
    if (useCache) {
      const cached = await repository.getCustomStatsCache(team);
      if (cached && Date.now() - cached.cachedAt < 24 * 60 * 60 * 1000) {
        setCustomStats(cached.stats);
        return;
      }
    }
    const resp = await getCustomTournamentStats(team);
    if (resp.success && resp.stats) {
      setCustomStats(resp.stats);
      await repository.putCustomStatsCache(team, resp.stats);
    }
  };

  useEffect(() => {
    if (!teamId) return;
    getTeamSummaryReport(Number(teamId))
      .then((resp) => {
        if (resp.success && resp.report) {
          setComments(resp.report.comments);
          setRobotAlerts(resp.report.robotAlerts);
          setSequenceLinks(resp.report.sequenceReportLinks);
          setDefenceNotes(resp.report.defenceNotes ?? []);
        } else {
          setError(resp.reason || "Failed to load team summary report");
        }
        setLoading(false);
      })
      .catch((e) => {
        setError(e.message);
        setLoading(false);
      });
    fetchCustomStats(Number(teamId), true).catch(() => {});
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
                <table className="mega-report-table chrono-table">
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
              <table className="mega-report-table chrono-table">
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

        {customStats.length > 0 && (
          <section className="card">
            <h2>
              Custom Tournament Sequence Stats{" "}
              <button
                className="btn-secondary"
                onClick={async () => {
                  const team = Number(teamId);
                  await repository.clearCustomStatsCache(team);
                  await fetchCustomStats(team, false);
                }}
              >
                Refresh
              </button>
            </h2>
            {[...customStats]
              .sort((a, b) => {
                const aIdx = allTournaments.findIndex(
                  (t) => t.id === a.tournamentId,
                );
                const bIdx = allTournaments.findIndex(
                  (t) => t.id === b.tournamentId,
                );
                return bIdx - aIdx;
              })
              .map((ts) => (
                <div key={ts.tournamentId}>
                  <h3>{tournamentName(ts.tournamentId)}</h3>
                  {ts.stats.length === 0 ? (
                    <p>No matching events for this tournament.</p>
                  ) : (
                    <div className="mega-report-table-wrapper">
                      <table className="mega-report-table">
                        <thead>
                          <tr>
                            <th>Event Type</th>
                            <th>Average Amount</th>
                          </tr>
                        </thead>
                        <tbody>
                          {ts.stats.map((s) => (
                            <tr key={s.eventType}>
                              <td>
                                Average amount per shot of {s.eventTypeName}
                              </td>
                              <td>{s.averageAmount.toFixed(2)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              ))}
          </section>
        )}

        {defenceNotes && defenceNotes.length > 0 && (
          <section className="card">
            <h2>Defence Strategy Notes</h2>
            {[...new Set(defenceNotes.map((n) => n.tournamentId))].map(
              (tid) => (
                <div key={tid}>
                  <h3>{tournamentName(tid)}</h3>
                  <div className="mega-report-table-wrapper">
                    <table className="mega-report-table chrono-table">
                      <thead>
                        <tr>
                          <th>Time</th>
                          <th>Scout</th>
                          <th>Match</th>
                          <th>Note</th>
                        </tr>
                      </thead>
                      <tbody>
                        {defenceNotes
                          .filter((n) => n.tournamentId === tid)
                          .map((n, i) => (
                            <tr key={i}>
                              <td>
                                {new Date(n.timestamp).toLocaleString()}
                              </td>
                              <td>{n.displayName}</td>
                              <td>{n.matchId}</td>
                              <td>{n.note}</td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ),
            )}
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
