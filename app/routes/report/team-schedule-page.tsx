import { useCallback, useEffect, useRef, useState } from "react";
import { NavLink } from "react-router";
import RequireLogin from "~/common/auth/RequireLogin.tsx";
import {
  fetchTournamentSchedule,
  getTeamSchedule,
} from "~/common/storage/rb.ts";
import { useActiveTeamTournaments } from "~/common/storage/dbhooks.ts";
import Spinner from "~/common/Spinner.tsx";
import type {
  TeamScheduleMatch,
  TeamScheduleResponse,
} from "~/types/TeamSchedule.ts";

const REFRESH_INTERVAL_ACTIVE_MS = 30_000;
const REFRESH_INTERVAL_IDLE_MS = 60_000;

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
  if (team === 0) return <td></td>;
  const isOwner = team === ownerTeam;
  return <td style={isOwner ? { fontWeight: 700 } : undefined}>{team}</td>;
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

function getAllianceForTeam(
  match: TeamScheduleMatch,
  teamNumber: number,
): "red" | "blue" | null {
  if (
    match.red1 === teamNumber ||
    match.red2 === teamNumber ||
    match.red3 === teamNumber ||
    match.red4 === teamNumber
  ) {
    return "red";
  }
  if (
    match.blue1 === teamNumber ||
    match.blue2 === teamNumber ||
    match.blue3 === teamNumber ||
    match.blue4 === teamNumber
  ) {
    return "blue";
  }
  return null;
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

  const alliance = getAllianceForTeam(match, ownerTeam);
  if (!alliance) {
    return <td></td>;
  }

  const rp = alliance === "red" ? match.redRp : match.blueRp;
  const won =
    (alliance === "red" && match.winningAlliance === 1) ||
    (alliance === "blue" && match.winningAlliance === 2);
  const result = won ? "W" : "L";

  return (
    <td>
      <strong>{result}</strong>
      {rp !== null && rp !== undefined ? ` ${rp}` : ""}
    </td>
  );
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
}) {
  const allLevelMatches = matches.filter((m) => m.level === level);
  const levelMatches = showAll
    ? allLevelMatches
    : allLevelMatches.filter((m) => getAllianceForTeam(m, ownerTeam) !== null);
  const showRed4 = hasRed4(levelMatches);
  const showBlue4 = hasBlue4(levelMatches);

  return (
    <section className="card schedule-card">
      <h3>{label} <span className="schedule-countdown">refreshing in {countdown}s</span></h3>
      {!hasData ? (
        <button onClick={onFetchSchedule} disabled={fetching}>
          {fetching ? "Fetching..." : "Fetch Schedule"}
        </button>
      ) : levelMatches.length === 0 ? (
        <p>No {label.toLowerCase()} matches scheduled.</p>
      ) : (
        <div className="schedule-table-wrapper">
          <table className="schedule-table">
            <thead>
              <tr>
                <th></th>
                <th></th>
                <th className="alliance-red-text">R1</th>
                <th className="alliance-red-text">R2</th>
                <th className="alliance-red-text">R3</th>
                {showRed4 && <th className="alliance-red-text">R4</th>}
                <th className="alliance-blue-text">B1</th>
                <th className="alliance-blue-text">B2</th>
                <th className="alliance-blue-text">B3</th>
                {showBlue4 && <th className="alliance-blue-text">B4</th>}
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

const TeamScheduleContent = () => {
  const { list: activeTournaments, loading: tournamentsLoading } =
    useActiveTeamTournaments();
  const [schedule, setSchedule] = useState<TeamScheduleResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const selectedTournament =
    activeTournaments.length > 0 ? activeTournaments[0] : null;
  const selectedTournamentId = selectedTournament?.id ?? null;
  const now = Date.now();
  const isInSession =
    selectedTournament != null &&
    new Date(selectedTournament.startTime).getTime() <= now &&
    new Date(selectedTournament.endTime).getTime() >= now;
  const refreshInterval = isInSession
    ? REFRESH_INTERVAL_ACTIVE_MS
    : REFRESH_INTERVAL_IDLE_MS;
  const countdownStart = refreshInterval / 1000;

  const loadSchedule = useCallback(
    async (tournamentId: string, isRefresh: boolean) => {
      if (isRefresh) setRefreshing(true);
      try {
        const data = await getTeamSchedule(tournamentId);
        setSchedule(data);
        setError(null);
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
    return (
      <main>
        <div className="page-header schedule-header">
          <h1>{title}</h1>
          <p><NavLink to="/">&larr; Home</NavLink></p>
        </div>
        <p>No active tournament found. Schedules are available during tournament weekends.</p>
      </main>
    );
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
      <ScheduleTable
        label="Practice"
        level="Practice"
        matches={schedule.matches}
        ownerTeam={schedule.teamNumber}
        showAll={showAll}
        hasData={schedule.hasPractice}
        tournamentId={schedule.tournamentId}
        onFetchSchedule={handleFetchSchedule}
        fetching={fetching}
        countdown={countdown}
      />
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
      />
    </main>
  );
};

const TeamSchedulePage = () => {
  return (
    <RequireLogin>
      <TeamScheduleContent />
    </RequireLogin>
  );
};

export default TeamSchedulePage;
