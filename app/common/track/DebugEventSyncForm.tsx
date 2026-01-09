import { useEffect, useState } from "react";
import {
  getScoutingSession,
  recordEvent,
  setScoutingSession,
} from "~/common/storage/track.ts";
import { getUserid } from "~/common/storage/rbauth.ts";
import Spinner from "~/common/Spinner.tsx";

function DebugEventSyncForm() {
  function FakeScoutingSessionForm() {
    const [ss, setSs] = useState(getScoutingSession());
    useEffect(() => {
      setScoutingSession({
        ...getScoutingSession(),
        userId: getUserid(),
        level: "Qualification",
        tournamentId: "2025ONSCA",
        matchId: 3,
        teamNumber: 1310,
      });
    }, []);
    function handleSetTournament(e: any) {
      const s = {
        ...ss,
        tournamentId: e.target.value,
      };
      setSs(s);
      setScoutingSession(s);
    }
    function handleSetMatch(e: any) {
      const s = {
        ...ss,
        matchId: parseInt(e.target.value),
      };
      setSs(s);
      setScoutingSession(s);
    }
    function handleSetAlliance(e: any) {
      const s = {
        ...ss,
        alliance: e.target.value,
      };
      setSs(s);
      setScoutingSession(s);
    }
    function handleSetTeam(e: any) {
      const s = {
        ...ss,
        teamNumber: parseInt(e.target.value),
      };
      setSs(s);
      setScoutingSession(s);
    }

    return (
      <section>
        <h3>Current Scouting Session:</h3>
        <pre>{JSON.stringify(getScoutingSession(), null, 2)}</pre>
        <h3>Change Scouting Session:</h3>
        <p>
          This section is used to emulate walking through the process of picking
          a match and robot. This will be replaced by the regular login flow.
        </p>
        <p>User ID: {getScoutingSession().userId}</p>
        <p>
          Tournament ID:
          <input type={"text"} onChange={handleSetTournament} /> (e.g.
          "2025ONSCA")
          <br />
          Match ID:
          <input type={"number"} onChange={handleSetMatch} />
          <br />
          Alliance:
          <input type={"text"} onChange={handleSetAlliance} /> ('red' or 'blue')
          <br />
          Team Number:
          <input type={"number"} onChange={handleSetTeam} />
        </p>
      </section>
    );
  }

  function ScoreButtons() {
    const [pickup, setPickup] = useState(false);
    const [score, setScore] = useState(false);

    function handlePickup() {
      setPickup(true);
      recordEvent("pickup-coral-floor");
      setInterval(() => {
        setPickup(false);
      }, 250);
    }

    function handleScore() {
      setScore(true);
      recordEvent("TELEOP-score-reef-l4");
      setInterval(() => {
        setScore(false);
      }, 250);
    }

    return (
      <section>
        <h3>Record an Event</h3>
        <button onClick={handlePickup} disabled={pickup}>
          PICK UP CORAL FLOOR
        </button>
        <br />
        <button onClick={handleScore} disabled={score}>
          TELEOP SCORE REEF L4
        </button>
        {(pickup || score) && <Spinner />}
      </section>
    );
  }
  return (
    <section>
      <h2>Event Tracking Debug</h2>
      <p>
        This page sets up a fake scouting session, and then provides a small
        menu of hard-coded events that can be recorded. This is just a
        programming demo and should be deleted when actual tracking screens
        exist.
      </p>
      <ScoreButtons />
      <FakeScoutingSessionForm />
    </section>
  );
}

export default DebugEventSyncForm;
