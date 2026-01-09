import RequireLogin from "~/common/auth/RequireLogin.tsx";
import QuickCommentForm from "~/common/track/QuickCommentForm.tsx";

const TrackHomePage = () => {
  return (
    <main>
      <h1>Track</h1>
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
      </RequireLogin>
    </main>
  );
};
export default TrackHomePage;
