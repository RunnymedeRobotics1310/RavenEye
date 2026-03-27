import { useEffect, useRef, useState } from "react";
import type { TrackScreenProps } from "~/routes/track/track-home-page";
import type { RBTournament } from "~/types/RBTournament.ts";
import {
  useActiveTeamTournaments,
  useTournamentList,
} from "~/common/storage/dbhooks.ts";
import {
  getScoutingSession,
  setScoutingSession,
} from "~/common/storage/track.ts";
import { getUserid } from "~/common/storage/rbauth.ts";
import Spinner from "~/common/Spinner.tsx";
import TrackNav from "~/common/track/TrackNav.tsx";
import { useTrackNav } from "~/common/track/TrackNavContext.tsx";

function groupByWeek(
  tournaments: RBTournament[],
): Map<number, RBTournament[]> {
  const groups = new Map<number, RBTournament[]>();
  for (const t of tournaments) {
    const list = groups.get(t.weekNumber) ?? [];
    list.push(t);
    groups.set(t.weekNumber, list);
  }
  return groups;
}

const CompStart = ({}: TrackScreenProps) => {
  const { navigate } = useTrackNav();
  const { list: activeTeamTournaments, loading: activeLoading } =
    useActiveTeamTournaments();
  const { list: allTournaments, loading: allLoading } = useTournamentList();
  const loading = activeLoading || allLoading;

  const [filterInput, setFilterInput] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const filterRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!loading && filterRef.current) {
      filterRef.current.focus();
    }
  }, [loading]);

  const currentYear = new Date().getFullYear();
  const seasonTournaments = allTournaments
    .filter((t) => t.season === currentYear)
    .sort(
      (a, b) =>
        new Date(a.startTime).getTime() - new Date(b.startTime).getTime(),
    );

  const now = new Date();

  const isFuture = (t: { startTime: Date }) => new Date(t.startTime) > now;

  const formatDate = (date: Date) =>
    new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });

  const selectTournament = (tournamentId: string) => {
    setScoutingSession({
      ...getScoutingSession(),
      userId: getUserid(),
      tournamentId,
    });
    navigate("comp-level");
  };

  const filterLower = filterInput.toLowerCase();
  const filteredTournaments = filterInput
    ? seasonTournaments.filter(
        (t) =>
          t.name.toLowerCase().includes(filterLower) ||
          t.id.toLowerCase().includes(filterLower),
      )
    : seasonTournaments;

  const suggestions = filterInput
    ? filteredTournaments.slice(0, 8)
    : [];

  const weekGroups = groupByWeek(filteredTournaments);

  if (loading) {
    return (
      <main>
        <Spinner />
      </main>
    );
  }

  return (
    <main className="track scout-select">
      <div>
        <TrackNav />

        {activeTeamTournaments.length > 0 && (
          <div className="card">
            <h2>Active Competition</h2>
            {activeTeamTournaments.map((t) => (
              <div key={t.id} className="tournament-row">
                <button
                  className="tournament-btn"
                  onClick={() => selectTournament(t.id)}
                >
                  {t.id.slice(String(t.season).length)}
                </button>
                <div className="tournament-info">
                  <span className="tournament-name">{t.name}</span>
                  <span className="tournament-date">
                    {formatDate(t.startTime)} – {formatDate(t.endTime)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="card">
          <h2>All {currentYear} Events</h2>
          <div className="typeahead">
            <input
              ref={filterRef}
              className="form-field"
              type="text"
              placeholder="Filter by name or code..."
              value={filterInput}
              onChange={(e) => {
                setFilterInput(e.target.value);
                setShowSuggestions(true);
              }}
              onFocus={() => setShowSuggestions(true)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && suggestions.length === 1) {
                  selectTournament(suggestions[0].id);
                }
              }}
            />
            {showSuggestions && filterInput && suggestions.length > 0 && (
              <ul className="typeahead-suggestions">
                {suggestions.map((t) => (
                  <li key={t.id}>
                    <button
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => {
                        setShowSuggestions(false);
                        selectTournament(t.id);
                      }}
                    >
                      {t.id.slice(String(t.season).length)} — {t.name}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          {[...weekGroups.entries()].map(([weekNum, tournaments]) => {
            const firstStart = tournaments[0].startTime;
            const lastEnd = tournaments[tournaments.length - 1].endTime;
            const weekLabel = `Week ${weekNum} — ${formatDate(firstStart)} – ${formatDate(lastEnd)}`;
            return (
              <details
                key={weekNum}
                className="tournament-week-group"
                open={tournaments.some((t) => !isFuture(t))}
              >
                <summary>{weekLabel}</summary>
                {tournaments.map((t) => (
                  <div key={t.id} className="tournament-row">
                    <button
                      className="tournament-btn"
                      onClick={() => selectTournament(t.id)}
                      disabled={isFuture(t)}
                    >
                      {t.id.slice(String(t.season).length)}
                    </button>
                    <div className="tournament-info">
                      <span className="tournament-name">{t.name}</span>
                      <span className="tournament-date">
                        {formatDate(t.startTime)} – {formatDate(t.endTime)}
                      </span>
                    </div>
                  </div>
                ))}
              </details>
            );
          })}
        </div>
      </div>
    </main>
  );
};

export default CompStart;
