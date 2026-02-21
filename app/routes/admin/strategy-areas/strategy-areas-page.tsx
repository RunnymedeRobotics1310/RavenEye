import RequireLogin from "~/common/auth/RequireLogin.tsx";
import Spinner from "~/common/Spinner.tsx";
import { NavLink } from "react-router";
import { useStrategyAreaList, useTournamentList } from "~/common/storage/dbhooks.ts";
import { useEffect, useState } from "react";
import { ping, deleteStrategyArea } from "~/common/storage/rb.ts";
import { syncStrategyAreaList } from "~/common/sync/sync.ts";

const List = () => {
  const { list: data, loading } = useStrategyAreaList();
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
            <th>Commands</th>
          </tr>
        </thead>
        <tbody>
          {data?.map((item) => (
            <tr key={item.id}>
              <td>{item.id}</td>
              <td>{item.frcyear}</td>
              <td>{item.code}</td>
              <td>{item.name}</td>
              <td>{item.description}</td>
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
      <h1>Manage Strategy Areas</h1>
      <p>
        This page lists all strategy areas. There is no ability to suppress
        strategy areas not related to this year. This will not be necessary this
        year, but in 2027 this UI will need to be updated.
      </p>
      <p>
        Do not re-use strategy areas. Once a strategy area has been created, it
        will start to be used with event types. Changing the meaning of a
        strategy area that is already connected to an event type will result in
        corrupt data. Keep the meaning of a strategy area consistent once
        created.
      </p>
      <RequireLogin>
        <List />
      </RequireLogin>
    </main>
  );
};
export default StrategyAreasPage;
