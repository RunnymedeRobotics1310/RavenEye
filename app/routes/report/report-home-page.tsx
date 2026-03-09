import { NavLink } from "react-router";
import RequireLogin from "~/common/auth/RequireLogin.tsx";

const ReportHomePage = () => {
  return (
    <main>
      <h1>Reports</h1>
      <RequireLogin>
        <h2>Tournament Reports</h2>
        <p>Coming soon</p>

        <h2>Drill Reports</h2>
        <ul className="nav-list">
          <li>
            <NavLink to="/report/drill" className="btn">
              Drill Sessions
            </NavLink>
          </li>
        </ul>
      </RequireLogin>
    </main>
  );
};
export default ReportHomePage;
