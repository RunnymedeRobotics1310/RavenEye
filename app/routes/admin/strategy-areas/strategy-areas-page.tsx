import RequireLogin from "~/common/auth/RequireLogin.tsx";
import Spinner from "~/common/Spinner.tsx";
import { NavLink } from "react-router";
import { useStrategyAreaList, useTournamentList } from "~/common/storage/dbhooks.ts";
import { deleteStrategyArea } from "~/common/storage/rb.ts";
import { syncStrategyAreaList } from "~/common/sync/sync.ts";
import { useNetworkHealth } from "~/common/storage/networkHealth.ts";

const List = () => {
  const { list: data, loading } = useStrategyAreaList();
  const { list: tournaments } = useTournamentList();
  const { alive } = useNetworkHealth();
  const online = alive === true;
  const now = new Date();
  const tournamentActive = tournaments.some(
    (t) => new Date(t.startTime) <= now && now <= new Date(t.endTime),
  );
  const canDelete = online && !tournamentActive;

  const handleDelete = async (id: number, name: string) => {
    if (!window.confirm(`Delete "${name}"?`)) return;
    try {
      await deleteStrategyArea(id);
      await syncStrategyAreaList();
      window.location.reload();
    } catch (err) {
      alert("Cannot delete: " + (err instanceof Error ? err.message : String(err)));
    }
  };

  if (loading) return <Spinner />;

  const addButton = (
    <NavLink to="/admin/strategy-areas/add" className="btn">Add</NavLink>
  );

  return (
    <section className={"strategyareasAdmin"}>
      {data && data.length > 20 && addButton}
      <table>
        <thead>
          <tr>
            <th>ID</th>
            <th>Season</th>
            <th>Code</th>
            <th>Name</th>
            <th>Description</th>
            <th>Disabled</th>
            <th>Commands</th>
          </tr>
        </thead>
        <tbody>
          {data?.map((item) => (
            <tr key={item.id} className={item.disabled ? "disabled-item" : undefined}>
              <td>{item.id}</td>
              <td>{item.frcyear}</td>
              <td>{item.code}</td>
              <td>{item.name}</td>
              <td>{item.description}</td>
              <td>{item.disabled ? "Yes" : "No"}</td>
              <td>
                <NavLink to={`/admin/strategy-areas/${item.id}`} className="btn">Edit</NavLink>
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
const StrategyAreasPage = () => {
  return (
    <main>
      <div className="page-header">
        <h1>Manage Strategy Areas</h1>
        <p>
          Do not re-use strategy areas &mdash; changing the meaning of one that
          is connected to event types will corrupt data.
        </p>
      </div>
      <RequireLogin>
        <List />
      </RequireLogin>
    </main>
  );
};
export default StrategyAreasPage;
