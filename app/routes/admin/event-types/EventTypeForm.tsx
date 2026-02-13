import { type FormEvent, useState, useEffect, useMemo } from "react";
import { NavLink } from "react-router";
import type { EventType } from "~/types/EventType.ts";
import { useStrategyAreaList } from "~/common/storage/dbhooks.ts";

export const EventTypeForm = ({
  submitFunction,
  disabled,
  initialData,
  isEdit,
}: {
  submitFunction: (item: EventType) => void;
  disabled: boolean;
  initialData?: EventType;
  isEdit?: boolean;
}) => {
  const [item, setItem] = useState<EventType>({
    eventtype: "",
    name: "",
    description: "",
    frcyear: new Date().getFullYear(),
    strategyareaId: 0,
  });

  const { list: strategyAreas } = useStrategyAreaList();

  const filteredStrategyAreas = useMemo(() => {
    return strategyAreas?.filter((sa) => sa.frcyear === item.frcyear) || [];
  }, [strategyAreas, item.frcyear]);

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
        <label id={"eventtype-label"}>Event Type (key):</label>
        <br />
        <input
          aria-labelledby={"eventtype-label"}
          type="text"
          name="eventtype"
          required
          pattern="^[0-9a-zA-Z-]+$"
          title="Letters, numbers, and hyphens only"
          readOnly={isEdit}
          value={item.eventtype}
          onChange={(e) => setItem({ ...item, eventtype: e.target.value })}
        />
        {!isEdit && (
          <small> (letters, numbers, and hyphens only)</small>
        )}
      </p>
      <p>
        <label id={"season-label"}>Season:</label>
        <br />
        <input
          aria-labelledby={"season-label"}
          type="number"
          name="season"
          required
          readOnly={isEdit}
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
      <p>
        <label id={"strategyarea-label"}>Strategy Area:</label>
        <br />
        <select
          aria-labelledby={"strategyarea-label"}
          name="strategyareaId"
          required
          value={item.strategyareaId || ""}
          onChange={(e) =>
            setItem({ ...item, strategyareaId: parseInt(e.target.value) || 0 })
          }
        >
          <option value="" disabled>
            -- Select a strategy area --
          </option>
          {filteredStrategyAreas.map((sa) => (
            <option key={sa.id} value={sa.id}>
              {sa.name}
            </option>
          ))}
        </select>
      </p>
      <button type={"submit"} disabled={disabled}>
        Save
      </button>
      <NavLink to={"/admin/event-types"}>
        <button type="button">Cancel</button>
      </NavLink>
    </form>
  );
};
