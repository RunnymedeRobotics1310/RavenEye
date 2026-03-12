import { NavLink, useParams } from "react-router";
import RequireLogin from "~/common/auth/RequireLogin.tsx";
import {
  useSequenceTypeList,
  useStrategyAreaList,
} from "~/common/storage/dbhooks.ts";
import Spinner from "~/common/Spinner.tsx";

const SequenceTournamentSequencesPage = () => {
  const { areaCode } = useParams<{ areaCode: string }>();
  const { list: areas } = useStrategyAreaList();
  const { list: sequenceTypes, loading } = useSequenceTypeList();
  const currentYear = new Date().getFullYear();

  const area = areas.find((a) => a.code === areaCode);
  const filteredTypes = sequenceTypes.filter(
    (st) =>
      !st.disabled &&
      st.frcyear === currentYear &&
      area &&
      st.strategyareaId === area.id,
  );

  return (
    <main>
      <div className="page-header">
        <h1>Tournament Sequence Reports — {area?.name ?? areaCode}</h1>
        <p>
          <NavLink to="/report/tournament/areas">
            &larr; Back to Strategy Areas
          </NavLink>
        </p>
      </div>
      <RequireLogin>
        {loading && <Spinner />}
        {!loading && filteredTypes.length === 0 && (
          <p>No sequence types configured for this strategy area.</p>
        )}
        {filteredTypes.length > 0 && (
          <section className="card">
            <h2>Select a Sequence Type</h2>
            <ul className="nav-list">
              {filteredTypes.map((st) => (
                <li key={st.id}>
                  <NavLink
                    to={`/report/tournament/${st.code}/teams`}
                    className="btn-secondary"
                  >
                    {st.name}
                  </NavLink>
                </li>
              ))}
            </ul>
          </section>
        )}
      </RequireLogin>
    </main>
  );
};

export default SequenceTournamentSequencesPage;
