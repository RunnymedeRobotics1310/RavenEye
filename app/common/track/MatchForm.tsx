import { useState } from "react";

const MatchForm = () => {
  const [match, setMatch] = useState(0);
  const [team, setTeam] = useState(0); //not done
  const [submitted, setSubmitted] = useState<boolean>(false);

  const handleArea = () => {
    return <h3>hi</h3>;
  }; //this isn't working

  const ChooseTeam = () => {
    return (
      <div>
        <p>Team:</p>
        <button onClick={handleArea}>1111</button>
        <button>2222</button>
        <button>3333</button>
        <button>4444</button>
        <button>5555</button>
        <button>6666</button>
        <p></p>
      </div>
    );
  };

  const handleMatch = () => {
    if (match > 0) {
      setSubmitted(true);
    }
  };

  const MatchSet = () => {
    return (
      <>
        <section>
          <h2>Match {match}</h2>
        </section>
        <ChooseTeam />
      </>
    );
  };

  const disabled = match === 0;

  if (submitted) {
    return <MatchSet />;
  }

  return (
    <div>
      Match:{" "}
      <input
        type="number"
        name="match"
        value={match}
        onChange={(e) => setMatch(e.target.value as unknown as number)}
      />
      <button disabled={disabled} onClick={handleMatch}>
        Yes
      </button>
    </div>
  );
};
export default MatchForm;
