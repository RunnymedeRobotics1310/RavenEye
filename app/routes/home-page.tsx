import { useEffect, useState } from "react";
import type { Route } from "../routes/+types/home-page";
import {
  getDisplayName,
  useLoginStatus,
} from "~/common/storage/rbauth.ts";
import { getActiveTeamTournaments } from "~/common/storage/rb.ts";
import { NavLink } from "react-router";
import Spinner from "~/common/Spinner.tsx";

function useHasActiveTournament() {
  const [hasActive, setHasActive] = useState(false);

  useEffect(() => {
    let isMounted = true;
    getActiveTeamTournaments()
      .then((list) => {
        if (isMounted) setHasActive(list.length > 0);
      })
      .catch(() => {});
    return () => {
      isMounted = false;
    };
  }, []);

  return hasActive;
}

export function meta({}: Route.MetaArgs) {
  return [
    { title: "1310 Raven Eye" },
    {
      name: "description",
      content:
        "Runnymede Robotics Team 1310 Raven Eye - Strategy Web Application",
    },
  ];
}
const LoggedIn = () => {
  const fullName = getDisplayName();
  const hasActive = useHasActiveTournament();
  return (
    <main>
      <div className="page-header">
        <h1>Welcome to Raven Eye!</h1>
        <p>
          Logged in as <strong>{fullName}</strong>
        </p>
      </div>
      <nav className="home-nav">
        <div className="home-nav-primary">
          <NavLink to={"/track"} className="btn">Track a Robot</NavLink>
          <NavLink to={"/report"} className="btn">View Reports</NavLink>
          {hasActive && <NavLink to={"/report/schedule"} className="btn-secondary">Schedule & Scores</NavLink>}
        </div>
        <div className="home-nav-secondary">
          <NavLink to={"/profile"} className="btn-secondary">My Profile</NavLink>
          <NavLink to={"/logout"} className="btn-secondary">Log out</NavLink>
        </div>
      </nav>
    </main>
  );
};
const NotLoggedIn = (props: any) => {
  const hasActive = useHasActiveTournament();
  return (
    <main>
      <div className="page-header">
        <h1>Welcome to Raven Eye!</h1>
        <p>
          To use this app, you need to log in first. The app works offline after
          initial sync &mdash; use the sync icon in the top right to sync data.
        </p>
      </div>
      <div className="page-section">
        <NavLink to={"/login"} className="btn">Log in</NavLink>
        {hasActive && <NavLink to={"/report/schedule"} className="btn-secondary">Schedule & Scores</NavLink>}
      </div>
      <section className="card">
        <h3>Login Status</h3>
        <table className="status-table">
          <thead>
            <tr>
              <th>Step</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Server Accessible</td>
              <td>{props.status.debug_alive ? "yes" : "no"}</td>
            </tr>
            <tr>
              <td>Previously Authenticated</td>
              <td>{props.status.debug_hasToken ? "yes" : "no"}</td>
            </tr>
            <tr>
              <td>Authentication Expired</td>
              <td>{props.status.debug_expired ? "yes" : "no"}</td>
            </tr>
            <tr>
              <td>Logged In</td>
              <td>{props.status.loggedIn ? "yes" : "no"}</td>
            </tr>
          </tbody>
        </table>
      </section>
    </main>
  );
};

const HomePage = () => {
  const status = useLoginStatus();
  if (status.loading) {
    return (
      <main>
        <Spinner />
      </main>
    );
  }
  if (status.loggedIn) {
    return <LoggedIn />;
  } else {
    return <NotLoggedIn status={status} />;
  }
};

export default HomePage;
