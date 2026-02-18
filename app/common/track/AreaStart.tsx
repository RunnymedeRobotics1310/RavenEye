import { useMemo } from "react";
import type { TrackScreenProps } from "~/routes/track/track-home-page";
import {
  useStrategyAreaList,
  useTournamentList,
} from "~/common/storage/dbhooks.ts";
import { getScoutingSession } from "~/common/storage/track.ts";
import Spinner from "~/common/Spinner.tsx";

const AreaStart = ({ navigate, goBack }: TrackScreenProps) => {
  const { list: allAreas, loading: areasLoading } = useStrategyAreaList();
  const { list: tournaments, loading: tournamentsLoading } =
    useTournamentList();
  const loading = areasLoading || tournamentsLoading;

  const frcyear = useMemo(() => {
    const session = getScoutingSession();
    const tournament = tournaments.find(
      (t) => t.id === session.tournamentId,
    );
    return tournament
      ? new Date(tournament.startTime).getFullYear()
      : new Date().getFullYear();
  }, [tournaments]);

  const areas = useMemo(
    () => allAreas.filter((a) => a.frcyear === frcyear),
    [allAreas, frcyear],
  );

  if (loading) {
    return (
      <main>
        <Spinner />
      </main>
    );
  }

  return (
    <main>
      <button className="secondary" onClick={goBack}>Back</button>
      <p>Which area are you scouting?</p>
      {areas.map((area) => (
        <span key={area.id}>
          <button onClick={() => navigate(area.code)}>{area.name}</button>{" "}
        </span>
      ))}
      <button onClick={() => navigate("pit")}>I'm a Pit Scout</button>
    </main>
  );
};
export default AreaStart;
