import MatchForm from "~/common/track/MatchForm.tsx";
import { useState } from "react";

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

const CompStart = () => {
  const [showHumber, setShowHumber] = useState(false);
  const [showGeorgian, setShowGeorgian] = useState(false);

  const handleShowHumber = () => {
    setShowGeorgian(false);
    setShowHumber(true);
  };

  const handleShowGeorgian = () => {
    setShowHumber(false);
    setShowGeorgian(true);
  };

  return (
    <main>
      <div>
        <p>Comp</p>
        {showHumber && (
          <Envelope closeFunction={() => setShowHumber(false)}>
            <MatchForm />
          </Envelope>
        )}
        {showGeorgian && (
          <Envelope closeFunction={() => setShowGeorgian(false)}>
            <MatchForm />
          </Envelope>
        )}
        <button onClick={handleShowHumber}>Humber</button>
        <button onClick={handleShowGeorgian}>Georgian</button>
        <p></p>
      </div>{" "}
    </main>
  );
};

export default CompStart;
