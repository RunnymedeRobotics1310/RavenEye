import { NavLink } from "react-router";
import { getRoles } from "~/common/storage/rbauth.ts";

const AdminPage = () => {
  let isSuperuser = false;
  try {
    const roles = getRoles();
    isSuperuser = roles.includes("ROLE_SUPERUSER");
  } catch {
    // not logged in
  }

  return (
    <main>
      <h1>Administer System</h1>
      <ul className="nav-list">
        <li>
          <NavLink to={"/admin/users"}>Users</NavLink>
        </li>
        <li>
          <NavLink to={"/admin/strategy-areas"}>Strategy Areas</NavLink>
        </li>
        <li>
          <NavLink to={"/admin/event-types"}>Event Types</NavLink>
        </li>
        <li>
          <NavLink to={"/admin/sequence-types"}>Sequence Types</NavLink>
        </li>
        <li>
          <NavLink to={"/admin/design-system"}>Design System</NavLink>
        </li>
        {isSuperuser && (
          <li>
            <NavLink to={"/admin/config-sync"}>Sync from Source</NavLink>
          </li>
        )}
      </ul>
    </main>
  );
};

export default AdminPage;
