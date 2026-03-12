import { useEffect, useState } from "react";
import { NavLink, useParams } from "react-router";
import RequireLogin from "~/common/auth/RequireLogin.tsx";
import { getDrillReport } from "~/common/storage/rb.ts";
import { useSequenceTypeList } from "~/common/storage/dbhooks.ts";
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

function msToSeconds(ms: number): string {
  return (ms / 1000).toFixed(2);
}

function endEventName(seq: SequenceInfo): string {
  if (seq.events.length === 0) return "—";
  return seq.events[seq.events.length - 1].eventtype.name;
}

const SequenceDrillReportPage = () => {
  const { sequenceTypeCode, tournamentId } = useParams<{
    sequenceTypeCode: string;
    tournamentId: string;
  }>();
  const { list: sequenceTypes } = useSequenceTypeList();
  const [report, setReport] = useState<SequenceReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const sequenceType = sequenceTypes.find((st) => st.code === sequenceTypeCode);

  useEffect(() => {
    if (!tournamentId || !sequenceType) return;
    setLoading(true);
    getDrillReport(1310, tournamentId, new Date().getFullYear(), sequenceType.id)
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
  }, [tournamentId, sequenceType?.id]);

  const total = report?.sequences?.length ?? 0;

  return (
    <main>
      <div className="page-header">
        <h1>{sequenceType?.name ?? sequenceTypeCode} — Drill Report</h1>
        <p>
          <NavLink to={`/report/drill/sessions/${sequenceTypeCode}`}>
            &larr; Back to Drill Sessions
          </NavLink>
        </p>
      </div>
      <RequireLogin>
        {(loading || !sequenceType) && <Spinner />}
        {error && <p className="banner banner-warning">{error}</p>}
        {report && (
          <>
            <section className="card drill-summary">
              <h2>Summary</h2>
              <table className="status-table">
                <tbody>
                  <tr>
                    <td>Date</td>
                    <td>{parseDrillDate(tournamentId!)}</td>
                  </tr>
                  <tr>
                    <td>Total sequences</td>
                    <td>{total}</td>
                  </tr>
                </tbody>
              </table>
            </section>

            {total > 0 && (
              <section className="card drill-summary">
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
              <section className="card">
                <h2>Sequence-by-Sequence</h2>
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
                      const startTime = seq.events[0]?.timestamp;
                      const timeStr = startTime
                        ? new Date(startTime).toLocaleTimeString()
                        : "";

                      return (
                        <tr key={i}>
                          <td>{i + 1}</td>
                          <td>{timeStr}</td>
                          <td>{msToSeconds(seq.duration)}s</td>
                          <td>{endEventName(seq)}</td>
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

export default SequenceDrillReportPage;
