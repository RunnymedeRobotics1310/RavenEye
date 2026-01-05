import RequireLogin from "~/common/auth/RequireLogin.tsx";
import { NavLink } from "react-router";
import { type FormEvent, useState } from "react";
import type { StrategyArea } from "~/types/StrategyArea.ts";
import { createStrategyArea } from "~/common/storage/ravenbrain.ts";

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

const FormComponent = ({
  submitFunction,
  disabled,
}: {
  submitFunction: (item: StrategyArea) => void;
  disabled: boolean;
}) => {
  const [item, setItem] = useState<StrategyArea>({
    id: 0,
    frcyear: new Date().getFullYear(),
    name: "",
    description: "",
  });

  const handleFormSubmit = (e: FormEvent) => {
    e.preventDefault();
    submitFunction(item);
  };

  return (
    <form onSubmit={handleFormSubmit}>
      <p>
        <label id={"season-label"}>Season:</label>
        <br />
        <input
          aria-labelledby={"season-label"}
          type="number"
          name="season"
          required
          value={item.frcyear}
          onChange={(e) =>
            setItem({ ...item, frcyear: parseInt(e.target.value) || 0 })
          }
        />
      </p>
      <p>
        <label id={"name-label"}>Name:</label>
        <br />
        <input
          aria-labelledby={"name-label"}
          type="text"
          name="name"
          required
          value={item.name}
          onChange={(e) => setItem({ ...item, name: e.target.value })}
        />
      </p>
      <p>
        <label id={"description-label"}>Description:</label>
        <br />
        <input
          aria-labelledby={"description-label"}
          type="text"
          name="description"
          required
          value={item.description}
          onChange={(e) => setItem({ ...item, description: e.target.value })}
        />
      </p>
      <button type={"submit"} disabled={disabled}>
        Save
      </button>
      <NavLink to={"/admin/strategy-areas"}>
        <button type="button">Cancel</button>
      </NavLink>
    </form>
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
          <FormComponent submitFunction={handleSubmit} disabled={success} />
        )}
      </RequireLogin>
    </main>
  );
};
export default AddPage;
