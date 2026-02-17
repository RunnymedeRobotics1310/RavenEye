import RequireLogin from "~/common/auth/RequireLogin.tsx";
import { NavLink, useParams } from "react-router";
import { useState } from "react";
import type { SequenceType } from "~/types/SequenceType.ts";
import { updateSequenceType, useSequenceType } from "~/common/storage/rb.ts";
import { SequenceTypeForm } from "./SequenceTypeForm.tsx";
import Spinner from "~/common/Spinner.tsx";
import ErrorMessage from "~/common/ErrorMessage.tsx";
import { syncSequenceTypeList } from "~/common/sync/sync.ts";

const Success = () => {
  return (
    <section>
      <h1>Success!</h1>
      <p>Sequence type updated successfully.</p>
      <NavLink to={"/admin/sequence-types"}>
        <button>Return to Sequence Types</button>
      </NavLink>
    </section>
  );
};

const EditPage = () => {
  const { id } = useParams();
  const { data, loading, error: fetchError } = useSequenceType(id);
  const [success, setSuccess] = useState<boolean>(false);
  const [error, setError] = useState<boolean>(false);
  const [msg, setMsg] = useState<string>("");

  const handleSubmit = async (item: SequenceType) => {
    setError(false);
    setMsg("");
    try {
      const resp = await updateSequenceType(item);
      console.log("Updated", resp);
      await syncSequenceTypeList();
      setSuccess(true);
    } catch (err: any) {
      setError(true);
      setMsg("Something went wrong: " + err.message);
    }
  };

  if (loading) return <Spinner />;
  if (fetchError)
    return (
      <ErrorMessage title="Error fetching sequence type">
        {fetchError}
      </ErrorMessage>
    );

  return (
    <main>
      <h1>Manage Sequence Types</h1>
      <p>Edit sequence type.</p>
      <RequireLogin>
        {error && <p className={"errorMessage"}>{msg}</p>}
        {success ? (
          <Success />
        ) : (
          <SequenceTypeForm
            submitFunction={handleSubmit}
            disabled={success}
            initialData={data || undefined}
            isEdit
          />
        )}
      </RequireLogin>
    </main>
  );
};
export default EditPage;
