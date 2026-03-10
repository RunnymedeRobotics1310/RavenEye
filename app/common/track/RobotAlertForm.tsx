import { useState } from "react";
import { recordRobotAlert } from "~/common/storage/track.ts";
import type { TrackScreenProps } from "~/routes/track/track-home-page";
import { useTrackNav } from "~/common/track/TrackNavContext.tsx";
import { useRecentTournamentList } from "~/common/storage/dbhooks.ts";

function RobotAlertForm({}: TrackScreenProps) {
  const { goBack } = useTrackNav();
  const { list: tournaments, loading } = useRecentTournamentList();
  const [tournamentId, setTournamentId] = useState("");
  const [team, setTeam] = useState(-1);
  const [alert, setAlert] = useState("");
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit(e: { preventDefault: () => void }) {
    e.preventDefault();
    if (tournamentId !== "" && team !== -1 && alert !== "") {
      await recordRobotAlert(tournamentId, team, alert);
      setSubmitted(true);
      setTeam(-1);
      setAlert("");
    }
  }

  const disabled = tournamentId === "" || team === -1 || alert === "";

  if (submitted) {
    return (
      <main className="track">
        <section>
          <h2>Robot Alert</h2>
          <p>Alert recorded successfully!</p>
          <div className="form-actions">
            <button onClick={() => setSubmitted(false)}>Add Another</button>
            <button type="button" className="secondary" onClick={goBack}>
              Back to Track Home
            </button>
          </div>
        </section>
      </main>
    );
  }

  if (loading) {
    return (
      <main className="track">
        <h2>Robot Alert</h2>
        <p>Loading tournaments...</p>
      </main>
    );
  }

  return (
    <main className="track">
      <h2>Robot Alert</h2>
      <p>
        Leave an alert about a robot for the next scout watching that team.
      </p>
      <form>
        <div className="form-field">
          <label htmlFor="robot-alert-tournament">Tournament</label>
          <select
            id="robot-alert-tournament"
            value={tournamentId}
            onChange={(e) => setTournamentId(e.target.value)}
          >
            <option value="">Select tournament</option>
            {tournaments.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>
        <div className="form-field">
          <label htmlFor="robot-alert-team">Team</label>
          <input
            id="robot-alert-team"
            type="number"
            name="team"
            placeholder="e.g. 1310"
            value={team === -1 ? "" : team}
            onChange={(e) =>
              setTeam(e.target.value === "" ? -1 : Number(e.target.value))
            }
          />
        </div>
        <div className="form-field">
          <label htmlFor="robot-alert-text">Alert</label>
          <textarea
            id="robot-alert-text"
            placeholder="e.g. Watch for their left turns"
            value={alert}
            onChange={(e) => setAlert(e.target.value)}
          />
        </div>
        <div className="form-actions">
          <button disabled={disabled} onClick={handleSubmit}>
            Record Alert
          </button>
          <button type="button" className="secondary" onClick={goBack}>
            Back to Track Home
          </button>
        </div>
      </form>
    </main>
  );
}

export default RobotAlertForm;
