import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "react-router";
import {
  getActiveTeamTournaments,
  getTeamSchedulePublic,
  getNexusQueueStatus,
  getTournamentList,
} from "~/common/storage/rb.ts";
import type { RBTournament } from "~/types/RBTournament.ts";
import type {
  TeamScheduleResponse,
  TeamScheduleMatch,
  TeamRanking,
} from "~/types/TeamSchedule.ts";
import type { NexusQueueStatus } from "~/types/NexusQueueStatus.ts";
import logoUrl from "~/assets/images/logo.png";
import Title from "~/common/icons/Title.tsx";
import Spinner from "~/common/Spinner.tsx";
import {
  deriveAlliances,
  isFinalsDecided,
  resolveBracket,
  type Alliance,
  type ResolvedMatch,
} from "~/common/bracket.ts";
import BracketSvg from "~/common/BracketSvg.tsx";

const REFRESH_MS = 15_000;
const SCROLL_PX_PER_SEC = 18;
const KIOSK_TOURNAMENT_KEY = "raveneye-kiosk-tournament-id";

function AutoScrollViewport({
  children,
  deps,
}: {
  children: React.ReactNode;
  deps: unknown[];
}) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const [style, setStyle] = useState<React.CSSProperties>({});

  useEffect(() => {
    const viewport = viewportRef.current;
    const inner = innerRef.current;
    if (!viewport || !inner) return;
    const overflow = inner.scrollHeight - viewport.clientHeight;
    if (overflow > 0) {
      const duration = (inner.scrollHeight * 2) / SCROLL_PX_PER_SEC;
      setStyle({
        "--scroll-duration": `${duration}s`,
        "--scroll-distance": `${-overflow}px`,
      } as React.CSSProperties);
    } else {
      setStyle({});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return (
    <div ref={viewportRef} style={{ flex: 1, overflow: "hidden" }}>
      <div ref={innerRef} className="kiosk-scroll-inner" style={style}>
        {children}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getAllianceForTeam(
  match: TeamScheduleMatch,
  teamNumber: number,
): "red" | "blue" | null {
  if (
    match.red1 === teamNumber ||
    match.red2 === teamNumber ||
    match.red3 === teamNumber ||
    match.red4 === teamNumber
  )
    return "red";
  if (
    match.blue1 === teamNumber ||
    match.blue2 === teamNumber ||
    match.blue3 === teamNumber ||
    match.blue4 === teamNumber
  )
    return "blue";
  return null;
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

type WebcastProvider = "youtube" | "twitch" | "unknown";

interface ParsedWebcast {
  provider: WebcastProvider;
  embedUrl: string;
  label: string;
}

function parseWebcast(url: string): ParsedWebcast {
  // YouTube
  const ytMatch =
    url.match(/youtube\.com\/watch\?v=([^&]+)/) ||
    url.match(/youtu\.be\/([^?]+)/) ||
    url.match(/youtube\.com\/live\/([^?]+)/);
  if (ytMatch) {
    return {
      provider: "youtube",
      embedUrl: `https://www.youtube.com/embed/${ytMatch[1]}?autoplay=1&mute=1&rel=0&enablejsapi=1`,
      label: "YouTube",
    };
  }
  // Twitch
  const twMatch = url.match(/twitch\.tv\/([^/?]+)/);
  if (twMatch) {
    return {
      provider: "twitch",
      embedUrl: `https://player.twitch.tv/?channel=${twMatch[1]}&parent=${window.location.hostname}&muted=true`,
      label: "Twitch",
    };
  }
  return { provider: "unknown", embedUrl: url, label: "Stream" };
}


// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function Clock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  const hh = now.getHours().toString().padStart(2, "0");
  const mm = now.getMinutes().toString().padStart(2, "0");
  const ss = now.getSeconds().toString().padStart(2, "0");
  return <span className="kiosk-clock">{hh}:{mm}:{ss}</span>;
}

function TopBar({
  queueStatus,
  webcasts,
  activeWebcast,
  onSelectWebcast,
  onChangeTournament,
}: {
  queueStatus: NexusQueueStatus | null;
  webcasts: ParsedWebcast[];
  activeWebcast: number;
  onSelectWebcast: (i: number) => void;
  onChangeTournament?: () => void;
}) {
  const startTime = formatQueueTime(queueStatus?.estimatedStartTime ?? null);
  const queueTime = formatQueueTime(queueStatus?.estimatedQueueTime ?? null);

  const status = queueStatus?.teamStatus ?? null;
  const barClass = status === "On field"
    ? "kiosk-bar-onfield"
    : status === "On deck"
      ? "kiosk-bar-ondeck"
      : status === "Now queuing"
        ? "kiosk-bar-queuing"
        : status === "Queuing soon"
          ? "kiosk-bar-soon"
          : "kiosk-bar-idle";

  return (
    <div className={`kiosk-top-bar ${barClass}`}>
      <a href="/report/schedule/active" className="kiosk-brand">
        <img src={logoUrl} alt="" className="kiosk-logo" />
        <Title />
      </a>
      <div className="kiosk-queue-status">
        {queueStatus?.teamStatus && (
          <>
            {queueStatus.teamMatchLabel && (
              <span
                className={`kiosk-queue-badge ${queueStatus.teamAlliance ? `queue-alliance-${queueStatus.teamAlliance}` : ""}`}
              >
                {queueStatus.teamMatchLabel}
              </span>
            )}
            <span>{queueStatus.teamStatus}</span>
            {queueStatus.nowQueuing && (
              <>
                <span className="kiosk-queue-sep">&middot;</span>
                <span className="kiosk-queue-dim">Queuing</span>{" "}
                {queueStatus.nowQueuing}
              </>
            )}
            {queueTime && (
              <>
                <span className="kiosk-queue-sep">&middot;</span>
                <span className="kiosk-queue-dim">Queue</span> {queueTime}
              </>
            )}
            {startTime && (
              <>
                <span className="kiosk-queue-sep">&middot;</span>
                <span className="kiosk-queue-dim">Start</span> {startTime}
              </>
            )}
          </>
        )}
      </div>
      <Clock />
      <div className="kiosk-stream-tabs">
        {webcasts.length > 1 &&
          webcasts.map((w, i) => (
            <button
              key={i}
              className={`kiosk-stream-tab ${i === activeWebcast ? "active" : ""}`}
              onClick={() => onSelectWebcast(i)}
            >
              {w.label}
            </button>
          ))}
        {onChangeTournament && (
          <button
            className="kiosk-stream-tab kiosk-change-tournament"
            onClick={onChangeTournament}
          >
            Change tournament
          </button>
        )}
      </div>
    </div>
  );
}

function OwnerScoresPanel({
  matches,
  ownerTeam,
  countdown,
}: {
  matches: TeamScheduleMatch[];
  ownerTeam: number;
  countdown: number;
}) {
  const ownerMatches = matches.filter(
    (m) => getAllianceForTeam(m, ownerTeam) !== null,
  );
  // Show scored matches, oldest first (Practice → Qualification → Playoff)
  const scored = ownerMatches
    .filter((m) => m.winningAlliance !== 0)
    .sort(compareByLevelThenMatch);

  return (
    <div className="kiosk-owner-scores">
      <h2 className="kiosk-section-title">
        1310 Scores
        {scored.length > 0 && (() => {
          let wins = 0;
          let losses = 0;
          for (const m of scored) {
            const a = getAllianceForTeam(m, ownerTeam)!;
            const w = (a === "red" && m.winningAlliance === 1) || (a === "blue" && m.winningAlliance === 2);
            if (w) wins++; else losses++;
          }
          return (
            <span className="kiosk-wl-tally">{wins}W  {losses}L</span>
          );
        })()}
        <span className="kiosk-countdown">{countdown}s</span>
      </h2>
      <div>
        <table className="kiosk-owner-scores-table">
          <thead>
            <tr>
              <th>Match</th>
              <th>Score</th>
              <th>W/L</th>
            </tr>
          </thead>
          <tbody>
            {scored.length === 0 && (
              <tr>
                <td colSpan={3} className="kiosk-owner-scores-empty">
                  No scores yet
                </td>
              </tr>
            )}
            {scored.map((m) => {
              const alliance = getAllianceForTeam(m, ownerTeam)!;
              const won =
                (alliance === "red" && m.winningAlliance === 1) ||
                (alliance === "blue" && m.winningAlliance === 2);
              const rp = alliance === "red" ? m.redRp : m.blueRp;
              return (
                <tr key={`${m.level}-${m.match}`}>
                  <td className={`kiosk-match-num ${alliance === "red" ? "kiosk-score-red" : "kiosk-score-blue"}`}>{levelPrefix(m.level)}{m.match}</td>
                  <td>
                  <span className={"kiosk-score-red"}>{m.redScore}</span>-
                    <span className="kiosk-score-blue">{m.blueScore}</span>
                  </td>
                  <td>
                    {won ? "W" : "L"}{rp != null ? rp : ""}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function RankingsPanel({
  rankings,
  ownerTeam,
}: {
  rankings: TeamRanking[];
  ownerTeam: number;
}) {
  return (
    <div className="kiosk-rankings">
      <table className="kiosk-rankings-table kiosk-rankings-header">
        <colgroup>
          <col style={{ width: "30%" }} />
          <col style={{ width: "40%" }} />
          <col style={{ width: "30%" }} />
        </colgroup>
        <thead>
          <tr>
            <th>Rank</th>
            <th>Team</th>
            <th>RP</th>
          </tr>
        </thead>
      </table>
      <AutoScrollViewport deps={[rankings.length]}>
        <table className="kiosk-rankings-table">
          <colgroup>
            <col style={{ width: "30%" }} />
            <col style={{ width: "40%" }} />
            <col style={{ width: "30%" }} />
          </colgroup>
          <tbody>
            {rankings.map((r, idx) => (
              <tr
                key={r.teamNumber}
                className={
                  r.teamNumber === ownerTeam ? "kiosk-rank-owner" : ""
                }
              >
                <td>{idx + 1}</td>
                <td>{r.teamNumber}</td>
                <td>{r.rp}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </AutoScrollViewport>
    </div>
  );
}

function VideoEmbed({ webcast }: { webcast: ParsedWebcast | null }) {
  if (!webcast) return null;
  return (
    <div className="kiosk-video-wrapper">
      <iframe
        src={webcast.embedUrl}
        title="Livestream"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
        referrerPolicy="no-referrer-when-downgrade"
      />
    </div>
  );
}

function levelPrefix(level: string): string {
  if (level === "Practice") return "P";
  if (level === "Qualification") return "Q";
  if (level === "Playoff") return "E";
  return "";
}

function levelOrder(level: string): number {
  if (level === "Practice") return 0;
  if (level === "Qualification") return 1;
  if (level === "Playoff") return 2;
  return 3;
}

function compareByLevelThenMatch(
  a: TeamScheduleMatch,
  b: TeamScheduleMatch,
): number {
  const lo = levelOrder(a.level) - levelOrder(b.level);
  return lo !== 0 ? lo : a.match - b.match;
}

function SchedulePanel({
  matches,
  ownerTeam,
  highlightMatch,
  rankings,
}: {
  matches: TeamScheduleMatch[];
  ownerTeam: number;
  highlightMatch: number | null;
  rankings: TeamRanking[];
}) {
  const rankByTeam = new Map<number, number>();
  rankings.forEach((r, i) => rankByTeam.set(r.teamNumber, i + 1));

  const allOwner = matches.filter(
    (m) => getAllianceForTeam(m, ownerTeam) !== null,
  );
  // Once quals have started, practice matches are effectively "done" even if
  // they never got scored — move them down with the completed matches.
  const qualsStarted = matches.some(
    (m) => m.level === "Qualification" && m.winningAlliance !== 0,
  );
  const isDone = (m: TeamScheduleMatch) =>
    m.winningAlliance !== 0 || (qualsStarted && m.level === "Practice");
  const upcoming = allOwner
    .filter((m) => !isDone(m))
    .sort(compareByLevelThenMatch);
  const completed = allOwner
    .filter(isDone)
    .sort((a, b) => -compareByLevelThenMatch(a, b));

  const viewportRef = useRef<HTMLDivElement>(null);
  const highlightRowRef = useRef<HTMLTableRowElement>(null);

  // Scroll so the next match is at the top of the viewport
  useEffect(() => {
    if (highlightRowRef.current && viewportRef.current) {
      const rowTop = highlightRowRef.current.offsetTop;
      viewportRef.current.scrollTop = Math.max(0, rowTop);
    }
  }, [highlightMatch]);

  function renderRow(m: TeamScheduleMatch, ref?: React.Ref<HTMLTableRowElement>) {
    const alliance = getAllianceForTeam(m, ownerTeam)!;
    const isHighlight = highlightMatch === m.match;
    const rowClass = [
      alliance === "red" ? "kiosk-row-our-red" : "kiosk-row-our-blue",
      isHighlight ? "kiosk-row-highlight" : "",
    ]
      .filter(Boolean)
      .join(" ");
    const redTeams = [m.red1, m.red2, m.red3, m.red4].filter(Boolean);
    const blueTeams = [m.blue1, m.blue2, m.blue3, m.blue4].filter(Boolean);
    const hasScore =
      m.redScore != null && m.blueScore != null && m.winningAlliance !== 0;
    return (
      <tr key={`${m.level}-${m.match}`} className={rowClass} ref={ref}>
        <td className="kiosk-match-num">
          {levelPrefix(m.level)}{m.match}
        </td>
        <td className="kiosk-match-time">
          {formatMatchTime(m.startTime)}
        </td>
        <td className="kiosk-alliance-cell kiosk-col-red">
          {redTeams.map((t) => (
            <span key={t} className={t === ownerTeam ? "kiosk-team-owner" : ""}>
              {t}{rankByTeam.has(t) && <span className="kiosk-team-rank">({rankByTeam.get(t)})</span>}
            </span>
          ))}
        </td>
        <td className="kiosk-alliance-cell kiosk-col-blue">
          {blueTeams.map((t) => (
            <span key={t} className={t === ownerTeam ? "kiosk-team-owner" : ""}>
              {t}{rankByTeam.has(t) && <span className="kiosk-team-rank">({rankByTeam.get(t)})</span>}
            </span>
          ))}
        </td>
        <td className="kiosk-score-cell">
          {hasScore ? (
            <>
              <span className="kiosk-score-red">{m.redScore}</span>
              {"-"}
              <span className="kiosk-score-blue">{m.blueScore}</span>
            </>
          ) : (
            ""
          )}
        </td>
      </tr>
    );
  }

  return (
    <div className="kiosk-schedule">
      <div className="kiosk-schedule-viewport" ref={viewportRef}>
        <table className="kiosk-schedule-table">
          <tbody>
            {upcoming.map((m) =>
              renderRow(m, highlightMatch === m.match ? highlightRowRef : undefined),
            )}
            {completed.length > 0 && upcoming.length > 0 && (
              <tr className="kiosk-schedule-separator">
                <td colSpan={5}></td>
              </tr>
            )}
            {completed.map((m) => renderRow(m))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Playoff components
// ---------------------------------------------------------------------------

function AllianceListPanel({
  alliances,
  ownerTeam,
  countdown,
  rankings,
}: {
  alliances: Alliance[];
  ownerTeam: number;
  countdown: number;
  rankings: TeamRanking[];
}) {
  const rankByTeam = new Map<number, number>();
  rankings.forEach((r, i) => rankByTeam.set(r.teamNumber, i + 1));

  return (
    <div className="kiosk-alliance-list">
      <h2 className="kiosk-section-title">
        Alliances
        <span className="kiosk-countdown">{countdown}s</span>
      </h2>
      <div className="kiosk-alliance-cards">
        {alliances.map((a) => (
          <div
            key={a.seed}
            className={[
              "kiosk-alliance-card",
              a.isOwner ? "kiosk-alliance-owner" : "",
              a.eliminated ? "kiosk-alliance-eliminated" : "",
            ]
              .filter(Boolean)
              .join(" ")}
          >
            <span className="kiosk-alliance-seed">{a.seed}</span>
            <span className="kiosk-alliance-teams">
              {a.teams.map((t) => (
                <span key={t} className={[
                  t === ownerTeam ? "kiosk-alliance-owner-team" : "",
                  t === a.captain ? "kiosk-alliance-captain" : "",
                ].filter(Boolean).join(" ")}>
                  {t}
                  {rankByTeam.has(t) && (
                    <span className="kiosk-alliance-team-rank">({rankByTeam.get(t)})</span>
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

// ---------------------------------------------------------------------------
// SVG Bracket — FRC double-elimination style
// ---------------------------------------------------------------------------

// Layout: explicit x,y positions for each match to replicate the FRC manual bracket.
function BracketPanel({
  resolvedMatches,
  ownerTeam,
  captains,
}: {
  resolvedMatches: ResolvedMatch[];
  ownerTeam: number;
  captains: Set<number>;
}) {
  return (
    <div className="kiosk-bracket">
      <BracketSvg resolvedMatches={resolvedMatches} ownerTeam={ownerTeam} captains={captains} darkOnly />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function PitKioskPage() {
  const { tournamentId: paramTournamentId } = useParams();
  const [tournament, setTournament] = useState<RBTournament | null>(null);
  const [pickerChoices, setPickerChoices] = useState<RBTournament[] | null>(
    null,
  );
  const [schedule, setSchedule] = useState<TeamScheduleResponse | null>(null);
  const [queueStatus, setQueueStatus] = useState<NexusQueueStatus | null>(
    null,
  );
  const [activeWebcast, setActiveWebcast] = useState(0);
  const [loading, setLoading] = useState(true);
  const [countdown, setCountdown] = useState(REFRESH_MS / 1000);
  const [reloadKey, setReloadKey] = useState(0);

  // Hide app header/footer
  useEffect(() => {
    const layout = document.getElementById("layout");
    if (layout) layout.classList.add("kiosk-active");
    return () => {
      layout?.classList.remove("kiosk-active");
    };
  }, []);

  // Load tournament: use URL param if provided; otherwise choose from the
  // active list (remembering a prior choice when 2+ are active).
  useEffect(() => {
    if (paramTournamentId) {
      getTournamentList()
        .then((list) => {
          const found = list.find((t) => t.id === paramTournamentId);
          setTournament(found ?? { id: paramTournamentId } as RBTournament);
          setPickerChoices(null);
        })
        .catch(() => setTournament({ id: paramTournamentId } as RBTournament))
        .finally(() => setLoading(false));
      return;
    }
    getActiveTeamTournaments()
      .then((active) => {
        if (active.length === 0) {
          setTournament(null);
          setPickerChoices(null);
          return;
        }
        if (active.length === 1) {
          setTournament(active[0]);
          setPickerChoices(null);
          localStorage.setItem(KIOSK_TOURNAMENT_KEY, active[0].id);
          return;
        }
        const stored = localStorage.getItem(KIOSK_TOURNAMENT_KEY);
        const remembered = stored
          ? active.find((t) => t.id === stored)
          : undefined;
        if (remembered) {
          setTournament(remembered);
          setPickerChoices(null);
        } else {
          setTournament(null);
          setPickerChoices(active);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [paramTournamentId, reloadKey]);

  const choosePickerTournament = (t: RBTournament) => {
    localStorage.setItem(KIOSK_TOURNAMENT_KEY, t.id);
    setTournament(t);
    setPickerChoices(null);
  };

  const changeTournament = () => {
    localStorage.removeItem(KIOSK_TOURNAMENT_KEY);
    setTournament(null);
    setSchedule(null);
    setQueueStatus(null);
    setLoading(true);
    setReloadKey((k) => k + 1);
  };

  const tournamentId = tournament?.id ?? null;

  const loadData = useCallback(
    async (tid: string) => {
      try {
        const data = await getTeamSchedulePublic(tid);
        setSchedule(data);
        const ownerInMatches = (data.matches ?? []).some(
          (m) => getAllianceForTeam(m, data.teamNumber) !== null,
        );
        if (ownerInMatches) {
          getNexusQueueStatus(tid).then(setQueueStatus);
        } else {
          setQueueStatus(null);
        }
      } catch {
        // Silently retry on next interval
      }
    },
    [],
  );

  // Auto-refresh every 15s with countdown
  useEffect(() => {
    if (!tournamentId) return;
    loadData(tournamentId);
    setCountdown(REFRESH_MS / 1000);
    const refreshInterval = setInterval(() => {
      loadData(tournamentId);
      setCountdown(REFRESH_MS / 1000);
    }, REFRESH_MS);
    const countdownInterval = setInterval(() => {
      setCountdown((c) => (c > 1 ? c - 1 : c));
    }, 1000);
    return () => {
      clearInterval(refreshInterval);
      clearInterval(countdownInterval);
    };
  }, [tournamentId, loadData]);

  const matches = schedule?.matches ?? [];
  const rankings = schedule?.rankings ?? [];
  const ownerTeam = schedule?.teamNumber ?? 1310;

  // Playoff mode detection
  const playoffMatches = matches.filter((m) => m.level === "Playoff");
  const isPlayoffMode =
    schedule?.hasPlayoff === true && playoffMatches.length >= 4;
  const alliances = isPlayoffMode
    ? deriveAlliances(playoffMatches, ownerTeam, rankings)
    : [];
  const captains = new Set(alliances.map((a) => a.captain).filter(Boolean) as number[]);
  const resolvedMatches = isPlayoffMode ? resolveBracket(playoffMatches) : [];

  // Highlight the owner team's next unplayed match (skip M16 if finals decided)
  const finalsOver = isFinalsDecided(resolvedMatches);
  const qualsStarted = matches.some(
    (m) => m.level === "Qualification" && m.winningAlliance !== 0,
  );
  const nextOwnerMatch = [...matches]
    .sort(compareByLevelThenMatch)
    .find(
      (m) =>
        getAllianceForTeam(m, ownerTeam) !== null &&
        m.redScore == null &&
        m.blueScore == null &&
        !(qualsStarted && m.level === "Practice") &&
        !(m.match === 16 && m.level === "Playoff" && finalsOver),
    );
  const highlightMatch = nextOwnerMatch?.match ?? null;

  // Parse webcasts from tournament. Backend stores as JSON string, so handle both formats.
  let webcastUrls: string[] = [];
  const raw = tournament?.webcasts;
  if (Array.isArray(raw)) {
    webcastUrls = raw;
  } else if (typeof raw === "string" && raw.length > 0) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) webcastUrls = parsed;
    } catch { /* ignore */ }
  }
  const webcasts: ParsedWebcast[] = webcastUrls.map((url, i) => {
    const parsed = parseWebcast(url);
    // Label duplicate providers with a number for clarity
    const sameProviderCount = webcastUrls
      .slice(0, i)
      .filter((u) => parseWebcast(u).provider === parsed.provider).length;
    if (sameProviderCount > 0) {
      parsed.label = `${parsed.label} ${sameProviderCount + 1}`;
    }
    return parsed;
  });
  const hasVideo = webcasts.length > 0;

  if (loading) {
    return (
      <main className="kiosk kiosk-loading">
        <Spinner />
      </main>
    );
  }

  if (pickerChoices) {
    return (
      <main className="kiosk kiosk-loading">
        <div className="kiosk-picker">
          <h2>Select a tournament</h2>
          <p>Multiple tournaments are active. Pick one for this kiosk.</p>
          {pickerChoices.map((t) => (
            <button
              key={t.id}
              className="kiosk-picker-btn"
              onClick={() => choosePickerTournament(t)}
            >
              <span className="kiosk-picker-code">
                {t.id.slice(String(t.season).length)}
              </span>
              <span className="kiosk-picker-name">{t.name}</span>
            </button>
          ))}
        </div>
      </main>
    );
  }

  if (!tournament) {
    return (
      <main className="kiosk kiosk-loading">
        <p>No active tournament found.</p>
      </main>
    );
  }

  const isLocal = window.location.hostname === "localhost";
  const kioskClass = [
    "kiosk",
    !hasVideo ? "kiosk-no-video" : "",
    isPlayoffMode ? "kiosk-playoff" : "",
    isLocal ? "kiosk-dev" : "",
  ].filter(Boolean).join(" ");

  return (
    <main className={kioskClass}>
      <TopBar
        queueStatus={queueStatus}
        webcasts={webcasts}
        activeWebcast={activeWebcast}
        onSelectWebcast={setActiveWebcast}
        onChangeTournament={!paramTournamentId ? changeTournament : undefined}
      />
      <div className="kiosk-left">
        {isPlayoffMode ? (
          <AllianceListPanel
            alliances={alliances}
            ownerTeam={ownerTeam}
            countdown={countdown}
            rankings={rankings}
          />
        ) : (
          <>
            <OwnerScoresPanel matches={matches} ownerTeam={ownerTeam} countdown={countdown} />
            <RankingsPanel rankings={rankings} ownerTeam={ownerTeam} />
          </>
        )}
      </div>
      <div className="kiosk-main">
        {hasVideo && (
          <VideoEmbed webcast={webcasts[activeWebcast] ?? webcasts[0]} />
        )}
        {isPlayoffMode ? (
          <BracketPanel
            resolvedMatches={resolvedMatches}
            ownerTeam={ownerTeam}
            captains={captains}
          />
        ) : (
          <SchedulePanel
            matches={matches}
            ownerTeam={ownerTeam}
            highlightMatch={highlightMatch}
            rankings={rankings}
          />
        )}
      </div>
    </main>
  );
}
