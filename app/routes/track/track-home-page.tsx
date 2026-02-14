import RequireLogin from "~/common/auth/RequireLogin.tsx";
import QuickCommentForm from "~/common/track/QuickCommentForm.tsx";
import DebugEventSyncForm from "~/common/track/DebugEventSyncForm.tsx";
import { useState } from "react";
import AreaStart from "~/common/track/AreaStart.tsx";
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
      <p>
        Scouts and team members - you're in the right place to track robots!
      </p>

      {showComment && (
        <Envelope closeFunction={() => setShowComment(false)}>
          <QuickCommentForm />
        </Envelope>
      )}
      {showDrill && (
        <Envelope closeFunction={() => setShowDrill(false)}>
          <AreaStart />
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
          User goes to score tracking screen
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
      <h2>Sequences</h2>
      <ul>
        <li>
          <p>Auto</p>
          <ul>
            <li>shoot_start</li>
            <li>shoot_end</li>
            <li>shoot_miss</li>
            <li>pickup_outpost*</li>
            <li>pickup_depot*</li>
            <li>pickup_ballpit*</li>
            <li>pickup_end</li>
            <li>climb_start</li>
            <li>climb_success</li>
            <li>climb_fail</li>
            <li>*might delete, turn into a map instead</li>
          </ul>
        </li>
        <li>
          <p>Scoring</p>
          <ul>
            <li>score_start</li>
            <li>score_end</li>
            <li>score_5</li>
            <li>score_10</li>
            <li>score_15</li>
            <li>score_20</li>
            <li>... keep going</li>
            <li>miss_5</li>
            <li>miss_10</li>
            <li>miss_15</li>
            <li>miss_20</li>
            <li>... keep going</li>
            <li>
              if there's a better way to record slider numbers please let me
              know
            </li>
          </ul>
        </li>
        <li>
          {" "}
          <p>Pickup</p>
          <ul>
            <li>pickup_start</li>
            <li>pickup_end</li>
            <li>pickup_5</li>
            <li>pickup_10</li>
            <li>pickup_15</li>
            <li>pickup_20</li>
            <li>... keep going</li>
            <li>lose_5</li>
            <li>lose_10</li>
            <li>lose_15</li>
            <li>lose_20</li>
            <li>... keep going</li>
          </ul>
        </li>
        <li>
          <p>Defense</p>
          <ul>
            <li>start_defense</li>
            <li>end_defense</li>
            <li>defense_strat_submit</li>
          </ul>
        </li>
        <li>
          <p>Endgame</p>
          <ul>
            <li>start_climbing</li>
            <li>fail_climbing</li>
            <li>stop_climbing</li>
            <li>climb_l1</li>
            <li>climb_l2</li>
            <li>climb_l3</li>
          </ul>
        </li>
      </ul>
      <li>
        <p>Penalties</p>
        <ul>
          <li>zone_violation</li>
          <li>fuel_violation</li>
          <li>pin</li>
          <li>other: specify?</li>
        </ul>
      </li>
      <h2>No-sequence events</h2>
      <ul>
        <li>comment</li>
      </ul>
    </main>
  );
};
export default TrackHomePage;
