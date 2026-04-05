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
  <li style={{ margin: "0.5rem 0" }}>
    <NavLink
      to={`/strategy/${encodeURIComponent(t.id)}`}
      className="btn-secondary"
      style={{ display: "inline-block" }}
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
    <ul style={{ listStyle: "none", padding: 0 }}>
      {list.map((t) => (
        <TournamentLink key={t.id} t={t} />
      ))}
    </ul>
  );
};

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
  return (
    <>
      <p style={{ opacity: 0.7, fontSize: "0.85rem", marginTop: 0 }}>
        Season {season} — pick any tournament to plan (useful for testing on
        past matches).
      </p>
      <ul style={{ listStyle: "none", padding: 0 }}>
        {currentSeasonTournaments.map((t) => (
          <TournamentLink key={t.id} t={t} />
        ))}
      </ul>
    </>
  );
};

const StrategyHomePage = () => {
  return (
    <RequireRole roles={["EXPERTSCOUT", "ADMIN", "SUPERUSER"]}>
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
