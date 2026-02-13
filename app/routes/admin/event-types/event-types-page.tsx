import RequireLogin from "~/common/auth/RequireLogin.tsx";
import Spinner from "~/common/Spinner.tsx";
import { NavLink } from "react-router";
import { useEventTypeList, useStrategyAreaList } from "~/common/storage/dbhooks.ts";
import { useMemo } from "react";

const List = () => {
  const { list: data, loading } = useEventTypeList();
  const { list: strategyAreas } = useStrategyAreaList();

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
    <NavLink to="/admin/event-types/add">
      <button>Add</button>
    </NavLink>
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
            <tr key={item.eventtype}>
              <td>{item.frcyear}</td>
              <td>{item.eventtype}</td>
              <td>{item.name}</td>
              <td>{strategyAreaMap.get(item.strategyareaId) || item.strategyareaId}</td>
              <td>
                <NavLink to={`/admin/event-types/${item.eventtype}`}>
                  <button>Edit</button>
                </NavLink>
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
