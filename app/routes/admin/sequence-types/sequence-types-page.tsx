import RequireLogin from "~/common/auth/RequireLogin.tsx";
import { useSequenceTypeList } from "~/common/storage/db.ts";
import Spinner from "~/common/Spinner.tsx";
import { NavLink } from "react-router";

const List = () => {
  const { list: data, loading } = useSequenceTypeList();
  if (loading) return <Spinner />;

  return (
    <section className={"sequencetypesAdmin"}>
      <table>
        <thead>
          <tr>
            <th>ID</th>
            <th>Name</th>
            <th>Description</th>
            <th>Events</th>
            <th>Commands</th>
          </tr>
        </thead>
        <tbody>
          {data?.map((item) => (
            <tr key={item.id}>
              <td>{item.id}</td>
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
      <NavLink to="/admin/sequence-types/add">
        <button>Add</button>
      </NavLink>
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
