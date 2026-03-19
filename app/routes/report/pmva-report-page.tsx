import { useEffect, useState } from "react";
import { NavLink, useParams } from "react-router";
import RequireLogin from "~/common/auth/RequireLogin.tsx";
import { useSequenceTypeList } from "~/common/storage/dbhooks.ts";
import {
  getPmvaReport,
  getTournamentSequenceReport,
} from "~/common/storage/rb.ts";
import Spinner from "~/common/Spinner.tsx";
import type { TournamentSequenceReport } from "~/types/SequenceReport.ts";
import type {
  PmvaReport,
  MatchComment,
  GeneralSection,
  HopperSection,
  LoadingStats,
  ShootingStats,
  MatchShootingData,
  SwiSection,
  MatchSwiData,
} from "~/types/PmvaReport.ts";

const LEVEL_PREFIX: Record<string, string> = {
  Practice: "P",
  Qualification: "Q",
  Playoff: "E",
};

function matchLabel(level: string, matchId: number): string {
  return (LEVEL_PREFIX[level] ?? level.charAt(0)) + matchId;
}

function safeDivide(num: number, den: number): number {
  return den === 0 ? 0 : num / den;
}

function formatPct(value: number): string {
  return value.toFixed(1) + "%";
}

function formatNum(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(2);
}

function StarRating({ value }: { value: number }) {
  const full = Math.floor(value);
  const half = value - full >= 0.5;
  const empty = 5 - full - (half ? 1 : 0);
  return (
    <span className="pmva-stars" title={value.toFixed(1) + " / 5"}>
      {"★".repeat(full)}
      {half ? "½" : ""}
      {"☆".repeat(empty)}
    </span>
  );
}

