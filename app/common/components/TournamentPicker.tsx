import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import type { RBTournament } from "~/types/RBTournament.ts";

type TournamentPickerProps = {
  tournaments: RBTournament[];
  activeTournaments?: RBTournament[];
  filterToIds?: string[];
  renderTournament: (tournament: RBTournament) => ReactNode;
  onSelectTournament?: (tournament: RBTournament) => void;
  showTypeahead?: boolean;
  groupBy?: "week" | "season";
  emptyMessage?: string;
};

function groupByWeek(
  tournaments: RBTournament[],
): Map<number, RBTournament[]> {
  const groups = new Map<number, RBTournament[]>();
  for (const t of tournaments) {
    const week = t.weekNumber ?? 0;
    const list = groups.get(week) ?? [];
    list.push(t);
    groups.set(week, list);
  }
  return groups;
}

function groupBySeason(
  tournaments: RBTournament[],
): Map<number, RBTournament[]> {
  const groups = new Map<number, RBTournament[]>();
  for (const t of tournaments) {
    const list = groups.get(t.season) ?? [];
    list.push(t);
    groups.set(t.season, list);
  }
  return groups;
}

function getCurrentWeek(tournaments: RBTournament[]): number | null {
  const now = Date.now();
  for (const t of tournaments) {
    const start = new Date(t.startTime).getTime();
    const end = new Date(t.endTime).getTime();
    if (start <= now && end >= now) return t.weekNumber;
  }
  let closest: RBTournament | null = null;
  for (const t of tournaments) {
    const start = new Date(t.startTime).getTime();
    if (
      start > now &&
      (!closest || start < new Date(closest.startTime).getTime())
    ) {
      closest = t;
    }
  }
  return closest?.weekNumber ?? null;
}

const formatDate = (date: Date) =>
  new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });

const TournamentPicker = ({
  tournaments,
  activeTournaments,
  filterToIds,
  renderTournament,
  onSelectTournament,
  showTypeahead = true,
  groupBy = "week",
  emptyMessage = "No tournaments found.",
}: TournamentPickerProps) => {
  const [filterInput, setFilterInput] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const filterRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (showTypeahead && filterRef.current) {
      filterRef.current.focus();
    }
  }, [showTypeahead]);

  // Filter to current season unless filterToIds narrows the list
  const baseTournaments = useMemo(() => {
    if (filterToIds) {
      const idSet = new Set(filterToIds);
      return tournaments.filter((t) => idSet.has(t.id));
    }
    if (tournaments.length === 0) return [];
    const maxSeason = Math.max(...tournaments.map((t) => t.season));
    return tournaments
      .filter((t) => t.season === maxSeason)
      .sort(
        (a, b) =>
          new Date(a.startTime).getTime() - new Date(b.startTime).getTime(),
      );
  }, [tournaments, filterToIds]);

  // Typeahead filtering
  const filterLower = filterInput.toLowerCase();
  const filtered = filterInput
    ? baseTournaments.filter(
        (t) =>
          t.name.toLowerCase().includes(filterLower) ||
          t.id.toLowerCase().includes(filterLower),
      )
    : baseTournaments;

  const suggestions = filterInput ? filtered.slice(0, 8) : [];

  // Grouping
  const groups = useMemo(() => {
    if (groupBy === "season") {
      const bySeason = groupBySeason(filtered);
      return [...bySeason.entries()].sort(([a], [b]) => b - a);
    }
    const byWeek = groupByWeek(filtered);
    return [...byWeek.entries()].sort(([a], [b]) => a - b);
  }, [filtered, groupBy]);

  const currentWeek = useMemo(
    () => (groupBy === "week" ? getCurrentWeek(baseTournaments) : null),
    [baseTournaments, groupBy],
  );

  const now = new Date();

  return (
    <>
      {activeTournaments && activeTournaments.length > 0 && (
        <div className="card">
          <h2>Active Competition</h2>
          {activeTournaments.map((t) => (
            <div key={t.id}>{renderTournament(t)}</div>
          ))}
        </div>
      )}

      {showTypeahead && (
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
              if (e.key === "Escape") {
                setShowSuggestions(false);
              }
              if (
                e.key === "Enter" &&
                suggestions.length === 1 &&
                onSelectTournament
              ) {
                onSelectTournament(suggestions[0]);
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
                      setFilterInput("");
                      onSelectTournament?.(t);
                    }}
                  >
                    {t.id} — {t.name}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {groups.length === 0 && <p>{emptyMessage}</p>}

      {groups.map(([groupKey, groupTournaments]) => {
        if (groupBy === "season") {
          return (
            <section key={groupKey} className="card">
              <h2>{groupKey}</h2>
              <ul className="nav-list">
                {groupTournaments.map((t) => (
                  <li key={t.id}>{renderTournament(t)}</li>
                ))}
              </ul>
            </section>
          );
        }

        const firstStart = groupTournaments[0].startTime;
        const lastEnd =
          groupTournaments[groupTournaments.length - 1].endTime;
        const weekLabel = `Week ${groupKey} — ${formatDate(firstStart)} – ${formatDate(lastEnd)}`;

        return (
          <details
            key={groupKey}
            className="admin-stream-week"
            open={groupKey === currentWeek}
          >
            <summary>
              {weekLabel}
              <span className="admin-stream-week-count">
                {groupTournaments.length} tournament
                {groupTournaments.length !== 1 ? "s" : ""}
              </span>
            </summary>
            {groupTournaments.map((t) => (
              <div key={t.id}>{renderTournament(t)}</div>
            ))}
          </details>
        );
      })}
    </>
  );
};

export default TournamentPicker;
