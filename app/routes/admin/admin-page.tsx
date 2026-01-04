import { NavLink } from "react-router";

const AdminPage = () => {
  return (
    <main>
      <h1>Administer System</h1>
      <ul>
        <li>
          <NavLink to={"/admin/users"}>Users</NavLink>
        </li>
      </ul>
    </main>
  );
};

export default AdminPage;
