import RequireLogin from "~/common/auth/RequireLogin.tsx";
import { useUserList, deleteUser, forceLogoutUser, useActiveSessions, ping } from "~/common/storage/rb.ts";
import Spinner from "~/common/Spinner.tsx";
import ErrorMessage from "~/common/ErrorMessage.tsx";
import { NavLink } from "react-router";
import { useEffect, useState } from "react";
import { useTournamentList } from "~/common/storage/dbhooks.ts";
import { getUserid } from "~/common/storage/rbauth.ts";

const List = () => {
  const currentUserId = getUserid();
  const { data, loading, error } = useUserList();
  const { list: tournaments } = useTournamentList();
  const { data: activeSessions } = useActiveSessions();
  const [online, setOnline] = useState(false);
  useEffect(() => { ping().then(setOnline); }, []);
  const now = new Date();
  const tournamentActive = tournaments.some(
    (t) => new Date(t.startTime) <= now && now <= new Date(t.endTime),
  );
  const canDelete = online && !tournamentActive;

  const handleDelete = async (id: number, displayName: string) => {
    if (!window.confirm(`Delete "${displayName}"?`)) return;
    try {
      await deleteUser(id);
      window.location.reload();
    } catch (err) {
      alert("Cannot delete: " + (err instanceof Error ? err.message : String(err)));
    }
  };

  const handleForceLogout = async (id: number, displayName: string) => {
    if (!window.confirm(`Force logout "${displayName}"? Their active sessions will be revoked.`)) return;
    try {
      await forceLogoutUser(id);
      window.location.reload();
    } catch (err) {
      alert("Cannot logout: " + (err instanceof Error ? err.message : String(err)));
    }
  };

  if (loading) return <Spinner />;
  if (error)
    return (
      <ErrorMessage title={"Error loading user list"}>{error}</ErrorMessage>
    );

  return (
    <section className={"usersAdmin"}>
      <NavLink to={"/admin/users/add"} className="btn">Add User</NavLink>
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
          {data
            ?.slice()
            .sort((a, b) => Number(b.forgotPassword) - Number(a.forgotPassword))
            .map((user) => (
            <tr key={user.id} className={`${user.enabled ? "" : "disabled-item"} ${user.forgotPassword ? "forgot-password-row" : ""}`}>
              <td>{user.id}</td>
              <td>{user.login}</td>
              <td>{user.displayName}</td>
              <td>{user.enabled ? "Yes" : "No"}</td>
              <td>{user.forgotPassword ? "Yes" : "No"}</td>
              <td>{user.roles.join(", ")}</td>
              <td>
                <NavLink to={`/admin/users/${user.id}`} className="btn">Edit</NavLink>
                {online && user.id !== currentUserId && activeSessions?.includes(user.login) && <button className="btn" onClick={() => handleForceLogout(user.id, user.displayName)}>Logout</button>}
                {canDelete && <button className="btn" onClick={() => handleDelete(user.id, user.displayName)}>Delete</button>}
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
      <div className="page-header">
        <h1>Manage Users</h1>
        <p>Administrator tool to manage users.</p>
      </div>
      <RequireLogin>
        <List />
      </RequireLogin>
    </main>
  );
};
export default UsersPage;
