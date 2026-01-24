import type { Route } from "../routes/+types/home-page";
import { getDisplayName, useLoginStatus } from "~/common/storage/rbauth.ts";
import { NavLink } from "react-router";
import Spinner from "~/common/Spinner.tsx";

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
  return (
    <main>
      <h1>Welcome to Raven Eye!</h1>
      <p>
        You are logged in as{" "}
        <em>
          <strong>{fullName}</strong>
        </em>
      </p>
      <ul>
        <li>
          <NavLink to={"/logout"}>Log out</NavLink>
        </li>
        <li>
          <NavLink to={"/track"}>Track a Robot</NavLink>
        </li>
        <li>
          <NavLink to={"/report"}>View Reports</NavLink>
        </li>
        <li>
          <NavLink to={"/admin"}>Administer System</NavLink>
        </li>
      </ul>
    </main>
  );
};
const NotLoggedIn = (props: any) => {
  return (
    <main>
      <h1>Welcome to Raven Eye!</h1>
      <p>
        To use this app, you need to log in first. The app is designed to allow
        scouting and logging activity without an internet connection, but to
        sync data to the server, you will need to be online. To sync, simply
        click on the sync icon in the top right of the page. Do not reload if
        you are not online.
      </p>
      <br />
      <NavLink to={"/login"}>Log in</NavLink>
      <h3>Login Status</h3>
      <table>
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
