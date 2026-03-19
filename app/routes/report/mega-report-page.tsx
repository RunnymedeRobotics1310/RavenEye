import { useEffect, useState } from "react";
import { NavLink, useParams } from "react-router";
import RequireLogin from "~/common/auth/RequireLogin.tsx";
import { getMegaReport } from "~/common/storage/rb.ts";
import Spinner from "~/common/Spinner.tsx";
import type { MegaReport } from "~/types/MegaReport.ts";

function formatValue(value: number, isQuantity: boolean): string {
  if (value === 0) return "—";
  if (isQuantity) {
    return Number.isInteger(value) ? String(value) : value.toFixed(1);
  }
  return String(value);
}

const LEVEL_ORDER: Record<string, number> = {
  Practice: 0,
  Qualification: 1,
  Playoff: 2,
};

const LEVEL_PREFIX: Record<string, string> = {
  Practice: "P",
  Qualification: "Q",
  Playoff: "E",
};

const MegaReportPage = () => {
  const { tournamentId, teamId } = useParams<{
    tournamentId: string;
    teamId: string;
  }>();
  const [report, setReport] = useState<MegaReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [compact, setCompact] = useState(true);

  useEffect(() => {
    if (!tournamentId || !teamId) return;
    setLoading(true);
    getMegaReport(tournamentId, Number(teamId), new Date().getFullYear())
      .then((resp) => {
        if (resp.success && resp.report) {
          setReport(resp.report);
        } else {
          setError(resp.reason || "Failed to load mega report");
        }
        setLoading(false);
      })
      .catch((e) => {
        setError(e.message);
        setLoading(false);
      });
  }, [tournamentId, teamId]);

  return (
    <main className="mega-report">
      <div className="page-header">
        <h1>
          Mega Report — Team {teamId} @ {tournamentId}
        </h1>
        <p>
          <NavLink to={`/report/mega/${tournamentId}`}>
            &larr; Back to Teams
          </NavLink>
        </p>
      </div>
      <RequireLogin>
        {loading && <Spinner />}
        {error && <p className="banner banner-warning">{error}</p>}
        {report && (!report.columns || report.columns.length === 0) && (
          <p>No event data found for this team at this tournament.</p>
        )}
        {report && report.columns && report.columns.length > 0 && (
          <section className="card">
            <div className="form-field">
              <label>
                <input
                  type="checkbox"
                  checked={compact}
                  onChange={(e) => setCompact(e.target.checked)}
                />{" "}
                Compact view
              </label>
            </div>
            <div className="mega-report-table-wrapper">
              <table className={`mega-report-table${compact ? " mega-report-compact" : ""}`}>
                <thead>
                  <tr>
                    <th>Match</th>
                    {report.columns.map((col) => (
                      <th key={col.eventtype}>
                        <div className="mega-report-header">
                          <span>{col.name}</span>
                          <code>{col.eventtype}</code>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[...report.rows]
                    .sort((a, b) => (LEVEL_ORDER[a.level] ?? 99) - (LEVEL_ORDER[b.level] ?? 99) || a.matchId - b.matchId)
                    .map((row) => (
                    <tr key={`${row.level}-${row.matchId}`}>
                      <td>
                        {LEVEL_PREFIX[row.level] ?? row.level.charAt(0)}
                        {row.matchId}
                      </td>
                      {report.columns.map((col) => {
                        const value = row.values[col.eventtype] ?? 0;
                        const count = row.counts?.[col.eventtype] ?? 0;
                        return (
                          <td key={col.eventtype}>
                            {col.isQuantity ? (
                              value === 0 ? "—" : <>
                                {formatValue(value, true)}
                                <span className="mega-report-count"> ({count})</span>
                              </>
                            ) : (
                              formatValue(value, false)
                            )}
                          </td>
                        );
                      })}
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

export default MegaReportPage;
