import { useEffect, useMemo, useState } from "react";
import { NavLink } from "react-router";
import RequireRole from "~/common/auth/RequireRole.tsx";
import { useActiveTeamTournaments } from "~/common/storage/dbhooks.ts";
import { repository } from "~/common/storage/db.ts";
import type { RBTournament } from "~/types/RBTournament.ts";
import Spinner from "~/common/Spinner.tsx";

function useAllTournaments(): {
  list: RBTournament[];
  loading: boolean;
} {
  const [list, setList] = useState<RBTournament[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let mounted = true;
    repository
      .getTournamentList()
      .then((l) => {
        if (mounted) {
          setList(l);
          setLoading(false);
        }
      })
      .catch(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);
  return { list, loading };
}

const TournamentLink = ({ t }: { t: RBTournament }) => (
  <li>
    <NavLink
      to={`/strategy/${encodeURIComponent(t.id)}`}
      className="btn-secondary"
    >
      {t.name}
    </NavLink>
  </li>
);

const ActiveTournamentList = () => {
  const { list, loading } = useActiveTeamTournaments();
  if (loading) return <Spinner />;
  if (list.length === 0) {
    return (
      <p>
        No active or upcoming team tournaments found. Sync tournaments from the
        Sync page.
      </p>
    );
  }
  return (
    <ul className="strategy-tournament-list">
      {list.map((t) => (
        <TournamentLink key={t.id} t={t} />
      ))}
    </ul>
  );
};

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

const CurrentSeasonTournamentList = () => {
  const { list, loading } = useAllTournaments();
  const currentSeasonTournaments = useMemo(() => {
    if (list.length === 0) return [];
    const maxSeason = Math.max(...list.map((t) => t.season));
    return list
      .filter((t) => t.season === maxSeason)
      .sort(
        (a, b) =>
          new Date(a.startTime).getTime() - new Date(b.startTime).getTime(),
      );
  }, [list]);

  if (loading) return <Spinner />;
  if (currentSeasonTournaments.length === 0) {
    return <p>No tournaments for the current season.</p>;
  }
  const season = currentSeasonTournaments[0]!.season;
  const currentWeek = getCurrentWeek(currentSeasonTournaments);

  const byWeek = new Map<number, RBTournament[]>();
  for (const t of currentSeasonTournaments) {
    const week = t.weekNumber ?? 0;
    if (!byWeek.has(week)) byWeek.set(week, []);
    byWeek.get(week)!.push(t);
  }
  const weeks = [...byWeek.keys()].sort((a, b) => a - b);

  return (
    <>
      <p className="strategy-season-hint">
        Season {season} — pick any tournament to plan (useful for testing on
        past matches).
      </p>
      {weeks.map((week) => {
        const weekTournaments = byWeek.get(week)!;
        return (
          <details
            key={week}
            className="admin-stream-week"
            open={week === currentWeek}
          >
            <summary>
              Week {week}
              <span className="admin-stream-week-count">
                {weekTournaments.length} tournament
                {weekTournaments.length !== 1 ? "s" : ""}
              </span>
            </summary>
            <ul className="strategy-tournament-list">
              {weekTournaments.map((t) => (
                <TournamentLink key={t.id} t={t} />
              ))}
            </ul>
          </details>
        );
      })}
    </>
  );
};

const StrategyHomePage = () => {
  return (
    <RequireRole
      roles={["MEMBER", "DATASCOUT", "EXPERTSCOUT", "ADMIN", "SUPERUSER"]}
    >
      <main>
        <div className="page-header">
          <h1>Match Strategy</h1>
          <p>Pick a tournament to plan matches for.</p>
        </div>
        <section className="card">
          <h2>Active Tournaments</h2>
          <ActiveTournamentList />
        </section>
        <section className="card">
          <h2>Current Season</h2>
          <CurrentSeasonTournamentList />
        </section>
      </main>
    </RequireRole>
  );
};

export default StrategyHomePage;
