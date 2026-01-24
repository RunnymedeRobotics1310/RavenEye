import RequireLogin from "~/common/auth/RequireLogin.tsx";
import { NavLink } from "react-router";
import { useState } from "react";
import { createUser } from "~/common/storage/rb.ts";
import { UserForm, type UserFormData } from "./UserForm.tsx";

const Success = () => {
  return (
    <section>
      <h1>Success!</h1>
      <p>User created successfully.</p>
      <NavLink to={"/admin/users"}>
        <button>Return to Users</button>
      </NavLink>
    </section>
  );
};

const AddPage = () => {
  const [success, setSuccess] = useState<boolean>(false);
  const [error, setError] = useState<boolean>(false);
  const [msg, setMsg] = useState<string>("");

  const handleSubmit = async (item: UserFormData) => {
    setError(false);
    setMsg("");
    try {
      const resp = await createUser(item);
      console.log("Created", resp);
      setSuccess(true);
    } catch (err: any) {
      setError(true);
      setMsg("Something went wrong: " + err.message);
    }
  };

  return (
    <main>
      <h1>Manage Users</h1>
      <p>Create a new user.</p>
      <RequireLogin>
        {error && <p className={"errorMessage"}>{msg}</p>}
        {success ? (
          <Success />
        ) : (
          <UserForm submitFunction={handleSubmit} disabled={success} />
        )}
      </RequireLogin>
    </main>
  );
};
export default AddPage;
