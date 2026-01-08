import RequireLogin from "~/common/auth/RequireLogin.tsx";
import { NavLink } from "react-router";
import { useState } from "react";
import type { StrategyArea } from "~/types/StrategyArea.ts";
import { createStrategyArea } from "~/common/storage/rb.ts";
import { StrategyAreaForm } from "./StrategyAreaForm.tsx";
import { syncStrategyAreaList } from "~/common/sync/sync.ts";

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

  const handleSubmit = async (item: StrategyArea) => {
    setError(false);
    setMsg("");
    try {
      const resp = await createStrategyArea(item);
      console.log("Created", resp);
      await syncStrategyAreaList();
      setSuccess(true);
    } catch (err: any) {
      setError(true);
      setMsg("Something went wrong: " + err.message);
    }
  };

  return (
    <main>
      <h1>Manage Strategy Areas</h1>
      <p>Create a new strategy area.</p>
      <RequireLogin>
        {error && <p className={"errorMessage"}>{msg}</p>}
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