function CommentAccordion({
  title,
  comments,
}: {
  title: string;
  comments: MatchComment[];
}) {
  if (!comments || comments.length === 0) return null;
  return (
    <details className="pmva-accordion">
      <summary>
        {title} ({comments.length})
      </summary>
      <div className="pmva-accordion-body">
        <table className="pmva-stats-table">
          <thead>
            <tr>
              <th>Match</th>
              <th>Note</th>
            </tr>
          </thead>
          <tbody>
            {comments.map((c, i) => (
              <tr key={i}>
                <td>{matchLabel(c.level, c.matchId)}</td>
                <td>{c.note}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}

function BarChart({
  data,
  label,
  valueFormatter,
}: {
  data: { matchId: number; level: string; value: number }[];
  label: string;
  valueFormatter?: (v: number) => string;
}) {
  if (data.length === 0) return null;
  const maxVal = Math.max(...data.map((d) => d.value), 0.01);
  const fmt = valueFormatter ?? formatNum;
  return (
    <div className="pmva-chart-container">
      <h4>{label}</h4>
      <div className="pmva-bar-chart">
        {data.map((d) => (
          <div
            key={`${d.level}-${d.matchId}`}
            className="pmva-bar"
            style={{ height: `${(d.value / maxVal) * 100}%` }}
          >
            <span className="pmva-bar-value">{fmt(d.value)}</span>
            <span className="pmva-bar-label">
              {matchLabel(d.level, d.matchId)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function GeneralCard({ general, matchCount }: { general: GeneralSection; matchCount: number }) {
  return (
    <section className="card">
      <h2>Summary &amp; General</h2>

      <table className="pmva-stats-table">
        <tbody>
          <tr>
            <td>Matches with Robot Breakdown</td>
            <td>
              {general.breakdownCount} / {matchCount} ({formatPct(general.breakdownPercentage)})
            </td>
          </tr>
        </tbody>
      </table>

      {general.breakdownMatches.length > 0 && (
        <>
          <h3>Breakdown Matches</h3>
          <table className="pmva-stats-table">
            <thead>
              <tr>
                <th>Match</th>
                <th>Note</th>
                <th>Video</th>
              </tr>
            </thead>
            <tbody>
              {general.breakdownMatches.map((m) => (
                <tr key={`${m.level}-${m.matchId}`}>
                  <td>{matchLabel(m.level, m.matchId)}</td>
                  <td>{m.note}</td>
                  <td>
                    {m.videoLink ? (
                      <a
                        href={m.videoLink}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Video
                      </a>
                    ) : (
                      "—"
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      <CommentAccordion title="Breakdown Comments" comments={general.breakdownNotes} />
      <CommentAccordion title="Intake Comments" comments={general.intakeComments} />
      <CommentAccordion title="Shooter Comments" comments={general.shooterComments} />
      <CommentAccordion title="General Comments" comments={general.generalComments} />
      <CommentAccordion title="Suggestions" comments={general.suggestions} />
    </section>
  );
}

function LoadingSection({ loading }: { loading: LoadingStats }) {
  return (
    <>
      <h3>Loading</h3>
      <table className="pmva-stats-table">
        <tbody>
          <tr>
            <td>Average Hopper Fill Count</td>
            <td>{formatNum(loading.avgFillCount)}</td>
          </tr>
          <tr>
            <td>Max Hopper Fill</td>
            <td>{formatNum(loading.maxFillCount)}</td>
          </tr>
          <tr>
            <td>Hopper Filled %</td>
            <td>{formatPct(loading.hopperFilledPercentage)}</td>
          </tr>
          <tr>
            <td>Average Load Rating</td>
            <td>
              <StarRating value={loading.avgLoadRating} /> ({formatNum(loading.avgLoadRating)})
            </td>
          </tr>
        </tbody>
      </table>
      <CommentAccordion title="Load Comments" comments={loading.loadComments} />
    </>
  );
}

function ShootingSection({
  stats,
  title,
  matchCount,
}: {
  stats: ShootingStats;
  title: string;
  matchCount: number;
}) {
  const runsPerMatch = safeDivide(stats.sequenceCount, matchCount);
  return (
    <>
      <h3>{title}</h3>
      {stats.sequenceCount === 0 ? (
        <p>No unload sequences recorded.</p>
      ) : (
        <>
          <table className="pmva-stats-table">
            <tbody>
              <tr>
                <td>Unload Runs</td>
                <td>{stats.sequenceCount} total ({formatNum(runsPerMatch)} per match)</td>
              </tr>
              <tr>
                <td>Average Score Per Match</td>
                <td>{formatNum(stats.avgScorePerMatch)}</td>
              </tr>
              <tr>
                <td>Average Hit Rate</td>
                <td>{formatPct(stats.avgHitRate * 100)}</td>
              </tr>
              <tr>
                <td>Average Unload Time</td>
                <td>{formatNum(stats.avgUnloadSeconds)}s</td>
              </tr>
              <tr>
                <td>Shots Per Second</td>
                <td>{formatNum(stats.shotsPerSecond)}</td>
              </tr>
              <tr>
                <td>Scores Per Second</td>
                <td>{formatNum(stats.scoresPerSecond)}</td>
              </tr>
              <tr>
                <td>Average Stuck In Hopper</td>
                <td>{formatNum(stats.avgStuckPerSequence)}</td>
              </tr>
            </tbody>
          </table>

          <BarChart
            label="Unload Runs Per Match"
            data={stats.perMatch.map((m) => ({
              matchId: m.matchId,
              level: m.level,
              value: m.unloadRuns,
            }))}
          />
          <BarChart
            label="Scores Per Match"
            data={stats.perMatch.map((m) => ({
              matchId: m.matchId,
              level: m.level,
              value: m.totalScores,
            }))}
          />
          <BarChart
            label="Hit Rate Per Match"
            data={stats.perMatch.map((m) => ({
              matchId: m.matchId,
              level: m.level,
              value: m.hitRate,
            }))}
            valueFormatter={(v) => formatPct(v * 100)}
          />

          <CommentAccordion title="Stuck Comments" comments={stats.stuckComments} />
          <CommentAccordion title="General Comments" comments={stats.generalComments} />
        </>
      )}
    </>
  );
}

function HopperCard({
  hopper,
  matchCount,
}: {
  hopper: HopperSection;
  matchCount: number;
}) {
  return (
    <section className="card">
      <h2>Fill Then Empty Hopper</h2>

      <LoadingSection loading={hopper.loading} />

      <ShootingSection
        stats={hopper.shootingAll}
        title="Shooting — All Positions"
        matchCount={matchCount}
      />

      {hopper.shootingClose && hopper.shootingClose.sequenceCount > 0 && (
        <ShootingSection
          stats={hopper.shootingClose}
          title="Shooting — Close"
          matchCount={matchCount}
        />
      )}
      {hopper.shootingMid && hopper.shootingMid.sequenceCount > 0 && (
        <ShootingSection
          stats={hopper.shootingMid}
          title="Shooting — Mid"
          matchCount={matchCount}
        />
      )}
      {hopper.shootingFar && hopper.shootingFar.sequenceCount > 0 && (
        <ShootingSection
          stats={hopper.shootingFar}
          title="Shooting — Far"
          matchCount={matchCount}
        />
      )}
      {hopper.shootingVaried && hopper.shootingVaried.sequenceCount > 0 && (
        <ShootingSection
          stats={hopper.shootingVaried}
          title="Shooting — Varied"
          matchCount={matchCount}
        />
      )}
    </section>
  );
}

function SwiCard({
  swi,
  matchCount,
}: {
  swi: SwiSection;
  matchCount: number;
}) {
  const hasData = swi.perMatch?.length > 0;
  return (
    <section className="card">
      <h2>Shoot While Intaking (SWI)</h2>

      {!hasData ? (
        <p>No SWI sequences recorded.</p>
      ) : (
        <>
          <table className="pmva-stats-table">
            <tbody>
              <tr>
                <td>Average SWI Sequences Per Match</td>
                <td>{formatNum(swi.avgSequencesPerMatch)}</td>
              </tr>
              <tr>
                <td>Average Scores Per Sequence</td>
                <td>{formatNum(swi.avgScoresPerSequence)}</td>
              </tr>
              <tr>
                <td>Average Score %</td>
                <td>{formatPct(swi.avgScorePercentPerSequence)}</td>
              </tr>
              <tr>
                <td>Average Stuck Balls Per Sequence</td>
                <td>{formatNum(swi.avgStuckPerSequence)}</td>
              </tr>
              <tr>
                <td>Average SWI Duration</td>
                <td>{formatNum(swi.avgDurationSeconds)}s</td>
              </tr>
            </tbody>
          </table>

          <BarChart
            label="SWI Sequences Per Match"
            data={swi.perMatch.map((m) => ({
              matchId: m.matchId,
              level: m.level,
              value: m.sequenceCount,
            }))}
          />
          <BarChart
            label="Scores Per Match"
            data={swi.perMatch.map((m) => ({
              matchId: m.matchId,
              level: m.level,
              value: m.totalScores,
            }))}
          />
          <BarChart
            label="Hit Rate Per Match"
            data={swi.perMatch.map((m) => ({
              matchId: m.matchId,
              level: m.level,
              value: m.hitRate,
            }))}
            valueFormatter={(v) => formatPct(v * 100)}
          />
        </>
      )}

      <CommentAccordion title="Stuck Comments" comments={swi.stuckComments} />
      <CommentAccordion title="General Comments" comments={swi.generalComments} />
      <CommentAccordion title="Position Comments" comments={swi.positionComments} />
    </section>
  );
}

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
      </ul>
      {activeTypes.length > 0 && (
        <>
          <h3>Sequence Reports</h3>
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
                <td>Sequences</td>
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
              <span className="pmva-legend"> (P = Practice, Q = Qualification, E = Elimination)</span>
            </p>

            <GeneralCard general={report.general} matchCount={report.matchCount} />
            <HopperCard hopper={report.hopper} matchCount={report.matchCount} />
            <SwiCard swi={report.swi} matchCount={report.matchCount} />

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
