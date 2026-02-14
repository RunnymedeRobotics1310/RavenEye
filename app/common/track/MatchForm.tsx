import { useState } from "react";
import AreaStart from "~/common/track/AreaStart.tsx";

type EnvelopeProps = {
  closeFunction: () => void;
  children: React.ReactNode;
};
const Envelope = (props: EnvelopeProps) => {
  return (
    <div>
      {props.children}
      <button onClick={props.closeFunction}>Close</button>
    </div>
  );
};

const MatchForm = () => {
  const [match, setMatch] = useState(0);
  const [submitted, setSubmitted] = useState<boolean>(false);
  const [clickTeam, setClickTeam] = useState(false);
  const [team, setTeam] = useState(0);
  //const [team2, setTeam2] = useState(2222);

  const handleArea = () => {
    setClickTeam(true);
  };

  // if (match == 1) {
  //   setTeam(1111);
  // }
  // if (match == 1) {
  //   setTeam(1111);
  //   setTeam2(2222);
  // }
  //
  // if (match == 2) {
  //   setTeam(1000);
  //   setTeam2(2000);
  // }

  const ChooseTeam = () => {
    return (
      <div>
        {clickTeam && (
          <Envelope closeFunction={() => setClickTeam(false)}>
            <AreaStart />
          </Envelope>
        )}
        Team: <button onClick={handleArea}>1111</button>
        <button onClick={handleArea} onChange={(e) => setTeam(2222)}>
          2222
        </button>
        <button onClick={handleArea} value={team}>
          3333
        </button>
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
          <p>Team {team}</p>
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
