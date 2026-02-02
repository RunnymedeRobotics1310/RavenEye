import RequireLogin from "~/common/auth/RequireLogin.tsx";
import QuickCommentForm from "~/common/track/QuickCommentForm.tsx";
import DebugEventSyncForm from "~/common/track/DebugEventSyncForm.tsx";
import { useState } from "react";
import DrillStart from "~/common/track/DrillStart.tsx";
import CompStart from "~/common/track/CompStart.tsx";

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

const TrackHomePage = () => {
  const [showComment, setShowComment] = useState(false);
  const [showDrill, setShowDrill] = useState(false);
  const [showComp, setShowComp] = useState(false);

  const handleShowComment = () => {
    setShowComment(true);
    setShowDrill(false);
    setShowComp(false);
  };

  const handleShowDrill = () => {
    setShowComment(false);
    setShowDrill(true);
    setShowComp(false);
  };

  const handleShowComp = () => {
    setShowComment(false);
    setShowDrill(false);
    setShowComp(true);
  };

  return (
    <main>
      <h1>Track</h1>
      <div> <p>
        Scouts and team members - you're in the right place to track robots!
      </p>
      <p>
                  comp/match/area/team  </p>

               <p>   drill/area/team </p>
      </div>

      {showComment && (
        <Envelope closeFunction={() => setShowComment(false)}>
          <QuickCommentForm />
        </Envelope>
      )}
      {showDrill && (
        <Envelope closeFunction={() => setShowDrill(false)}>
          <DrillStart />
        </Envelope>
      )}
      {showComp && (
        <Envelope closeFunction={() => setShowComp(false)}>
          <CompStart />
        </Envelope>
      )}

      <button onClick={handleShowComment}>Comment</button>
      <button onClick={handleShowDrill}>Drill</button>
      <button onClick={handleShowComp}>Comp</button>

      <p>Hello world from Track Home</p>
      <ul>
        <li>user selects Strat area</li>
        <li>user selects match/drill</li>
        <li>user selects team</li>
        <li>
          user goes to score tracking screen
          <br />
          <ul>
            <li>this can look like a game map or not</li>
            <li>buttons denoting what can be tracked are shown</li>
          </ul>
        </li>
      </ul>
      <RequireLogin>
        <QuickCommentForm />
        <DebugEventSyncForm />
      </RequireLogin>
    </main>
  );
};
export default TrackHomePage;
