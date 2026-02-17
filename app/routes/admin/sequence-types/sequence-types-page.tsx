import RequireLogin from "~/common/auth/RequireLogin.tsx";
import Spinner from "~/common/Spinner.tsx";
import { NavLink } from "react-router";
import {
  useSequenceTypeList,
  useStrategyAreaList,
} from "~/common/storage/dbhooks.ts";
import { useMemo } from "react";

const List = () => {
  const { list: data, loading } = useSequenceTypeList();
  const { list: strategyAreas } = useStrategyAreaList();

  const strategyAreaMap = useMemo(() => {
    const map = new Map<number, string>();
    strategyAreas?.forEach((sa) => map.set(sa.id, sa.name));
    return map;
  }, [strategyAreas]);

  if (loading) return <Spinner />;

  const addButton = (
    <NavLink to="/admin/sequence-types/add">
      <button>Add</button>
    </NavLink>
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
                <NavLink to={`/admin/sequence-types/${item.id}`}>
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
