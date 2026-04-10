import { NavLink, useNavigate } from "react-router";
import RequireRole from "~/common/auth/RequireRole.tsx";
import {
  useActiveTeamTournaments,
  useTournamentList,
} from "~/common/storage/dbhooks.ts";
import type { RBTournament } from "~/types/RBTournament.ts";
import Spinner from "~/common/Spinner.tsx";
import TournamentPicker from "~/common/components/TournamentPicker.tsx";

const StrategyTournamentLink = ({ t }: { t: RBTournament }) => (
  <NavLink
    to={`/strategy/${encodeURIComponent(t.id)}`}
    className="btn-secondary"
  >
    {t.name}
  </NavLink>
);

const StrategyHomePage = () => {
  const { list: allTournaments, loading: allLoading } = useTournamentList();
  const { list: activeTournaments, loading: activeLoading } =
    useActiveTeamTournaments();
  const loading = allLoading || activeLoading;
  const navigate = useNavigate();

  return (
    <RequireRole
      roles={["MEMBER", "DRIVE_TEAM", "EXPERTSCOUT", "ADMIN", "SUPERUSER"]}
    >
      <main>
        <div className="page-header">
          <h1>Match Strategy</h1>
          <p>Pick a tournament to plan matches for.</p>
        </div>
        {loading ? (
          <Spinner />
        ) : (
          <TournamentPicker
            tournaments={allTournaments}
            activeTournaments={activeTournaments}
            renderTournament={(t) => <StrategyTournamentLink t={t} />}
            onSelectTournament={(t) =>
              navigate(`/strategy/${encodeURIComponent(t.id)}`)
            }
            groupBy="week"
          />
        )}
      </main>
    </RequireRole>
  );
};

export default StrategyHomePage;
