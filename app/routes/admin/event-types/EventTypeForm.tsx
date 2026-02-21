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
    showQuantity: false,
    showNote: false,
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
      <div className="form-field">
        <label htmlFor="eventtype">Event Type (key)</label>
        <input
          id="eventtype"
          type="text"
          name="eventtype"
          required
          pattern="^[0-9a-z_-]+$"
          title="Lowercase letters, numbers, hyphens, and underscores only"
          readOnly={isEdit}
          value={item.eventtype}
          onChange={(e) => setItem({ ...item, eventtype: e.target.value })}
        />
        {!isEdit && (
          <small> (lowercase letters, numbers, hyphens, and underscores only)</small>
        )}
      </div>
      <div className="form-field">
        <label htmlFor="season">Season</label>
        <input
          id="season"
          type="number"
          name="season"
          required
          readOnly={isEdit}
          value={item.frcyear}
          onChange={(e) =>
            setItem({ ...item, frcyear: parseInt(e.target.value) || 0 })
          }
        />
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
      <div className="form-field">
        <label htmlFor="strategyareaId">Strategy Area</label>
        <select
          id="strategyareaId"
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
      </div>
      <div className="form-field">
        <label>
          <input
            type="checkbox"
            checked={item.showQuantity}
            onChange={(e) =>
              setItem({ ...item, showQuantity: e.target.checked })
            }
          />{" "}
          Show Quantity
        </label>
      </div>
      <div className="form-field">
        <label>
          <input
            type="checkbox"
            checked={item.showNote}
            onChange={(e) => setItem({ ...item, showNote: e.target.checked })}
          />{" "}
          Show Note
        </label>
      </div>
      <div className="form-actions">
        <button type={"submit"} disabled={disabled}>
          Save
        </button>
        <NavLink to={"/admin/event-types"} className="btn-secondary">Cancel</NavLink>
      </div>
    </form>
  );
};
