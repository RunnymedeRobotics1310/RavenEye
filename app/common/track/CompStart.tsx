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
  const [testClose, setTestClose] = useState(false);

  const handleTestClose = () => {
    setTestClose(true);
  };

  const handleShowHumber = () => {
    setShowGeorgian(false);
    setShowHumber(true);
  };

  const handleShowGeorgian = () => {
    setShowHumber(false);
    setShowGeorgian(true);
  };

  const ButtonsClose = () => {
    if (!testClose) {
      return (
        <div>
          <button
            onClick={() => {
              handleShowHumber();
              handleTestClose();
            }}
          >
            Humber
          </button>
          <button
            onClick={() => {
              handleShowGeorgian();
              handleTestClose();
            }}
          >
            Georgian
          </button>
        </div>
      );
    }
  };

  return (
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
      <ButtonsClose></ButtonsClose>
      <p></p>
    </div>
  );
};

export default CompStart;
