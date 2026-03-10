import { NavLink } from "react-router";
import RequireLogin from "~/common/auth/RequireLogin.tsx";

const ReportHomePage = () => {
  return (
    <main>
      <div className="page-header">
        <h1>Reports</h1>
      </div>
      <RequireLogin>
        <section className="card">
          <h2>Tournament Reports</h2>
          <p>Coming soon</p>
        </section>

        <section className="card">
          <h2>Drill Reports</h2>
          <ul className="nav-list">
            <li>
              <NavLink to="/report/drill" className="btn">
                Drill Sessions
              </NavLink>
            </li>
          </ul>
        </section>
      </RequireLogin>
    </main>
  );
};
export default ReportHomePage;
