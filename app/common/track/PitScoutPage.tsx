import { useState } from "react";
import type { TrackScreenProps } from "~/routes/track/track-home-page";
import TrackNav from "~/common/track/TrackNav.tsx";

const PitScoutPage = ({}: TrackScreenProps) => {
  const [team, setTeam] = useState(1310);
  const [entry, setEntry] = useState<string>("");
  const [submitted, setSubmitted] = useState<boolean>(false);
  async function handleSubmit(e: { preventDefault: () => void }) {
    e.preventDefault();
    if (entry !== "") {
      //await recordComment(team, entry);
      setSubmitted(true);
      setTeam(0);
      setEntry("");
    }
  }

  const checkCool = (message: string) => {
    console.log({ message });
  };

  const Submit = () => {
    return (
      <section>
        <p>Thanks for your entry</p>
        <button onClick={() => setSubmitted(false)}>Add Another</button>
        <p></p>
      </section>
    );
  };

  const disabled = team === 0 || entry === "";

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
      <div className="form-field">
        <label>
          <input
            type="checkbox"
            onChange={() => {
              checkCool("this robot is frickin cool");
            }}
          />
          <p>is the robot frickin cool</p>
        </label>
      </div>
      <div className="form-field">
        <label>
          <input type="checkbox" onChange={() => {}} />
          <p>would the robot be MORE frickin cool if it was yknow DONE???</p>
        </label>
      </div>
      <p>Type of drive?</p>
      <textarea value={entry} onChange={(e) => setEntry(e.target.value)} />
      <button disabled={disabled} onClick={handleSubmit}>
        Submit
      </button>
      <p></p>
    </main>
  );
};

export default PitScoutPage;
