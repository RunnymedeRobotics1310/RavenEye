import RequireLogin from "~/common/auth/RequireLogin.tsx";
import Spinner from "~/common/Spinner.tsx";
import { NavLink } from "react-router";
import { useEventTypeList, useStrategyAreaList } from "~/common/storage/dbhooks.ts";
import { useEffect, useMemo, useState } from "react";
import { deleteEventType, getInUseEventTypes } from "~/common/storage/rb.ts";
import { syncEventTypeList } from "~/common/sync/sync.ts";
import { useRole } from "~/common/storage/rbauth.ts";
import { useNetworkHealth } from "~/common/storage/networkHealth.ts";

const List = () => {
  const { list: data, loading } = useEventTypeList();
  const { list: strategyAreas } = useStrategyAreaList();
  const { isSuperuser, isAdmin } = useRole();
  const { alive } = useNetworkHealth();
  const online = alive === true;
  const [inUseSet, setInUseSet] = useState<Set<string>>(new Set());
  const canManage = isSuperuser || isAdmin;
  useEffect(() => {
    if (canManage && online) {
      getInUseEventTypes().then(setInUseSet).catch(() => {});
    }
  }, [canManage, online]);
  const canDelete = canManage && online;

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
            <th>Disabled</th>
            <th>Commands</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((item) => (
            <tr key={item.eventtype} className={item.disabled || item.frcyear < new Date().getFullYear() ? "disabled-item" : ""}>
              <td>{item.frcyear}</td>
              <td>{item.eventtype}</td>
              <td>{item.name}</td>
              <td>{strategyAreaMap.get(item.strategyareaId) || item.strategyareaId}</td>
              <td>{item.disabled ? "Yes" : "No"}</td>
              <td>
                <NavLink to={`/admin/event-types/${item.eventtype}`} className="btn">Edit</NavLink>
                {canDelete && !inUseSet.has(item.eventtype) && <button className="btn" onClick={() => handleDelete(item.eventtype, item.name)}>Delete</button>}
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
      <div className="page-header">
        <h1>Manage Event Types</h1>
        <p>Event types define the kinds of events that can be tracked during a match.</p>
      </div>
      <RequireLogin>
        <List />
      </RequireLogin>
    </main>
  );
};
export default EventTypesPage;
