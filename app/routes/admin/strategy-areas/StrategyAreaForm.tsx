import { type FormEvent, useState, useEffect } from "react";
import { NavLink } from "react-router";
import type { StrategyArea } from "~/types/StrategyArea.ts";

export const StrategyAreaForm = ({
  submitFunction,
  disabled,
  initialData,
  isEdit,
}: {
  submitFunction: (item: StrategyArea) => void;
  disabled: boolean;
  initialData?: StrategyArea;
  isEdit?: boolean;
}) => {
  const [item, setItem] = useState<StrategyArea>({
    id: 0,
    code: "",
    frcyear: new Date().getFullYear(),
    name: "",
    description: "",
  });

  useEffect(() => {
    if (initialData) {
      setItem(initialData);
    }
  }, [initialData]);

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
        <label id={"code-label"}>Code:</label>
        <br />
        <input
          aria-labelledby={"code-label"}
          type="text"
          name="code"
          required
          pattern="^[0-9a-zA-Z-]+$"
          title="Letters, numbers, and hyphens only"
          readOnly={isEdit}
          value={item.code}
          onChange={(e) => setItem({ ...item, code: e.target.value })}
        />
        {!isEdit && (
          <small> (letters, numbers, and hyphens only)</small>
        )}
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
        <textarea
          aria-labelledby={"description-label"}
          name="description"
          required
          rows={3}
          maxLength={1024}
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
