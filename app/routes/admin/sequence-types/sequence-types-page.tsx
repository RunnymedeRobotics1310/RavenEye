import RequireLogin from "~/common/auth/RequireLogin.tsx";
import Spinner from "~/common/Spinner.tsx";
import { NavLink } from "react-router";
import {
  useSequenceTypeList,
  useStrategyAreaList,
  useTournamentList,
} from "~/common/storage/dbhooks.ts";
import { useEffect, useMemo, useState } from "react";
import { ping, deleteSequenceType } from "~/common/storage/rb.ts";
import { syncSequenceTypeList } from "~/common/sync/sync.ts";

const List = () => {
  const { list: data, loading } = useSequenceTypeList();
  const { list: strategyAreas } = useStrategyAreaList();
  const { list: tournaments } = useTournamentList();
  const [online, setOnline] = useState(false);
  useEffect(() => { ping().then(setOnline); }, []);
  const now = new Date();
  const tournamentActive = tournaments.some(
    (t) => new Date(t.startTime) <= now && now <= new Date(t.endTime),
  );
  const canDelete = online && !tournamentActive;

  const handleDelete = async (id: number, name: string) => {
    if (!window.confirm(`Delete "${name}"?`)) return;
    try {
      await deleteSequenceType(id);
      await syncSequenceTypeList();
      window.location.reload();
    } catch (err) {
      alert("Cannot delete: " + (err instanceof Error ? err.message : String(err)));
    }
  };

  const strategyAreaMap = useMemo(() => {
    const map = new Map<number, string>();
    strategyAreas?.forEach((sa) => map.set(sa.id, sa.name));
    return map;
  }, [strategyAreas]);

  if (loading) return <Spinner />;

  const addButton = (
    <NavLink to="/admin/sequence-types/add" className="btn">Add</NavLink>
  );

  return (
    <section className={"sequencetypesAdmin"}>
      {data && data.length > 20 && addButton}
      <table>
        <thead>
          <tr>
            <th>ID</th>
            <th>Season</th>
            <th>Code</th>
            <th>Strategy Area</th>
            <th>Disabled</th>
            <th>Name</th>
            <th>Description</th>
            <th>Events</th>
            <th>Commands</th>
          </tr>
        </thead>
        <tbody>
          {data?.map((item) => (
            <tr
              key={item.id}
              className={item.disabled ? "disabled-item" : undefined}
            >
              <td>{item.id}</td>
              <td>{item.frcyear}</td>
              <td>{item.code}</td>
              <td>{strategyAreaMap.get(item.strategyareaId) || item.strategyareaId}</td>
              <td>{item.disabled ? "Yes" : "No"}</td>
              <td>{item.name}</td>
              <td>{item.description}</td>
              <td>{item.events?.length || 0}</td>
              <td>
                <NavLink to={`/admin/sequence-types/${item.id}`} className="btn">Edit</NavLink>
                {canDelete && <button className="btn" onClick={() => handleDelete(item.id, item.name)}>Delete</button>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {addButton}
    </section>
  );
};

const SequenceTypesPage = () => {
  return (
    <main>
      <h1>Manage Sequence Types</h1>
      <RequireLogin>
        <List />
      </RequireLogin>
    </main>
  );
};

export default SequenceTypesPage;
