import RequireLogin from "~/common/auth/RequireLogin.tsx";
import { useUserList } from "~/common/storage/ravenbrain.ts";
import Spinner from "~/common/Spinner.tsx";
import ErrorMessage from "~/common/ErrorMessage.tsx";

const List = () => {
  const { data, loading, error } = useUserList();
  if (loading) return <Spinner />;
  if (error)
    return (
      <ErrorMessage title={"Error loading user list"}>{error}</ErrorMessage>
    );

  return (
    <section className={"usersAdmin"}>
      <table>
        <thead>
          <tr>
            <th>ID</th>
            <th>Login</th>
            <th>Display Name</th>
            <th>Enabled</th>
            <th>Forgot Password</th>
            <th>Roles</th>
          </tr>
        </thead>
        <tbody>
          {data?.map((user) => (
            <tr key={user.id}>
              <td>{user.id}</td>
              <td>{user.login}</td>
              <td>{user.displayName}</td>
              <td>{user.enabled ? "Yes" : "No"}</td>
              <td>{user.forgotPassword ? "Yes" : "No"}</td>
              <td>{user.roles.join(", ")}</td>
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
      <p>Administrator tool to manage users (login required)</p>
      <RequireLogin showForm={false}>
        <List />
      </RequireLogin>
    </main>
  );
};
export default UsersPage;
