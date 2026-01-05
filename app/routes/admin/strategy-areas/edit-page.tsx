import RequireLogin from "~/common/auth/RequireLogin.tsx";
import { NavLink, useParams } from "react-router";
import { useState } from "react";
import type { StrategyArea } from "~/types/StrategyArea.ts";
import {
  updateStrategyArea,
  useStrategyArea,
} from "~/common/storage/ravenbrain.ts";
import { StrategyAreaForm } from "./StrategyAreaForm.tsx";
import Spinner from "~/common/Spinner.tsx";
import ErrorMessage from "~/common/ErrorMessage.tsx";

const Success = () => {
  return (
    <section>
      <h1>Success!</h1>
      <p>Strategy area updated successfully.</p>
      <NavLink to={"/admin/strategy-areas"}>
        <button>Return to Strategy Areas</button>
      </NavLink>
    </section>
  );
};

const EditPage = () => {
  const { id } = useParams();
  const { data, loading, error: fetchError } = useStrategyArea(id);
  const [success, setSuccess] = useState<boolean>(false);
  const [error, setError] = useState<boolean>(false);
  const [msg, setMsg] = useState<string>("");

  const handleSubmit = (item: StrategyArea) => {
    setError(false);
    setMsg("");
    updateStrategyArea(item)
      .then((resp) => {
        setSuccess(true);
      })
      .catch((err) => {
        setError(true);
        setMsg("Something went wrong: " + err.message);
      });
  };

  if (loading) return <Spinner />;
  if (fetchError)
    return (
      <ErrorMessage title="Error fetching strategy area">
        {fetchError}
      </ErrorMessage>
    );

  return (
    <main>
      <h1>Manage Strategy Areas</h1>
      <p>Edit strategy area.</p>
      <RequireLogin>
        {error && <p style={{ color: "red" }}>{msg}</p>}
        {success ? (
          <Success />
        ) : (
          <StrategyAreaForm
            submitFunction={handleSubmit}
            disabled={success}
            initialData={data || undefined}
          />
        )}
      </RequireLogin>
    </main>
  );
};
export default EditPage;
