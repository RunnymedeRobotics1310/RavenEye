import RequireLogin from "~/common/auth/RequireLogin.tsx";
import { NavLink, useParams } from "react-router";
import { useState } from "react";
import type { EventType } from "~/types/EventType.ts";
import { updateEventType, useEventType } from "~/common/storage/rb.ts";
import { EventTypeForm } from "./EventTypeForm.tsx";
import Spinner from "~/common/Spinner.tsx";
import ErrorMessage from "~/common/ErrorMessage.tsx";
import { syncEventTypeList } from "~/common/sync/sync.ts";

const Success = () => {
  return (
    <section>
      <h1>Success!</h1>
      <p>Event type updated successfully.</p>
      <NavLink to={"/admin/event-types"} className="btn">Return to Event Types</NavLink>
    </section>
  );
};

const EditPage = () => {
  const { eventtype } = useParams();
  const { data, loading, error: fetchError } = useEventType(eventtype);
  const [success, setSuccess] = useState<boolean>(false);
  const [error, setError] = useState<boolean>(false);
  const [msg, setMsg] = useState<string>("");

  const handleSubmit = async (item: EventType) => {
    setError(false);
    setMsg("");
    try {
      const resp = await updateEventType(item);
      console.log("Updated", resp);
      await syncEventTypeList();
      setSuccess(true);
    } catch (err: any) {
      setError(true);
      setMsg("Something went wrong: " + err.message);
    }
  };

  if (loading) return <Spinner />;
  if (fetchError)
    return (
      <ErrorMessage title="Error fetching event type">
        {fetchError}
      </ErrorMessage>
    );

  return (
    <main>
      <h1>Manage Event Types</h1>
      <p>Edit event type.</p>
      <RequireLogin>
        {error && <p className={"errorMessage"}>{msg}</p>}
        {success ? (
          <Success />
        ) : (
          <EventTypeForm
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
