import RequireLogin from "~/common/auth/RequireLogin.tsx";
import { NavLink, useParams } from "react-router";
import { useState } from "react";
import { updateUser, useUser } from "~/common/storage/rb.ts";
import { UserForm, type UserFormData } from "./UserForm.tsx";
import Spinner from "~/common/Spinner.tsx";
import ErrorMessage from "~/common/ErrorMessage.tsx";

const Success = () => {
  return (
    <section>
      <h1>Success!</h1>
      <p>User updated successfully.</p>
      <NavLink to={"/admin/users"} className="btn">Return to Users</NavLink>
    </section>
  );
};

const EditPage = () => {
  const { id } = useParams();
  const { data, loading, error: fetchError } = useUser(id);
  const [success, setSuccess] = useState<boolean>(false);
  const [error, setError] = useState<boolean>(false);
  const [msg, setMsg] = useState<string>("");

  const handleSubmit = async (item: UserFormData) => {
    setError(false);
    setMsg("");
    try {
      const resp = await updateUser(item);
      console.log("Updated", resp);
      setSuccess(true);
    } catch (err: any) {
      setError(true);
      setMsg("Something went wrong: " + err.message);
    }
  };

  if (loading) return <Spinner />;
  if (fetchError)
    return (
      <ErrorMessage title="Error fetching user">{fetchError}</ErrorMessage>
    );

  return (
    <main>
      <h1>Manage Users</h1>
      <p>Edit user.</p>
      <RequireLogin>
        {error && <p className={"errorMessage"}>{msg}</p>}
        {success ? (
          <Success />
        ) : (
          <UserForm
            submitFunction={handleSubmit}
            disabled={success}
            initialData={data || undefined}
            isEdit={true}
          />
        )}
      </RequireLogin>
    </main>
  );
};
export default EditPage;
