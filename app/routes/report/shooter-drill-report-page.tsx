import { useEffect, useState } from "react";
import { NavLink, useParams } from "react-router";
import RequireLogin from "~/common/auth/RequireLogin.tsx";
import { getDrillReport } from "~/common/storage/rb.ts";
import Spinner from "~/common/Spinner.tsx";
import type { SequenceReport, SequenceInfo } from "~/types/SequenceReport.ts";

function parseDrillDate(tournamentId: string): string {
  const match = tournamentId.match(
    /^DRILL-(\d{4})(\d{2})(\d{2})-(\d{2})(\d{2})$/,
  );
  if (!match) return tournamentId;
  const [, year, month, day, hour, minute] = match;
  return `${year}-${month}-${day} ${hour}:${minute}`;
}

function isScore(seq: SequenceInfo): boolean {
  if (seq.events.length === 0) return false;
  return seq.events[seq.events.length - 1].eventtype.eventtype === "drill-score";
}

function msToSeconds(ms: number): string {
  return (ms / 1000).toFixed(2);
}

const ShooterDrillReportPage = () => {
  const { tournamentId } = useParams<{ tournamentId: string }>();
  const [report, setReport] = useState<SequenceReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!tournamentId) return;
    // Default to team 1310 and current year
    getDrillReport(1310, tournamentId, new Date().getFullYear())
      .then((resp) => {
        if (resp.success && resp.report) {
          setReport(resp.report);
        } else {
          setError(resp.reason || "Failed to load drill report");
        }
        setLoading(false);
      })
      .catch((e) => {
        setError(e.message);
        setLoading(false);
      });
  }, [tournamentId]);

  const scores = report
    ? report.sequences.filter(isScore).length
    : 0;
  const total = report ? report.sequences.length : 0;

  return (
    <main>
      <h1>Shooter Drill Report</h1>
      <RequireLogin>
        <p>
          <NavLink to="/report/drill">&larr; Back to Drill Sessions</NavLink>
        </p>
        {loading && <Spinner />}
        {error && <p className="banner banner-warning">{error}</p>}
        {report && (
          <>
            <section className="drill-summary">
              <h2>Summary</h2>
              <table className="status-table">
                <tbody>
                  <tr>
                    <td>Date</td>
                    <td>{parseDrillDate(tournamentId!)}</td>
                  </tr>
                  <tr>
                    <td>Total shots</td>
                    <td>{total}</td>
                  </tr>
                  <tr>
                    <td>Success ratio</td>
                    <td>
                      {total > 0
                        ? `${scores}/${total} (${Math.round((scores / total) * 100)}%)`
                        : "N/A"}
                    </td>
                  </tr>
                </tbody>
              </table>
            </section>

            {total > 0 && (
              <section className="drill-summary">
                <h2>Timing Stats</h2>
                <table className="status-table">
                  <tbody>
                    <tr>
                      <td>Average</td>
                      <td>{msToSeconds(report.averageDuration)}s</td>
                    </tr>
                    <tr>
                      <td>Fastest</td>
                      <td>{msToSeconds(report.fastestDuration)}s</td>
                    </tr>
                    <tr>
                      <td>Slowest</td>
                      <td>{msToSeconds(report.slowestDuration)}s</td>
                    </tr>
                  </tbody>
                </table>
              </section>
            )}

            {total > 0 && (
              <section>
                <h2>Shot-by-Shot</h2>
                <table className="drill-shot-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Time</th>
                      <th>Duration</th>
                      <th>Result</th>
                      <th>Delta</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.sequences.map((seq, i) => {
                      const prevDuration =
                        i > 0 ? report.sequences[i - 1].duration : null;
                      const delta =
                        prevDuration !== null
                          ? seq.duration - prevDuration
                          : null;
                      const score = isScore(seq);
                      const startTime = seq.events[0]?.timestamp;
                      const timeStr = startTime
                        ? new Date(startTime).toLocaleTimeString()
                        : "";

                      return (
                        <tr key={i}>
                          <td>{i + 1}</td>
                          <td>{timeStr}</td>
                          <td>{msToSeconds(seq.duration)}s</td>
                          <td>
                            <span className={score ? "shot-score" : "shot-miss"}>
                              {score ? "Score" : "Miss"}
                            </span>
                          </td>
                          <td>
                            {delta !== null && (
                              <span
                                className={
                                  delta < 0
                                    ? "trend-improving"
                                    : delta > 0
                                      ? "trend-degrading"
                                      : ""
                                }
                              >
                                {delta < 0 ? "\u25BC " : delta > 0 ? "\u25B2 " : ""}
                                {delta !== 0
                                  ? `${delta > 0 ? "+" : ""}${msToSeconds(delta)}s`
                                  : "—"}
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </section>
            )}
          </>
        )}
      </RequireLogin>
    </main>
  );
};

export default ShooterDrillReportPage;
