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
      <NavLink to={"/admin/event-types"} className="btn">
        Return to Event Types
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
      <div className="page-header">
        <h1>Add Event Type</h1>
      </div>
      <section className="card">
        <RequireLogin>
          {error && <p className={"errorMessage"}>{msg}</p>}
          {success ? (
            <Success />
          ) : (
            <EventTypeForm submitFunction={handleSubmit} disabled={success} />
          )}
        </RequireLogin>
      </section>
    </main>
  );
};
export default AddPage;
