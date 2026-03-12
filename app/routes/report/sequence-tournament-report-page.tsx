import { useEffect, useState } from "react";
import { NavLink, useParams } from "react-router";
import RequireLogin from "~/common/auth/RequireLogin.tsx";
import { getTournamentSequenceReport } from "~/common/storage/rb.ts";
import { useSequenceTypeList } from "~/common/storage/dbhooks.ts";
import Spinner from "~/common/Spinner.tsx";
import type {
  TournamentSequenceReport,
  SequenceReport,
  SequenceInfo,
} from "~/types/SequenceReport.ts";

function msToSeconds(ms: number): string {
  return (ms / 1000).toFixed(2);
}

function endEventName(seq: SequenceInfo): string {
  if (seq.events.length === 0) return "—";
  return seq.events[seq.events.length - 1].eventtype.name;
}

function sequenceNotes(seq: SequenceInfo): string {
  return seq.events
    .map((e) => e.note?.trim())
    .filter((n): n is string => !!n)
    .join("; ");
}

function SequenceTable({ report }: { report: SequenceReport }) {
  if (!report.sequences || report.sequences.length === 0) {
    return <p>No sequences detected.</p>;
  }

  return (
    <table className="drill-shot-table">
      <thead>
        <tr>
          <th>#</th>
          <th>Time</th>
          <th>Duration</th>
          <th>Result</th>
          <th>Delta</th>
          <th>Note</th>
        </tr>
      </thead>
      <tbody>
        {report.sequences.map((seq, i) => {
          const prevDuration =
            i > 0 ? report.sequences[i - 1].duration : null;
          const delta =
            prevDuration !== null ? seq.duration - prevDuration : null;
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
              <td>{sequenceNotes(seq)}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

function TimingStats({ report }: { report: SequenceReport }) {
  if (!report.sequences || report.sequences.length === 0) return null;
  return (
    <table className="status-table">
      <tbody>
        <tr>
          <td>Total sequences</td>
          <td>{report.sequences.length}</td>
        </tr>
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
  );
}

const SequenceTournamentReportPage = () => {
  const { sequenceTypeCode, teamId, tournamentId } = useParams<{
    sequenceTypeCode: string;
    teamId: string;
    tournamentId: string;
  }>();
  const { list: sequenceTypes } = useSequenceTypeList();
  const [data, setData] = useState<TournamentSequenceReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const sequenceType = sequenceTypes.find((st) => st.code === sequenceTypeCode);

  useEffect(() => {
    if (!tournamentId || !teamId || !sequenceType) return;
    setLoading(true);
    getTournamentSequenceReport(
      Number(teamId),
      tournamentId,
      new Date().getFullYear(),
      sequenceType.id,
    )
      .then((resp) => {
        if (resp.success && resp.report) {
          setData(resp.report);
        } else {
          setError(resp.reason || "Failed to load tournament sequence report");
        }
        setLoading(false);
      })
      .catch((e) => {
        setError(e.message);
        setLoading(false);
      });
  }, [tournamentId, teamId, sequenceType?.id]);

  return (
    <main>
      <div className="page-header">
        <h1>
          {sequenceType?.name ?? sequenceTypeCode} — Team {teamId} @{" "}
          {tournamentId}
        </h1>
        <p>
          <NavLink
            to={`/report/tournament/${sequenceTypeCode}/${teamId}`}
          >
            &larr; Back to Tournaments
          </NavLink>
        </p>
      </div>
      <RequireLogin>
        {(loading || !sequenceType) && <Spinner />}
        {error && <p className="banner banner-warning">{error}</p>}
        {data && (
          <>
            <section className="card drill-summary">
              <h2>Aggregate Summary</h2>
              <TimingStats report={data.aggregate} />
            </section>

            {data.matches.map((m) => (
              <section key={m.matchId} className="card">
                <h2>
                  {m.level} Match {m.matchId}
                </h2>
                <TimingStats report={m.report} />
                <SequenceTable report={m.report} />
              </section>
            ))}
          </>
        )}
      </RequireLogin>
    </main>
  );
};

export default SequenceTournamentReportPage;
