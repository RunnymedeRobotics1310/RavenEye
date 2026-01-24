import RequireLogin from "~/common/auth/RequireLogin.tsx";
import { useUserList } from "~/common/storage/rb.ts";
import Spinner from "~/common/Spinner.tsx";
import ErrorMessage from "~/common/ErrorMessage.tsx";
import { NavLink } from "react-router";

const List = () => {
  const { data, loading, error } = useUserList();
  if (loading) return <Spinner />;
  if (error)
    return (
      <ErrorMessage title={"Error loading user list"}>{error}</ErrorMessage>
    );

  return (
    <section className={"usersAdmin"}>
      <p>
        <NavLink to={"/admin/users/add"}>
          <button>Add User</button>
        </NavLink>
      </p>
      <table>
        <thead>
          <tr>
            <th>ID</th>
            <th>Login</th>
            <th>Display Name</th>
            <th>Enabled</th>
            <th>Forgot Password</th>
            <th>Roles</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {data?.map((user) => (
            <tr key={user.id} className={user.enabled ? "" : "disabled-item"}>
              <td>{user.id}</td>
              <td>{user.login}</td>
              <td>{user.displayName}</td>
              <td>{user.enabled ? "Yes" : "No"}</td>
              <td>{user.forgotPassword ? "Yes" : "No"}</td>
              <td>{user.roles.join(", ")}</td>
              <td>
                <NavLink to={`/admin/users/${user.id}`}>
                  <button className="adminListViewDetailsButton">Edit</button>
                </NavLink>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
};
const UsersPage = () => {
  return (
    <main>
      <h1>Manage Users</h1>
      <p>Administrator tool to manage users.</p>
      <RequireLogin>
        <List />
      </RequireLogin>
    </main>
  );
};
export default UsersPage;
