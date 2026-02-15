import RequireLogin from "~/common/auth/RequireLogin.tsx";
import Spinner from "~/common/Spinner.tsx";
import { NavLink } from "react-router";
import { useStrategyAreaList } from "~/common/storage/dbhooks.ts";

const List = () => {
  const { list: data, loading } = useStrategyAreaList();
  if (loading) return <Spinner />;

  const addButton = (
    <NavLink to="/admin/strategy-areas/add">
      <button>Add</button>
    </NavLink>
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
                <NavLink to={`/admin/strategy-areas/${item.id}`}>
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
        At this time, deleting strategy areas is not possible. A future
        enhancement will allow this. In the meantime, do not re-use strategy
        areas. Once a strategy area has been created, it will start to be used
        with event types. Changing the meaning of a strategy area that is
        already connected to an event type will result in corrupt data. Keep the
        meaning of a strategy area consistent once created.
      </p>
      <RequireLogin>
        <List />
      </RequireLogin>
    </main>
  );
};
export default StrategyAreasPage;
