import { useCallback, useEffect, useRef, useState } from "react";
import {
  fetchTournamentSchedule,
  getActiveTeamTournaments,
  getNexusQueueStatus,
  getTeamSchedulePublic,
  getTournamentList,
} from "~/common/storage/rb.ts";
import TournamentPicker from "~/common/components/TournamentPicker.tsx";
import { useLoginStatus, useRole } from "~/common/storage/rbauth.ts";
import Spinner from "~/common/Spinner.tsx";
import {
  deriveAlliances,
  isFinalsDecided,
  resolveBracket,
  type Alliance,
  type ResolvedMatch,
} from "~/common/bracket.ts";
import BracketSvg from "~/common/BracketSvg.tsx";
import type { RBTournament } from "~/types/RBTournament.ts";
import type { NexusQueueStatus } from "~/types/NexusQueueStatus.ts";
import type {
  TeamRanking,
  TeamScheduleMatch,
  TeamScheduleResponse,
} from "~/types/TeamSchedule.ts";

const REFRESH_INTERVAL_ACTIVE_MS = 30_000;
const REFRESH_INTERVAL_IDLE_MS = 30_000;

function hasRed4(matches: TeamScheduleMatch[]): boolean {
  return matches.some((m) => m.red4 !== 0);
}

function hasBlue4(matches: TeamScheduleMatch[]): boolean {
  return matches.some((m) => m.blue4 !== 0);
}

function TeamCell({
  team,
  ownerTeam,
}: {
  team: number;
  ownerTeam: number;
}) {
  if (team === 0) return <td className="schedule-col-team"></td>;
  const isOwner = team === ownerTeam;
  return <td className="schedule-col-team" style={isOwner ? { fontWeight: 700 } : undefined}>{team}</td>;
}

function AllianceCell({
  match,
  ownerTeam,
}: {
  match: TeamScheduleMatch;
  ownerTeam: number;
}) {
  const info = getStationForTeam(match, ownerTeam);
  if (!info) return <td className="schedule-col-alliance"></td>;
  return (
    <td className={`schedule-col-alliance alliance-${info.alliance}-text`}>
      {info.alliance === "red" ? "Red" : "Blue"}{info.station}
    </td>
  );
}

function ScoreCell({ match }: { match: TeamScheduleMatch }) {
  if (match.winningAlliance === 0 || match.redScore === null || match.blueScore === null) {
    return <td></td>;
  }
  return (
    <td className="schedule-score-cell">
      <span className="alliance-red-text">{match.redScore}</span>
      {":"}
      <span className="alliance-blue-text">{match.blueScore}</span>
    </td>
  );
}

function getStationForTeam(
  match: TeamScheduleMatch,
  teamNumber: number,
): { alliance: "red" | "blue"; station: number } | null {
  if (match.red1 === teamNumber) return { alliance: "red", station: 1 };
  if (match.red2 === teamNumber) return { alliance: "red", station: 2 };
  if (match.red3 === teamNumber) return { alliance: "red", station: 3 };
  if (match.red4 === teamNumber) return { alliance: "red", station: 4 };
  if (match.blue1 === teamNumber) return { alliance: "blue", station: 1 };
  if (match.blue2 === teamNumber) return { alliance: "blue", station: 2 };
  if (match.blue3 === teamNumber) return { alliance: "blue", station: 3 };
  if (match.blue4 === teamNumber) return { alliance: "blue", station: 4 };
  return null;
}

function getAllianceForTeam(
  match: TeamScheduleMatch,
  teamNumber: number,
): "red" | "blue" | null {
  return getStationForTeam(match, teamNumber)?.alliance ?? null;
}

function RpCell({
  match,
  ownerTeam,
  isElimination,
}: {
  match: TeamScheduleMatch;
  ownerTeam: number;
  isElimination: boolean;
}) {
  if (match.winningAlliance === 0 || match.redScore === null || match.blueScore === null) {
    return <td></td>;
  }

  const alliance = getAllianceForTeam(match, ownerTeam);
  const won =
    alliance === "red" ? match.winningAlliance === 1 :
    alliance === "blue" ? match.winningAlliance === 2 :
    null;

  if (isElimination) {
    return <td className="schedule-score-cell">{won !== null ? (won ? "W" : "L") : ""}</td>;
  }

  const redRp = match.redRp ?? 0;
  const blueRp = match.blueRp ?? 0;
  return (
    <td className="schedule-score-cell">
      <span className="alliance-red-text">{redRp}</span>
      {":"}
      <span className="alliance-blue-text">{blueRp}</span>
      {won !== null && <> {won ? "W" : "L"}</>}
    </td>
  );
}

