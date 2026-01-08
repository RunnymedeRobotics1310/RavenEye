import RequireLogin from "~/common/auth/RequireLogin.tsx";
import { NavLink } from "react-router";
import { useState } from "react";
import type { SequenceType } from "~/types/SequenceType.ts";
import { createSequenceType } from "~/common/storage/rb.ts";
import { SequenceTypeForm } from "./SequenceTypeForm.tsx";
import { syncSequenceTypeList } from "~/common/sync/sync.ts";

const Success = () => {
  return (
    <section>
      <h1>Success!</h1>
      <NavLink to={"/admin/sequence-types"}>
        <button>Return to Sequence Types</button>
      </NavLink>
    </section>
  );
};

const AddPage = () => {
  const [success, setSuccess] = useState<boolean>(false);
  const [error, setError] = useState<boolean>(false);
  const [msg, setMsg] = useState<string>("");

  const handleSubmit = async (item: SequenceType) => {
    setError(false);
    setMsg("");
    try {
      const resp = await createSequenceType(item);
      console.log("Created", resp);
      await syncSequenceTypeList();
      setSuccess(true);
    } catch (err: any) {
      setError(true);
      setMsg("Something went wrong: " + err.message);
    }
  };

  return (
    <main>
      <h1>Manage Sequence Types</h1>
      <p>Create a new sequence type.</p>
      <RequireLogin>
        {error && <p className={"errorMessage"}>{msg}</p>}
        {success ? (
          <Success />
        ) : (
          <SequenceTypeForm submitFunction={handleSubmit} disabled={success} />
        )}
      </RequireLogin>
    </main>
  );
};
export default AddPage;
