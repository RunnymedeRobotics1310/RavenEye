import { useCallback, useEffect, useRef, useState } from "react";
import { NavLink } from "react-router";
import {
  fetchTournamentSchedule,
  getActiveTeamTournaments,
  getNexusQueueStatus,
  getTeamSchedulePublic,
  getTournamentList,
} from "~/common/storage/rb.ts";
import { useLoginStatus } from "~/common/storage/rbauth.ts";
import Spinner from "~/common/Spinner.tsx";
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
}: {
  match: TeamScheduleMatch;
  ownerTeam: number;
}) {
  if (match.winningAlliance === 0 || match.redScore === null || match.blueScore === null) {
    return <td></td>;
  }

  const redRp = match.redRp ?? 0;
  const blueRp = match.blueRp ?? 0;
  const alliance = getAllianceForTeam(match, ownerTeam);
  const won =
    alliance === "red" ? match.winningAlliance === 1 :
    alliance === "blue" ? match.winningAlliance === 2 :
    null;

  return (
    <td className="schedule-score-cell">
      <span className="alliance-red-text">{redRp}</span>
      {":"}
      <span className="alliance-blue-text">{blueRp}</span>
      {won !== null && <> {won ? "W" : "L"}</>}
    </td>
  );
}

function formatQueueTime(unixMs: number | null): string | null {
  if (unixMs == null) return null;
  const date = new Date(unixMs);
  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function QueueBanner({ queueStatus }: { queueStatus: NexusQueueStatus | null }) {
  if (!queueStatus || !queueStatus.teamStatus) return null;

  const allianceClass = queueStatus.teamAlliance
    ? `alliance-${queueStatus.teamAlliance}-text`
    : "";
  const startTime = formatQueueTime(queueStatus.estimatedStartTime);

  return (
    <div className="banner banner-queue">
      <span className={allianceClass} style={{ fontWeight: 700 }}>
        {queueStatus.teamMatchLabel}
      </span>
      {" — "}
      {queueStatus.teamStatus}
      {startTime && <> (est. {startTime})</>}
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
}) {
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
                <th>RP</th>
              </tr>
            </thead>
            <tbody>
              {levelMatches.map((m) => {
                const alliance = getAllianceForTeam(m, ownerTeam);
                const rowClass = alliance
                  ? alliance === "red"
                    ? "schedule-row-our-red"
                    : "schedule-row-our-blue"
                  : "";
                return (
                  <tr key={`${m.level}-${m.match}`} className={rowClass}>
                    <td className="schedule-match-num">{m.match}</td>
                    <td className="schedule-time">
                      {m.startTime || ""}
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
                    <RpCell match={m} ownerTeam={ownerTeam} />
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
  if (rankings.length === 0) return null;

  return (
    <section id="rankings" className="card schedule-card">
      <h3>Rankings</h3>
      <div className="schedule-table-wrapper">
        <table className="schedule-table rankings-table">
          <thead>
            <tr>
              <th>Rank</th>
              <th>Team</th>
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

function TournamentPicker({ onSelect }: { onSelect: (t: RBTournament) => void }) {
  const [tournaments, setTournaments] = useState<RBTournament[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getTournamentList()
      .then((all) => {
        const now = Date.now();
        const currentYear = new Date().getFullYear();
        setTournaments(
          all.filter((t) => t.season === currentYear && new Date(t.startTime).getTime() <= now),
        );
      })
      .catch((e) => console.error("Failed to load tournaments", e))
      .finally(() => setLoading(false));
  }, []);

  return (
    <main>
      <div className="page-header schedule-header">
        <h1>Team Schedule</h1>
        <p><NavLink to="/">&larr; Home</NavLink></p>
      </div>
      <p>No active tournament found. Select a tournament to view its schedule.</p>
      {loading && <Spinner />}
      {!loading && tournaments.length === 0 && <p>No tournaments available.</p>}
      {!loading && tournaments.length > 0 && (
        <section className="card">
          <ul className="nav-list">
            {tournaments.map((t) => (
              <li key={t.id}>
                <button className="btn-secondary" onClick={() => onSelect(t)}>
                  {t.name}
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}

const TeamScheduleContent = () => {
  const { list: activeTournaments, loading: tournamentsLoading } =
    useActiveTeamTournamentsFromApi();
  const { loggedIn } = useLoginStatus();
  const [schedule, setSchedule] = useState<TeamScheduleResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [queueStatus, setQueueStatus] = useState<NexusQueueStatus | null>(null);
  const [countdown, setCountdown] = useState(60);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [manualTournament, setManualTournament] = useState<RBTournament | null>(null);

  const selectedTournament =
    activeTournaments.length > 0 ? activeTournaments[0] : manualTournament;
  const selectedTournamentId = selectedTournament?.id ?? null;
  const matches = schedule?.matches ?? [];

  const hasScored = matches.some((m) => m.winningAlliance !== 0);
  const hasUnscored = matches.some((m) => m.winningAlliance === 0);
  const isActive = hasScored && hasUnscored;
  const refreshInterval = isActive
    ? REFRESH_INTERVAL_ACTIVE_MS
    : REFRESH_INTERVAL_IDLE_MS;
  const countdownStart = refreshInterval / 1000;

  const loadSchedule = useCallback(
    async (tournamentId: string, isRefresh: boolean) => {
      if (isRefresh) setRefreshing(true);
      try {
        const data = await getTeamSchedulePublic(tournamentId);
        setSchedule(data);
        setError(null);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load schedule");
      } finally {
        if (isRefresh) setRefreshing(false);
      }
      if (loggedIn) {
        getNexusQueueStatus(tournamentId).then(setQueueStatus);
      }
    },
    [loggedIn],
  );

  useEffect(() => {
    if (!selectedTournamentId) return;
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
  const title = schedule?.tournamentName || "Team Schedule";

  if (tournamentsLoading) {
    return (
      <main>
        <div className="page-header schedule-header">
          <h1>{title}</h1>
          <p><NavLink to="/">&larr; Home</NavLink></p>
        </div>
        <Spinner />
      </main>
    );
  }

  if (!selectedTournament) {
    return <TournamentPicker onSelect={(t) => setManualTournament(t)} />;
  }

  if ((loading || !schedule) && !schedule) {
    return (
      <main>
        <div className="page-header schedule-header">
          <h1>{title}</h1>
          <p><NavLink to="/">&larr; Home</NavLink></p>
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
          <p><NavLink to="/">&larr; Home</NavLink></p>
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
          <p><NavLink to="/">&larr; Home</NavLink></p>
        </div>
        <Spinner />
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
          <NavLink to="/">&larr; Home</NavLink>
          <button
            className="schedule-toggle-btn"
            onClick={() => setShowAll((prev) => !prev)}
          >
            {showAll ? `${schedule.teamNumber} Only` : "All Teams"}
          </button>
        </p>
      </div>
      <QueueBanner queueStatus={queueStatus} />
      {/*<ScheduleTable*/}
      {/*  label="Practice"*/}
      {/*  level="Practice"*/}
      {/*  matches={schedule.matches}*/}
      {/*  ownerTeam={schedule.teamNumber}*/}
      {/*  showAll={showAll}*/}
      {/*  hasData={schedule.hasPractice}*/}
      {/*  tournamentId={schedule.tournamentId}*/}
      {/*  onFetchSchedule={handleFetchSchedule}*/}
      {/*  fetching={fetching}*/}
      {/*  countdown={countdown}*/}
      {/*  loggedIn={loggedIn}*/}
      {/*/>*/}
      <ScheduleTable
        label="Qualification"
        level="Qualification"
        matches={schedule.matches}
        ownerTeam={schedule.teamNumber}
        showAll={showAll}
        hasData={schedule.hasQualification}
        tournamentId={schedule.tournamentId}
        onFetchSchedule={handleFetchSchedule}
        fetching={fetching}
        countdown={countdown}
        ownerRank={ownerRank}
        ownerRp={ownerRp}
        ownerRs={ownerRs}
        loggedIn={loggedIn}
      />
      <ScheduleTable
        label="Elimination"
        level="Playoff"
        matches={schedule.matches}
        ownerTeam={schedule.teamNumber}
        showAll={showAll}
        hasData={schedule.hasPlayoff}
        tournamentId={schedule.tournamentId}
        onFetchSchedule={handleFetchSchedule}
        fetching={fetching}
        countdown={countdown}
        loggedIn={loggedIn}
      />
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

export default TeamSchedulePage;
