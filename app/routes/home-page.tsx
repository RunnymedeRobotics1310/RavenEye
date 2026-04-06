import { useEffect, useState } from "react";
import type { Route } from "../routes/+types/home-page";
import {
  getDisplayName,
  useLoginStatus,
  useRole,
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
  const roles = useRole();
  // TEMPORARY: hide Match Strategy from scouts until launch — admins and
  // superusers can see it. Restore to
  // `roles.isExpertScout || roles.isAdmin || roles.isSuperuser` before launch.
  const canStrategize = roles.isAdmin || roles.isSuperuser;
  const [copyToast, setCopyToast] = useState(false);
  return (
    <main>
      <div className="page-header">
        <h1>Welcome to Raven Eye!</h1>
        <p>
          Logged in as <strong>{fullName}</strong>
        </p>
      </div>
      <section className="card">
        <nav className="home-nav">
          <div className="home-nav-primary">
            <NavLink to={"/track"} className="btn">Track a Robot</NavLink>
            <NavLink to={"/report"} className="btn">View Reports</NavLink>
            {canStrategize && <NavLink to={"/strategy"} className="btn">Match Strategy</NavLink>}
            {hasActive && <NavLink to={"/report/schedule/active"} className="btn-secondary">Current Tournament Schedule & Scores</NavLink>}
            {hasActive && <NavLink to={"/report/schedule"} className="btn-secondary">Schedule & Scores</NavLink>}
          </div>
          <div className="home-nav-secondary">
            <NavLink to={"/profile"} className="btn-secondary">My Profile</NavLink>
            <NavLink to={"/logout"} className="btn-secondary">Log out</NavLink>
          </div>
        </nav>
      </section>
      <section className="card">
        <h2>Pit Support</h2>
        <p>
          The following features exist to drive a pit kiosk in Raven Eye.
          All of the data shown in the pit section is available in the
          &ldquo;Schedule &amp; Scores&rdquo; report. Please do not run
          the pit kiosk mode on your own &mdash; it puts unnecessary load
          on the server and we don&rsquo;t want to be shut down.
        </p>
        <table className="status-table">
          <thead>
            <tr>
              <th>Action</th>
              <th>Description</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><NavLink to="/admin/tournament-streams" className="btn-secondary">Livestreams</NavLink></td>
              <td>Enter or change override tournament livestream YouTube URLs &mdash; admin access only.</td>
            </tr>
            <tr>
              <td><NavLink to="/kiosk-pit" className="btn-secondary">Pit Kiosk</NavLink></td>
              <td>
                Load this URL in the pit (you do not need to be logged in):<br />
                <code>{window.location.origin}/kiosk-pit</code>
              </td>
            </tr>
          </tbody>
        </table>
      </section>
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
        {hasActive && <NavLink to={"/report/schedule/active"} className="btn-secondary">Schedule & Scores</NavLink>}
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
