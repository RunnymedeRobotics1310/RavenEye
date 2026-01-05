import RequireLogin from "~/common/auth/RequireLogin.tsx";
import { NavLink } from "react-router";
import { useState } from "react";
import type { StrategyArea } from "~/types/StrategyArea.ts";
import { createStrategyArea } from "~/common/storage/ravenbrain.ts";
import { StrategyAreaForm } from "./StrategyAreaForm.tsx";

const Success = () => {
  return (
    <section>
      <h1>Success!</h1>
      <NavLink to={"/admin/strategy-areas"}>
        <button>Return to Strategy Areas</button>
      </NavLink>
    </section>
  );
};

const AddPage = () => {
  const [success, setSuccess] = useState<boolean>(false);
  const [error, setError] = useState<boolean>(false);
  const [msg, setMsg] = useState<string>("");

  const handleSubmit = (item: StrategyArea) => {
    setError(false);
    setMsg("");
    createStrategyArea(item)
      .then((resp) => {
        console.log("Created", resp);
        setSuccess(true);
      })
      .catch((err) => {
        setError(true);
        setMsg("Something went wrong: " + err.message);
      });
  };

  return (
    <main>
      <h1>Manage Strategy Areas</h1>
      <p>Create a new strategy area.</p>
      <RequireLogin>
        {error && <p style={{ color: "red" }}>{msg}</p>}
        {success ? (
          <Success />
        ) : (
          <StrategyAreaForm submitFunction={handleSubmit} disabled={success} />
        )}
      </RequireLogin>
    </main>
  );
};
export default AddPage;
