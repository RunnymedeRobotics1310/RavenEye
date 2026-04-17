import { NavLink } from "react-router";
import RequireRole from "~/common/auth/RequireRole.tsx";

const ProgrammingHomePage = () => {
  return (
    <RequireRole roles={["PROGRAMMER", "ADMIN", "SUPERUSER"]}>
      <main>
        <div className="page-header">
          <h1>Programming Data</h1>
          <p>Tools and data views for the programming team.</p>
        </div>
        <section className="card">
          <ul className="nav-list">
            <li>
              <NavLink to="/programming/nt-keys" className="btn-secondary">
                Network Table Data
              </NavLink>
            </li>
          </ul>
        </section>
      </main>
    </RequireRole>
  );
};

export default ProgrammingHomePage;
