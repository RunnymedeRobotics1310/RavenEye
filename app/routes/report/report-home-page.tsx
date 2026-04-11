import { useState } from "react";
import { NavLink } from "react-router";
import RequireLogin from "~/common/auth/RequireLogin.tsx";
import ClearReportCacheButton from "~/common/ClearReportCacheButton.tsx";
import { useRole } from "~/common/storage/rbauth.ts";

const ReportHomePage = () => {
  const { isAdmin, isSuperuser } = useRole();
  const [team, setTeam] = useState<number>(1310);
  const time = 7;
  const number = 10;
  const score = 4;

    return (
        <main>
            <div className="page-header">
                <h1>Reports</h1>
            </div>
            <RequireLogin>
              {(isAdmin || isSuperuser) && (
                <section className="card">
                  <h2>Report Cache</h2>
                  <ClearReportCacheButton />
                </section>
              )}
              <section className="card">
                <h2>Standard Reports</h2>
                <ul className="nav-list">
                  <li>
                    <NavLink to="/report/schedule" className="btn-secondary">
                      Tournament Report
                    </NavLink>
                    <span className="nav-note">formerly Team Schedule</span>
                  </li>
                  <li>
                    <NavLink to="/report/summary" className="btn-secondary">
                      Team Summary Report
                    </NavLink>
                  </li>
                  <li>
                    <NavLink to="/report/pmva" className="btn-secondary">
                      Post-Match Video Analysis (PMVA) Report
                    </NavLink>
                  </li>
                  <li>
                    <NavLink to="/report/robot-performance" className="btn-secondary">
                      Robot Performance Report
                    </NavLink>
                  </li>
                  <li>
                    <NavLink to="/report/mega" className="btn-secondary">
                      Mega Report
                    </NavLink>
                  </li>
                  <li>
                    <NavLink to="/report/chrono" className="btn-secondary">
                      Chronological Event Report
                    </NavLink>
                  </li>
                </ul>
              </section>

              <section className="card">
                <h2>Drill Sequence Reports</h2>
                <ul className="nav-list">
                  <li>
                    <NavLink to="/report/drill/areas" className="btn-secondary">
                      Drill Sequence Reports
                    </NavLink>
                  </li>
                </ul>
              </section>

              <section className="card">
                <h2>Tournament Sequence Reports</h2>
                <ul className="nav-list">
                  <li>
                    <NavLink to="/report/tournament/areas" className="btn-secondary">
                      Tournament Sequence Reports
                    </NavLink>
                  </li>
                </ul>
              </section>

                <section className="card">
                    <h2>Custom Reports</h2>
                    <ul className="nav-list">
                        <li>
                            <NavLink to="/report/drill" className="btn">
                                Shooter Drill Sessions
                            </NavLink>
                        </li>
                    </ul>
                </section>
            </RequireLogin>
        </main>
    );
};
export default ReportHomePage;
