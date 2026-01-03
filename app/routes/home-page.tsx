import type { Route } from "~/routes/+types/home";
import { getFullName, useLoginStatus } from "~/common/storage/auth.ts";
import { NavLink } from "react-router";
import ErrorMessage from "~/common/ErrorMessage.tsx";
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
  const fullName = getFullName();
  return (
    <section>
      <p>Welcome {fullName}</p>
      <NavLink to={"/logout"}>Log out</NavLink>
    </section>
  );
};
const NotLoggedIn = (props: any) => {
  return (
    <section>
      <p>You are not logged in</p>
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
            <td>{props.status.alive ? "yes" : "no"}</td>
          </tr>
          <tr>
            <td>Previously Authenticated</td>
            <td>{props.status.authenticated ? "yes" : "no"}</td>
          </tr>
          <tr>
            <td>Authentication Expired</td>
            <td>{props.status.expired ? "yes" : "no"}</td>
          </tr>
          <tr>
            <td>Logged In</td>
            <td>{props.status.loggedIn ? "yes" : "no"}</td>
          </tr>
        </tbody>
      </table>
    </section>
  );
};

const HomePage = () => {
  const status = useLoginStatus();
  if (status.loading) {
    return <Spinner />;
  }
  if (status.loggedIn) {
    return <LoggedIn />;
  } else {
    return <NotLoggedIn status={status} />;
  }
};

export default HomePage;
