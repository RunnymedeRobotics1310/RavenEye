import { useState } from "react";
import type { TrackScreenProps } from "~/routes/track/track-home-page";

const PitScoutPage = ({ goBack }: TrackScreenProps) => {
  const [team, setTeam] = useState(0);
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
    return <main><Submit /></main>;
  }

  return (
    <main className="track">
      <button className="secondary" onClick={goBack}>Back</button>
      <h4>Hello I'm a Pit Scout</h4>
      <p>make an editable document?</p>
      Team:{" "}
      <input
        type="number"
        name="team"
        value={team}
        onChange={(e) => setTeam(e.target.value as unknown as number)}
      />
      <p></p>
      <textarea value={entry} onChange={(e) => setEntry(e.target.value)} />
      <button disabled={disabled} onClick={handleSubmit}>
        Submit
      </button>
      <p></p>
    </main>
  );
};

export default PitScoutPage;
