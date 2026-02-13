import RequireLogin from "~/common/auth/RequireLogin.tsx";
import { NavLink } from "react-router";
import { useState } from "react";
import type { EventType } from "~/types/EventType.ts";
import { createEventType } from "~/common/storage/rb.ts";
import { EventTypeForm } from "./EventTypeForm.tsx";
import { syncEventTypeList } from "~/common/sync/sync.ts";

const Success = () => {
  return (
    <section>
      <h1>Success!</h1>
      <NavLink to={"/admin/event-types"}>
        <button>Return to Event Types</button>
      </NavLink>
    </section>
  );
};

const AddPage = () => {
  const [success, setSuccess] = useState<boolean>(false);
  const [error, setError] = useState<boolean>(false);
  const [msg, setMsg] = useState<string>("");

  const handleSubmit = async (item: EventType) => {
    setError(false);
    setMsg("");
    try {
      const resp = await createEventType(item);
      console.log("Created", resp);
      await syncEventTypeList();
      setSuccess(true);
    } catch (err: any) {
      setError(true);
      setMsg("Something went wrong: " + err.message);
    }
  };

  return (
    <main>
      <h1>Manage Event Types</h1>
      <p>Create a new event type.</p>
      <RequireLogin>
        {error && <p className={"errorMessage"}>{msg}</p>}
        {success ? (
          <Success />
        ) : (
          <EventTypeForm submitFunction={handleSubmit} disabled={success} />
        )}
      </RequireLogin>
    </main>
  );
};
export default AddPage;