function formatMatchTime(time24: string | null): string {
  if (!time24) return "";
  const [h, m] = time24.split(":").map(Number);
  const suffix = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 || 12;
  return `${hour12}:${m.toString().padStart(2, "0")} ${suffix}`;
}

function formatQueueTime(unixMs: number | null): string | null {
  if (unixMs == null) return null;
  const date = new Date(unixMs);
  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function QueueBanner({ queueStatus }: { queueStatus: NexusQueueStatus | null }) {
  if (!queueStatus || !queueStatus.teamStatus) return null;

  const allianceClass = queueStatus.teamAlliance
    ? `queue-alliance-${queueStatus.teamAlliance}`
    : "";
  const startTime = formatQueueTime(queueStatus.estimatedStartTime);
  const queueTime = formatQueueTime(queueStatus.estimatedQueueTime);

  const status = queueStatus.teamStatus;
  const stateClass = status === "On field"
    ? "banner-queue-onfield"
    : status === "On deck"
      ? "banner-queue-ondeck"
      : status === "Now queuing"
        ? "banner-queue-queuing"
        : "banner-queue-idle";

  return (
    <div className={`banner banner-queue ${stateClass}`}>
      <div className="queue-summary">
        {queueStatus.teamMatchLabel && (
          <span className={`queue-match-badge ${allianceClass}`}>
            {queueStatus.teamMatchLabel}
          </span>
        )}
        <span>{queueStatus.teamStatus}</span>
        {startTime && <span className="queue-time">est. {startTime}</span>}
      </div>
      {(queueStatus.nowQueuing || queueTime || (queueStatus.announcements && queueStatus.announcements.length > 0)) && (
        <div className="queue-details">
          {queueStatus.nowQueuing && (
            <><span className="queue-detail-label">Now queuing</span> {queueStatus.nowQueuing}</>
          )}
          {queueStatus.nowQueuing && (queueTime || startTime) && (
            <span className="queue-detail-sep">&middot;</span>
          )}
          {queueTime && (
            <><span className="queue-detail-label">Queue</span> {queueTime}</>
          )}
          {queueTime && startTime && (
            <span className="queue-detail-sep">&middot;</span>
          )}
          {startTime && (
            <><span className="queue-detail-label">Start</span> {startTime}</>
          )}
          {(queueStatus.announcements ?? []).map((a, i) => (
            <div key={i} className="queue-announcement">{a.content}</div>
          ))}
        </div>
      )}
    </div>
  );
}

function useActiveTeamTournamentsFromApi() {
  const [list, setList] = useState<RBTournament[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    getActiveTeamTournaments()
      .then((data) => {
        if (isMounted) setList(data);
      })
      .catch((err) => console.error("Failed to load active tournaments", err))
      .finally(() => {
        if (isMounted) setLoading(false);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  return { list, loading };
}

function ScheduleTable({
  label,
  level,
  matches,
  ownerTeam,
  showAll,
  hasData,
  tournamentId,
  onFetchSchedule,
  fetching,
  countdown,
  ownerRank,
  ownerRp,
  ownerRs,
  loggedIn,
  highlightMatch,
}: {
  label: string;
  level: string;
  matches: TeamScheduleMatch[];
  ownerTeam: number;
  showAll: boolean;
  hasData: boolean;
  tournamentId: string;
  onFetchSchedule: () => void;
  fetching: boolean;
  countdown: number;
  ownerRank?: number | null;
  ownerRp?: number | null;
  ownerRs?: number | null;
  loggedIn: boolean;
  highlightMatch?: number | null;
}) {
  const isElimination = level === "Playoff";
  const allLevelMatches = (matches ?? []).filter((m) => m.level === level);
  const levelMatches = showAll
    ? allLevelMatches
    : allLevelMatches.filter((m) => getAllianceForTeam(m, ownerTeam) !== null);
  const showRed4 = hasRed4(levelMatches);
  const showBlue4 = hasBlue4(levelMatches);
  return (
    <section className="card schedule-card">
      <h3>
        {label}
        {" "}<span className="schedule-countdown">refreshing in {countdown}s</span>
        {ownerRank != null && (
          <span className="schedule-rank">
            <span className="rank">Rank: {ownerRank}</span><span className="rp">RP: {ownerRp ?? 0}</span><span className="avg">RS: {ownerRs != null ? ownerRs.toFixed(2) : "—"}</span>
            <a href="#rankings" className="schedule-rank-more">Full Rankings</a>
          </span>
        )}
      </h3>
      {!hasData ? (
        loggedIn ? (
          <button onClick={onFetchSchedule} disabled={fetching}>
            {fetching ? "Fetching..." : "Fetch Schedule"}
          </button>
        ) : (
          <p>No {label.toLowerCase()} matches scheduled yet.</p>
        )
      ) : levelMatches.length === 0 ? (
        <p>No {label.toLowerCase()} matches scheduled.</p>
      ) : (
        <div className="schedule-table-wrapper">
          <p className="schedule-rotate-hint">Rotate device to see full details</p>
          <table className="schedule-table">
            <thead>
              <tr>
                <th></th>
                <th></th>
                <th className="schedule-col-alliance">Alliance</th>
                <th className="alliance-red-text schedule-col-team">R1</th>
                <th className="alliance-red-text schedule-col-team">R2</th>
                <th className="alliance-red-text schedule-col-team">R3</th>
                {showRed4 && <th className="alliance-red-text schedule-col-team">R4</th>}
                <th className="alliance-blue-text schedule-col-team">B1</th>
                <th className="alliance-blue-text schedule-col-team">B2</th>
                <th className="alliance-blue-text schedule-col-team">B3</th>
                {showBlue4 && <th className="alliance-blue-text schedule-col-team">B4</th>}
                <th>Score</th>
                <th>{isElimination ? `${ownerTeam} W/L` : "RP"}</th>
              </tr>
            </thead>
            <tbody>
              {levelMatches.map((m) => {
                const alliance = getAllianceForTeam(m, ownerTeam);
                const classes = [
                  alliance === "red" ? "schedule-row-our-red" : alliance === "blue" ? "schedule-row-our-blue" : "",
                  highlightMatch === m.match ? "schedule-row-highlight" : "",
                ].filter(Boolean).join(" ");
                return (
                  <tr key={`${m.level}-${m.match}`} className={classes}>
                    <td className="schedule-match-num">{m.match}</td>
                    <td className="schedule-time">
                      {formatMatchTime(m.startTime)}
                    </td>
                    <AllianceCell match={m} ownerTeam={ownerTeam} />
                    <TeamCell team={m.red1} ownerTeam={ownerTeam} />
                    <TeamCell team={m.red2} ownerTeam={ownerTeam} />
                    <TeamCell team={m.red3} ownerTeam={ownerTeam} />
                    {showRed4 && (
                      <TeamCell team={m.red4} ownerTeam={ownerTeam} />
                    )}
                    <TeamCell team={m.blue1} ownerTeam={ownerTeam} />
                    <TeamCell team={m.blue2} ownerTeam={ownerTeam} />
                    <TeamCell team={m.blue3} ownerTeam={ownerTeam} />
                    {showBlue4 && (
                      <TeamCell team={m.blue4} ownerTeam={ownerTeam} />
                    )}
                    <ScoreCell match={m} />
                    <RpCell match={m} ownerTeam={ownerTeam} isElimination={isElimination} />
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function RankingsTable({
  rankings,
  ownerTeam,
}: {
  rankings: TeamRanking[];
  ownerTeam: number;
}) {
  if (!rankings || rankings.length === 0) return null;

  return (
    <section id="rankings" className="card schedule-card">
      <h3>Rankings</h3>
      <div className="schedule-table-wrapper">
        <table className="schedule-table rankings-table">
          <thead>
            <tr>
              <th>Rank</th>
              <th>Team</th>
              <th className="rankings-col-name">Name</th>
              <th>RP</th>
              <th>RS</th>
            </tr>
          </thead>
          <tbody>
            {rankings.map((r, i) => (
              <tr
                key={r.teamNumber}
                className={r.teamNumber === ownerTeam ? "rankings-row-owner" : ""}
              >
                <td>{i + 1}</td>
                <td>{r.teamNumber}</td>
                <td className="rankings-col-name">{r.teamName}</td>
                <td>{r.rp}</td>
                <td>{r.rs.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Playoff bracket + alliance components for schedule page
// ---------------------------------------------------------------------------

function ScheduleAllianceList({
  alliances,
  ownerTeam,
  rankings,
}: {
  alliances: Alliance[];
  ownerTeam: number;
  rankings: TeamRanking[];
}) {
  const rankByTeam = new Map<number, number>();
  rankings.forEach((r, i) => rankByTeam.set(r.teamNumber, i + 1));

  return (
    <div className="schedule-alliance-list">
      <h3>Alliances</h3>
      <div className="schedule-alliance-grid">
      {alliances.map((a) => (
        <div
          key={a.seed}
          className={[
            "schedule-alliance-card",
            a.isOwner ? "schedule-alliance-owner" : "",
            a.eliminated ? "schedule-alliance-eliminated" : "",
          ].filter(Boolean).join(" ")}
        >
          <span className="schedule-alliance-seed">{a.seed}</span>
          <span className="schedule-alliance-teams">
            {a.teams.map((t) => (
              <span
                key={t}
                className={[
                  t === ownerTeam ? "schedule-alliance-owner-team" : "",
                  t === a.captain ? "schedule-alliance-captain" : "",
                ].filter(Boolean).join(" ")}
              >
                {t}
                {rankByTeam.has(t) && (
                  <span className="schedule-alliance-rank">({rankByTeam.get(t)})</span>
                )}
              </span>
            ))}
          </span>
        </div>
      ))}
      </div>
    </div>
  );
}

function ScheduleBracketSvg({
  resolvedMatches,
  ownerTeam,
  alliances,
}: {
  resolvedMatches: ResolvedMatch[];
  ownerTeam: number;
  alliances: Alliance[];
}) {
  const captains = new Set(alliances.map((a) => a.captain).filter(Boolean) as number[]);
  return <BracketSvg resolvedMatches={resolvedMatches} ownerTeam={ownerTeam} captains={captains} />;
}

const TeamScheduleContent = ({ autoSelect = false }: { autoSelect?: boolean }) => {
  const { list: activeTournaments, loading: tournamentsLoading } =
    useActiveTeamTournamentsFromApi();
  const { loggedIn } = useLoginStatus();
  const { isSuperuser } = useRole();
  const [schedule, setSchedule] = useState<TeamScheduleResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showAll, setShowAll] = useState(true);
  const [showAllInitialized, setShowAllInitialized] = useState(false);
  const [queueStatus, setQueueStatus] = useState<NexusQueueStatus | null>(null);
  const [countdown, setCountdown] = useState(60);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [manualTournament, setManualTournament] = useState<RBTournament | null>(null);
  const [allTournaments, setAllTournaments] = useState<RBTournament[]>([]);
  const [tournamentsListLoading, setTournamentsListLoading] = useState(true);
  const autoSelectedRef = useRef(false);

  useEffect(() => {
    getTournamentList()
      .then((all) => setAllTournaments(all))
      .catch((e) => console.error("Failed to load tournaments", e))
      .finally(() => setTournamentsListLoading(false));
  }, []);

  // Auto-select first active tournament when using /schedule/active
  useEffect(() => {
    if (autoSelect && !autoSelectedRef.current && !tournamentsLoading && activeTournaments.length > 0) {
      autoSelectedRef.current = true;
      setManualTournament(activeTournaments[0]);
    }
  }, [autoSelect, tournamentsLoading, activeTournaments]);
  const loggedInRef = useRef(loggedIn);
  const showAllInitializedRef = useRef(showAllInitialized);

  const selectedTournament = manualTournament;
  const selectedTournamentId = selectedTournament?.id ?? null;

  const handleBack = (e: React.MouseEvent) => {
    e.preventDefault();
    if (manualTournament) {
      setManualTournament(null);
      setSchedule(null);
      setError(null);
      setShowAllInitialized(false);
    } else {
      window.history.back();
    }
  };
  const matches = schedule?.matches ?? [];

  const hasScored = matches.some((m) => m.winningAlliance !== 0);
  const hasUnscored = matches.some((m) => m.winningAlliance === 0);
  const isActive = hasScored && hasUnscored;
  const refreshInterval = isActive
    ? REFRESH_INTERVAL_ACTIVE_MS
    : REFRESH_INTERVAL_IDLE_MS;
  const countdownStart = refreshInterval / 1000;

  useEffect(() => { loggedInRef.current = loggedIn; }, [loggedIn]);
  useEffect(() => { showAllInitializedRef.current = showAllInitialized; }, [showAllInitialized]);

  const loadSchedule = useCallback(
    async (tournamentId: string, isRefresh: boolean) => {
      if (isRefresh) setRefreshing(true);
      try {
        const data = await getTeamSchedulePublic(tournamentId);
        setSchedule(data);
        setError(null);
        const ownerInMatches = (data.matches ?? []).some(
          (m) => getAllianceForTeam(m, data.teamNumber) !== null,
        );
        if (!showAllInitializedRef.current && (data.matches ?? []).length > 0) {
          setShowAll(!ownerInMatches);
          setShowAllInitialized(true);
          showAllInitializedRef.current = true;
        }
        if (ownerInMatches) {
          getNexusQueueStatus(tournamentId).then(setQueueStatus);
        } else {
          setQueueStatus(null);
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load schedule");
      } finally {
        if (isRefresh) setRefreshing(false);
      }
    },
    [],
  );

  useEffect(() => {
    if (!selectedTournamentId) return;
    setShowAllInitialized(false);
    showAllInitializedRef.current = false;
    setShowAll(true);
    setLoading(true);
    loadSchedule(selectedTournamentId, false).finally(() => setLoading(false));

    setCountdown(countdownStart);
    countdownRef.current = setInterval(() => {
      setCountdown((prev) => (prev <= 1 ? countdownStart : prev - 1));
    }, 1000);

    intervalRef.current = setInterval(() => {
      setCountdown(countdownStart);
      loadSchedule(selectedTournamentId, true);
    }, refreshInterval);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, [selectedTournamentId, loadSchedule, refreshInterval, countdownStart]);

  const handleFetchSchedule = async () => {
    if (!selectedTournamentId) return;
    setFetching(true);
    try {
      await fetchTournamentSchedule(selectedTournamentId);
      await loadSchedule(selectedTournamentId, false);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Failed to fetch schedule from FRC",
      );
    } finally {
      setFetching(false);
    }
  };

  const ownerRankEntry = schedule?.rankings?.find(
    (r) => r.teamNumber === schedule.teamNumber,
  );
  const ownerRank = ownerRankEntry
    ? schedule!.rankings.indexOf(ownerRankEntry) + 1
    : null;
  const ownerRp = ownerRankEntry?.rp ?? null;
  const ownerRs = ownerRankEntry?.rs ?? null;

  // Fixed order: Elimination (top), Qualification (middle), Practice (bottom).
  // Each section only renders if data exists.
  const allSections = [
    { label: "Elimination", level: "Playoff" as const, hasData: schedule?.hasPlayoff ?? false },
    { label: "Qualification", level: "Qualification" as const, hasData: schedule?.hasQualification ?? false },
    { label: "Practice", level: "Practice" as const, hasData: schedule?.hasPractice ?? false },
  ];
  const scheduleSections = allSections.filter((s) => s.hasData);

  // Playoff bracket data (needed before highlight logic for finalsOver check)
  const playoffMatches = matches.filter((m) => m.level === "Playoff");
  const hasPlayoffBracket = schedule?.hasPlayoff === true && playoffMatches.length >= 4;
  const playoffAlliances = hasPlayoffBracket
    ? deriveAlliances(playoffMatches, schedule!.teamNumber, schedule!.rankings)
    : [];
  const playoffResolved = hasPlayoffBracket ? resolveBracket(playoffMatches) : [];
  const finalsOver = isFinalsDecided(playoffResolved);

  // Determine which match to highlight per level.
  // showAll → highlight the match currently being queued (from nexus).
  // owner-only → highlight the owner's next unplayed match.
  const highlightByLevel: Record<string, number | null> = {};
  if (schedule) {
    for (const section of allSections) {
      const levelMatches = (schedule.matches ?? []).filter(
        (m) => m.level === section.level,
      );
      const skipM16 = (m: TeamScheduleMatch) =>
        !(m.match === 16 && m.level === "Playoff" && finalsOver);
      if (showAll) {
        // Highlight the next unplayed match for any team
        const nextUnplayed = levelMatches.find(
          (m) => m.redScore == null && m.blueScore == null && skipM16(m),
        );
        highlightByLevel[section.level] = nextUnplayed?.match ?? null;
      } else {
        const nextOwner = levelMatches.find(
          (m) =>
            getAllianceForTeam(m, schedule.teamNumber) !== null &&
            m.redScore == null &&
            m.blueScore == null &&
            skipM16(m),
        );
        highlightByLevel[section.level] = nextOwner?.match ?? null;
      }
    }
  }

  // Livestream links — only show for active tournaments
  const isActiveTournament = activeTournaments.some(
    (t) => t.id === selectedTournamentId,
  );
  const webcastUrls: string[] = (() => {
    if (!isActiveTournament || !selectedTournament) return [];
    const raw = selectedTournament.webcasts;
    if (Array.isArray(raw)) return raw;
    if (typeof raw === "string" && raw.length > 0) {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      } catch { /* ignore */ }
    }
    return [];
  })();

  const title = schedule?.tournamentName || "Tournament Report";

  if (tournamentsLoading) {
    return (
      <main>
        <div className="page-header schedule-header">
          <h1>{title}</h1>
          <p><a href="#" onClick={handleBack}>&larr; Back</a></p>
        </div>
        <Spinner />
      </main>
    );
  }

  if (!selectedTournament) {
    const renderTournament = (t: RBTournament) => (
      <div className="tournament-row">
        <button
          className="tournament-btn"
          onClick={() => setManualTournament(t)}
        >
          {t.id.slice(String(t.season).length)}
        </button>
        <div className="tournament-info">
          <span className="tournament-name">{t.name}</span>
          <span className="tournament-date">
            {new Date(t.startTime).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
            {" – "}
            {new Date(t.endTime).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
          </span>
        </div>
      </div>
    );

    return (
      <main>
        <div className="page-header schedule-header">
          <h1>Tournament Report</h1>
          <p><a href="#" onClick={(e) => { e.preventDefault(); window.history.back(); }}>&larr; Back</a></p>
        </div>
        <p>Select a tournament to view its schedule.</p>
        {(tournamentsListLoading || tournamentsLoading) && <Spinner />}
        {!tournamentsListLoading && !tournamentsLoading && (
          <TournamentPicker
            tournaments={allTournaments}
            activeTournaments={activeTournaments}
            renderTournament={renderTournament}
            onSelectTournament={(t) => setManualTournament(t)}
            groupBy="week"
          />
        )}
      </main>
    );
  }

  if ((loading || !schedule) && !schedule) {
    return (
      <main>
        <div className="page-header schedule-header">
          <h1>{title}</h1>
          <p><a href="#" onClick={handleBack}>&larr; Back</a></p>
        </div>
        <Spinner />
      </main>
    );
  }

  if (error && !schedule) {
    return (
      <main>
        <div className="page-header schedule-header">
          <h1>{title}</h1>
          <p><a href="#" onClick={handleBack}>&larr; Back</a></p>
        </div>
        <p className="banner banner-warning">{error}</p>
      </main>
    );
  }

  if (!schedule) {
    return (
      <main>
        <div className="page-header schedule-header">
          <h1>{title}</h1>
          <p><a href="#" onClick={handleBack}>&larr; Back</a></p>
        </div>
        <Spinner />
      </main>
    );
  }

  if ((schedule.matches ?? []).length === 0 && !schedule.hasPractice && !schedule.hasQualification && !schedule.hasPlayoff) {
    return (
      <main>
        <div className="page-header schedule-header">
          <h1>{title}</h1>
          <p><a href="#" onClick={handleBack}>&larr; Back</a></p>
        </div>
        <section className="card">
          <p>Schedule data is being loaded for this tournament. It will appear here automatically within a few minutes.</p>
          <p className="schedule-countdown">Checking again in {countdown}s</p>
        </section>
      </main>
    );
  }

  return (
    <main>
      <div className="page-header schedule-header">
        <h1>
          {title}
          {refreshing && <span className="schedule-refresh-indicator"><Spinner /></span>}
        </h1>
        <p className="schedule-nav-row">
          <a href="#" onClick={handleBack}>&larr; Back</a>
          <button
            className="schedule-toggle-btn"
            onClick={() => setShowAll((prev) => !prev)}
          >
            {showAll ? `${schedule.teamNumber} Only` : "All Teams"}
          </button>
          {isSuperuser && (
            <a href={`/kiosk-pit/${schedule.tournamentId}`} target="_blank" rel="noopener noreferrer" className="schedule-toggle-btn" style={{ textDecoration: "none" }}>
              Kiosk View &#x2197;
            </a>
          )}
        </p>
      </div>
      <QueueBanner queueStatus={queueStatus} />
      {webcastUrls.length > 0 && (
        <div className="schedule-livestream-links">
          {webcastUrls.map((url, i) => {
            const isYt = /youtube\.com|youtu\.be/.test(url);
            const isTw = /twitch\.tv/.test(url);
            const label = isYt ? `YouTube${webcastUrls.filter(u => /youtube|youtu/.test(u)).length > 1 ? ` ${i + 1}` : ""}` : isTw ? "Twitch" : `Stream ${i + 1}`;
            return (
              <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="schedule-livestream-link">
                {label} &#x2197;
              </a>
            );
          })}
        </div>
      )}
      {scheduleSections.map((section) =>
        section.level === "Qualification" ? (
          <ScheduleTable
            key={section.level}
            label={section.label}
            level={section.level}
            matches={schedule.matches}
            ownerTeam={schedule.teamNumber}
            showAll={showAll}
            hasData={section.hasData}
            tournamentId={schedule.tournamentId}
            onFetchSchedule={handleFetchSchedule}
            fetching={fetching}
            countdown={countdown}
            ownerRank={ownerRank}
            ownerRp={ownerRp}
            ownerRs={ownerRs}
            loggedIn={loggedIn}
            highlightMatch={highlightByLevel[section.level]}
          />
        ) : section.level === "Playoff" && hasPlayoffBracket ? (
          <div key={section.level}>
            <section className="card schedule-bracket-section">
              <ScheduleAllianceList
                alliances={playoffAlliances}
                ownerTeam={schedule.teamNumber}
                rankings={schedule.rankings}
              />
              <ScheduleBracketSvg
                resolvedMatches={playoffResolved}
                ownerTeam={schedule.teamNumber}
                alliances={playoffAlliances}
              />
            </section>
            <ScheduleTable
              label={section.label}
              level={section.level}
              matches={schedule.matches}
              ownerTeam={schedule.teamNumber}
              showAll={showAll}
              hasData={section.hasData}
              tournamentId={schedule.tournamentId}
              onFetchSchedule={handleFetchSchedule}
              fetching={fetching}
              countdown={countdown}
              loggedIn={loggedIn}
              highlightMatch={highlightByLevel[section.level]}
            />
          </div>
        ) : (
          <ScheduleTable
            key={section.level}
            label={section.label}
            level={section.level}
            matches={schedule.matches}
            ownerTeam={schedule.teamNumber}
            showAll={showAll}
            hasData={section.hasData}
            tournamentId={schedule.tournamentId}
            onFetchSchedule={handleFetchSchedule}
            fetching={fetching}
            countdown={countdown}
            loggedIn={loggedIn}
            highlightMatch={highlightByLevel[section.level]}
          />
        ),
      )}
      <RankingsTable
        rankings={schedule.rankings}
        ownerTeam={schedule.teamNumber}
      />
      {queueStatus && queueStatus.teamStatus && (
        <p style={{ textAlign: "center", fontSize: "0.75rem", marginTop: "1rem" }}>
          Queueing data from{" "}
          <a href="https://frc.nexus" target="_blank" rel="noopener noreferrer">
            frc.nexus
          </a>
        </p>
      )}
    </main>
  );
};

const TeamSchedulePage = () => {
  return <TeamScheduleContent />;
};

export const TeamScheduleActivePage = () => {
  return <TeamScheduleContent autoSelect />;
};

export default TeamSchedulePage;
