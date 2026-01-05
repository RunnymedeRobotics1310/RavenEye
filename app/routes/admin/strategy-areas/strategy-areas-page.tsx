import RequireLogin from "~/common/auth/RequireLogin.tsx";
import { useStrategyAreaList } from "~/common/storage/ravenbrain.ts";
import Spinner from "~/common/Spinner.tsx";
import ErrorMessage from "~/common/ErrorMessage.tsx";
import { NavLink } from "react-router";

const List = () => {
  const { data, loading, error } = useStrategyAreaList();
  if (loading) return <Spinner />;
  if (error)
    return (
      <ErrorMessage title={"Error loading strategy area list"}>
        {error}
      </ErrorMessage>
    );

  return (
    <section className={"strategyareasAdmin"}>
      <NavLink to="/admin/strategy-areas/add">
        <button>Add</button>
      </NavLink>
      <table>
        <thead>
          <tr>
            <th>ID</th>
            <th>Season</th>
            <th>Name</th>
            <th>Description</th>
            <th>Commands</th>
          </tr>
        </thead>
        <tbody>
          {data?.map((user) => (
            <tr key={user.id}>
              <td>{user.id}</td>
              <td>{user.frcyear}</td>
              <td>{user.name}</td>
              <td>{user.description}</td>
              <td>
                <button>Edit</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
};
const StrategyAreasPage = () => {
  return (
    <main>
      <h1>Manage Strategy Areas</h1>
      <p>Administrator tool to manage strategy areas.</p>
      <RequireLogin>
        <List />
      </RequireLogin>
    </main>
  );
};
export default StrategyAreasPage;
