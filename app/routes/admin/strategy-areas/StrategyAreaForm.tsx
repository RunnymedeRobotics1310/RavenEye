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
      <div className="form-field">
        <label htmlFor="season">Season</label>
        <input
          id="season"
          type="number"
          name="season"
          required
          value={item.frcyear}
          onChange={(e) =>
            setItem({ ...item, frcyear: parseInt(e.target.value) || 0 })
          }
        />
      </div>
      <div className="form-field">
        <label htmlFor="code">Code</label>
        <input
          id="code"
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
      </div>
      <div className="form-field">
        <label htmlFor="name">Name</label>
        <input
          id="name"
          type="text"
          name="name"
          required
          value={item.name}
          onChange={(e) => setItem({ ...item, name: e.target.value })}
        />
      </div>
      <div className="form-field">
        <label htmlFor="description">Description</label>
        <textarea
          id="description"
          name="description"
          required
          rows={3}
          maxLength={1024}
          value={item.description}
          onChange={(e) => setItem({ ...item, description: e.target.value })}
        />
      </div>
      <div className="form-actions">
        <button type={"submit"} disabled={disabled}>
          Save
        </button>
        <NavLink to={"/admin/strategy-areas"} className="btn-secondary">Cancel</NavLink>
      </div>
    </form>
  );
};
