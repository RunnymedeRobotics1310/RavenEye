import RequireLogin from "~/common/auth/RequireLogin.tsx";
import Spinner from "~/common/Spinner.tsx";
import { NavLink } from "react-router";
import { useEventTypeList, useStrategyAreaList, useTournamentList } from "~/common/storage/dbhooks.ts";
import { useEffect, useMemo, useState } from "react";
import { ping, deleteEventType } from "~/common/storage/rb.ts";
import { syncEventTypeList } from "~/common/sync/sync.ts";

const List = () => {
  const { list: data, loading } = useEventTypeList();
  const { list: strategyAreas } = useStrategyAreaList();
  const { list: tournaments } = useTournamentList();
  const [online, setOnline] = useState(false);
  useEffect(() => { ping().then(setOnline); }, []);
  const now = new Date();
  const tournamentActive = tournaments.some(
    (t) => new Date(t.startTime) <= now && now <= new Date(t.endTime),
  );
  const canDelete = online && !tournamentActive;

  const handleDelete = async (eventtype: string, name: string) => {
    if (!window.confirm(`Delete "${name}"?`)) return;
    try {
      await deleteEventType(eventtype);
      await syncEventTypeList();
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

  const sorted = useMemo(() => {
    if (!data) return [];
    return [...data].sort((a, b) => {
      if (b.frcyear !== a.frcyear) return b.frcyear - a.frcyear;
      return a.eventtype.localeCompare(b.eventtype);
    });
  }, [data]);

  if (loading) return <Spinner />;

  const addButton = (
    <NavLink to="/admin/event-types/add" className="btn">Add</NavLink>
  );

  return (
    <section className={"eventtypesAdmin"}>
      {sorted.length > 20 && addButton}
      <table>
        <thead>
          <tr>
            <th>Season</th>
            <th>Event Type</th>
            <th>Name</th>
            <th>Strategy Area</th>
            <th>Commands</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((item) => (
            <tr key={item.eventtype} className={item.frcyear < new Date().getFullYear() ? "disabled-item" : ""}>
              <td>{item.frcyear}</td>
              <td>{item.eventtype}</td>
              <td>{item.name}</td>
              <td>{strategyAreaMap.get(item.strategyareaId) || item.strategyareaId}</td>
              <td>
                <NavLink to={`/admin/event-types/${item.eventtype}`} className="btn">Edit</NavLink>
                {canDelete && <button className="btn" onClick={() => handleDelete(item.eventtype, item.name)}>Delete</button>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {addButton}
    </section>
  );
};

const EventTypesPage = () => {
  return (
    <main>
      <h1>Manage Event Types</h1>
      <p>
        This page lists all event types. Event types define the kinds of events
        that can be tracked during a match.
      </p>
      <RequireLogin>
        <List />
      </RequireLogin>
    </main>
  );
};
export default EventTypesPage;
