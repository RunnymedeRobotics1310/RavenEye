import { useMemo } from "react";
import type { TrackScreenProps } from "~/routes/track/track-home-page";
import {
  useStrategyAreaList,
  useTournamentList,
} from "~/common/storage/dbhooks.ts";
import { getScoutingSession } from "~/common/storage/track.ts";
import Spinner from "~/common/Spinner.tsx";
import TrackNav from "~/common/track/TrackNav.tsx";
import { useTrackNav } from "~/common/track/TrackNavContext.tsx";


const AreaStart = ({}: TrackScreenProps) => {
  const { navigate } = useTrackNav();
  const { list: allAreas, loading: areasLoading } = useStrategyAreaList();
  const { list: tournaments, loading: tournamentsLoading } =
    useTournamentList();
  const loading = areasLoading || tournamentsLoading;

  const frcyear = useMemo(() => {
    const session = getScoutingSession();
    const tournament = tournaments.find((t) => t.id === session.tournamentId);
    return tournament
      ? new Date(tournament.startTime).getFullYear()
      : new Date().getFullYear();
  }, [tournaments]);

  const areas = useMemo(
    () => allAreas.filter((a) => a.frcyear === frcyear && !a.disabled),
    [allAreas, frcyear],
  );

  if (loading) {
    return (
      <main className="track">
        <Spinner />
      </main>
    );
  }

  return (
    <main className="track">
      <TrackNav />
      <p>Which area are you scouting?</p>
      {areas.map((area) => (
        <span key={area.id}>
          <button onClick={() => navigate("area:" + area.code)}>
            {area.name}
          </button>{" "}
          <p></p>
        </span>
      ))}
    </main>
  );
};
export default AreaStart;
