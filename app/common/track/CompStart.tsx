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
import TournamentPicker from "~/common/components/TournamentPicker.tsx";

const CompStart = ({}: TrackScreenProps) => {
  const { navigate } = useTrackNav();
  const { list: activeTeamTournaments, loading: activeLoading } =
    useActiveTeamTournaments();
  const { list: allTournaments, loading: allLoading } = useTournamentList();
  const loading = activeLoading || allLoading;

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

  const renderTournament = (t: RBTournament) => (
    <div className="tournament-row">
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
  );

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
        <TournamentPicker
          tournaments={allTournaments}
          activeTournaments={activeTeamTournaments}
          renderTournament={renderTournament}
          onSelectTournament={(t) => selectTournament(t.id)}
          groupBy="week"
        />
      </div>
    </main>
  );
};

export default CompStart;
