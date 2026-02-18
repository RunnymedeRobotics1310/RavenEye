import { useState } from "react";
import type { TrackScreenProps } from "~/routes/track/track-home-page";

const DefensePage = ({ goBack }: TrackScreenProps) => {
  const [defense, setDefense] = useState<string>("");
  const [submitted, setSubmitted] = useState<boolean>(false);
  async function handleSubmit(e: { preventDefault: () => void }) {
    e.preventDefault();
    if (defense !== "") {
      setSubmitted(true);
      setDefense("");
    }
  }

  const Record = () => {
    return (
      <section>
        <p>Thank you</p>
      </section>
    );
  };

  const disabled = defense === "";

  const Stay = () => {
    if (submitted) {
      return <Record />;
    }
  };

  return (
    <main>
      <div>
        <button className="secondary" onClick={goBack}>Back</button>
        <h2>Defense</h2>
        <p>map drawings</p>
        <button>Start</button>
        {"  time"}
        <p></p>
        <button>End</button>
        <p>Describe defense strategy:</p>
        <textarea
          value={defense}
          onChange={(e) => setDefense(e.target.value)}
        />
        <p></p>
        <button disabled={disabled} onClick={handleSubmit}>
          Record Strat
        </button>
      </div>
    </main>
  );
};
export default DefensePage;
