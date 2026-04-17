import { useState } from "react";
import type { TrackScreenProps } from "~/routes/track/track-home-page";
import TrackNav from "~/common/track/TrackNav.tsx";
import {
  getScoutingSession,
  recordComment,
  recordEvent,
  setScoutingSession,
} from "~/common/storage/track.ts";
import { useEventTypeList } from "~/common/storage/dbhooks.ts";

const PitScoutPage = ({}: TrackScreenProps) => {
  const [entry, setEntry] = useState<string>("");
  const [submitted, setSubmitted] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [climbAuto, setClimbAuto] = useState<boolean>(false);
  const [preload, setPreload] = useState<boolean>(false);
  const [drive, setDrive] = useState<string>("");
  const [numberAutos, setNumberAutos] = useState<number>(0);
  const [maxFuel, setMaxFuel] = useState<number>(0);

  const session = getScoutingSession(); //sets up scouting session
  const [team, setTeam] = useState(1310);
  setScoutingSession({
    ...session,
    level: "pitScoutPage",
    matchId: 1000000,
    teamNumber: team,
  });
  const [eventData, setEventData] = useState<string | undefined>();
  const allEvents = useEventTypeList();
  const getEvent = (eventCode: string) => {
    return allEvents.list.find((event) => event.eventtype == eventCode);
  };
  //event types
  const driveEvent = getEvent("drive-event");
  const climbEvent = getEvent("climb-auto-true");
  const preloadEvent = getEvent("preload-true");
  const numberAutoEvent = getEvent("number-of-autos");
  const maxFuelHoldEvent = getEvent("max-fuel-hold");

  const isDisabled = () => {
    return eventData === undefined;
  };

  async function handleSubmit(e: { preventDefault: () => void }) {
    e.preventDefault();
    setError(null);
    try {
      await recordEvent("number-of-autos", numberAutos, "");
      if (climbAuto) {
        await recordEvent("climb-in-auto", 0, "");
      }
      if (preload) {
        await recordEvent("preload-true", 0, "");
      }
      await recordEvent("drive-event", 0, drive);
      await recordEvent("max-fuel-hold", maxFuel, "");
      if (entry !== "") {
        await recordComment(team, entry);
        setSubmitted(true);
        setTeam(0);
        setEntry("");
        setMaxFuel(0);
      }
    } catch (err) {
      setError(
        "Failed to record pit scout entry: " +
          (err instanceof Error ? err.message : String(err)),
      );
    }
  }

  const Submit = () => {
    return (
      <section>
        <p>Thanks for your entry</p>
        <button onClick={() => setSubmitted(false)}>Add Another</button>
        <p></p>
      </section>
    );
  };

  const disabled = team === 0 || entry === "" || maxFuel === 0;

  if (submitted) {
    return (
      <main>
        <Submit />
      </main>
    );
  }

  return (
    <main className="track">
      <TrackNav />
      <h4>Hello I'm a Pit Scout</h4>
      Team:
      <input
        type="number"
        name="team"
        value={team}
        onChange={(e) => setTeam(e.target.value as unknown as number)}
      />
      <p></p>
      <p>how many Autos?</p>
      {numberAutoEvent && (
        <input
          type="number"
          name="number autos"
          value={numberAutos}
          onChange={(e) => setNumberAutos(e.target.value as unknown as number)}
        />
      )}
      <div className="form-field">
        <label>
          {climbEvent && (
            <input
              type={"checkbox"}
              onChange={(e) => setClimbAuto(e.target.checked)}
            />
          )}
          <p>Do they climb in auto?</p>
        </label>
      </div>
      <div className="form-field">
        <label>
          {preloadEvent && (
            <input
              type="checkbox"
              onChange={(e) => {
                setPreload(e.target.checked);
              }}
            />
          )}
          <p>Do they preload their robot?</p>
        </label>
      </div>
      <div className={"form-field"}>
        <p>Type of drive?</p>
        {driveEvent && (
          <select value={drive} onChange={(e) => setDrive(e.target.value)}>
            <option value="">--select--</option>
            <option value="swerve">Swerve</option>
            <option value="tank">Tank</option>
            <option value="the weird one">Mecanum</option>
          </select>
        )}
      </div>
      <p>how much fuel can the hopper hold?</p>
      {maxFuelHoldEvent && (
        <input
          type="number"
          name="max fuel"
          value={maxFuel}
          onChange={(e) => setMaxFuel(e.target.value as unknown as number)}
        />
      )}
      <p>Strat Notes?</p>
      <textarea value={entry} onChange={(e) => setEntry(e.target.value)} />
      <p></p>
      {error && <div className="banner banner-warning">{error}</div>}
      <button type="submit" disabled={disabled} onClick={handleSubmit}>
        Submit
      </button>
      <p></p>
      debug output
      <pre>{team}</pre>
      <pre>{preload}</pre>
      <pre>{numberAutos}</pre>
      <pre>{drive}</pre>
    </main>
  );
};

export default PitScoutPage;
