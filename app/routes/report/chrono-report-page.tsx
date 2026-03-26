import { useEffect, useState } from "react";
import { NavLink, useParams } from "react-router";
import RequireLogin from "~/common/auth/RequireLogin.tsx";
import { getChronoReport } from "~/common/storage/rb.ts";
import Spinner from "~/common/Spinner.tsx";
import type { ChronoReportRow } from "~/types/ChronoReport.ts";

function formatTimestamp(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString();
}

const LEVEL_PREFIX: Record<string, string> = {
  Practice: "P",
  Qualification: "Q",
  Playoff: "E",
};

function matchLabel(level: string, matchId: number): string {
  return (LEVEL_PREFIX[level] ?? level.charAt(0)) + matchId;
}

const ChronoReportPage = () => {
  const { tournamentId, teamId } = useParams<{
    tournamentId: string;
    teamId: string;
  }>();
  const [rows, setRows] = useState<ChronoReportRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");

  useEffect(() => {
    if (!tournamentId || !teamId) return;
    setLoading(true);
    getChronoReport(tournamentId, Number(teamId), new Date().getFullYear())
      .then((resp) => {
        if (resp.success && resp.rows) {
          setRows(resp.rows);
        } else {
          setError(resp.reason || "Failed to load chronological event report");
        }
        setLoading(false);
      })
      .catch((e) => {
        setError(e.message);
        setLoading(false);
      });
  }, [tournamentId, teamId]);

  return (
    <main>
      <div className="page-header">
        <h1>
          Chronological Events — Team {teamId} @ {tournamentId}
        </h1>
        <p>
          <NavLink to={`/report/chrono/${tournamentId}`}>
            &larr; Back to Teams
          </NavLink>
        </p>
      </div>
      <RequireLogin>
        {loading && <Spinner />}
        {error && <p className="banner banner-warning">{error}</p>}
        {rows && rows.length === 0 && (
          <p>No event data found for this team at this tournament.</p>
        )}
        {rows && rows.length > 0 && (
          <section className="card">
            <p className="pmva-legend">
              P = Practice, Q = Qualification, E = Elimination
            </p>
            <div className="form-field">
              <label htmlFor="eventFilter">Filter by event type</label>
              <input
                id="eventFilter"
                type="text"
                placeholder="Type to filter..."
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
              />
            </div>
            <div className="mega-report-table-wrapper">
              <table className="mega-report-table chrono-table">
                <thead>
                  <tr>
                    <th>Timestamp</th>
                    <th>Match</th>
                    <th>Recorder</th>
                    <th>Event Type</th>
                    <th>Quantity</th>
                    <th>Note</th>
                  </tr>
                </thead>
                <tbody>
                  {rows
                    .filter((row) => {
                      if (!filter) return true;
                      const term = filter.toLowerCase();
                      return (
                        row.eventTypeName.toLowerCase().includes(term) ||
                        row.eventType.toLowerCase().includes(term)
                      );
                    })
                    .map((row, i) => (
                      <tr key={i}>
                        <td>{formatTimestamp(row.timestamp)}</td>
                        <td>{matchLabel(row.level, row.matchId)}</td>
                        <td>{row.recorder}</td>
                        <td>
                          {row.eventTypeName}
                          <br />
                          <code>{row.eventType}</code>
                        </td>
                        <td>{row.amount}</td>
                        <td>{row.note}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </RequireLogin>
    </main>
  );
};

export default ChronoReportPage;
