import { NavLink } from "react-router";
import RequireLogin from "~/common/auth/RequireLogin.tsx";
import {
  useStrategyAreaList,
  useSequenceTypeList,
} from "~/common/storage/dbhooks.ts";
import Spinner from "~/common/Spinner.tsx";

const SequenceDrillAreasPage = () => {
  const { list: areas, loading: areasLoading } = useStrategyAreaList();
  const { list: sequenceTypes, loading: seqLoading } = useSequenceTypeList();
  const currentYear = new Date().getFullYear();
  const loading = areasLoading || seqLoading;

  // Only show areas that have at least one active sequence type
  const activeTypes = sequenceTypes.filter(
    (st) => !st.disabled && st.frcyear === currentYear,
  );
  const areaIdsWithSequences = new Set(activeTypes.map((st) => st.strategyareaId));
  const activeAreas = areas.filter(
    (a) => a.frcyear === currentYear && areaIdsWithSequences.has(a.id),
  );

  return (
    <main>
      <div className="page-header">
        <h1>Drill Sequence Reports</h1>
        <p>
          <NavLink to="/report">&larr; Back to Reports</NavLink>
        </p>
      </div>
      <RequireLogin>
        {loading && <Spinner />}
        {!loading && activeAreas.length === 0 && (
          <p>No strategy areas with sequence types configured for {currentYear}.</p>
        )}
        {activeAreas.length > 0 && (
          <section className="card">
            <h2>Select a Strategy Area</h2>
            <ul className="nav-list">
              {activeAreas.map((area) => (
                <li key={area.id}>
                  <NavLink
                    to={`/report/drill/areas/${area.code}`}
                    className="btn-secondary"
                  >
                    {area.name}
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

export default SequenceDrillAreasPage;
