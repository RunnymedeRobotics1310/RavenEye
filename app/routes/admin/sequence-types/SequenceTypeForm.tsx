import { type FormEvent, useState, useEffect, useMemo } from "react";
import { NavLink } from "react-router";
import type { SequenceType } from "~/types/SequenceType.ts";
import type { SequenceEvent } from "~/types/SequenceEvent.ts";
import type { EventType } from "~/types/EventType.ts";

import {
  useEventTypeList,
  useStrategyAreaList,
} from "~/common/storage/dbhooks.ts";

export const SequenceTypeForm = ({
  submitFunction,
  disabled,
  initialData,
  isEdit,
}: {
  submitFunction: (item: SequenceType) => void;
  disabled: boolean;
  initialData?: SequenceType;
  isEdit?: boolean;
}) => {
  const [item, setItem] = useState<SequenceType>({
    id: 0,
    code: "",
    name: "",
    description: "",
    frcyear: new Date().getFullYear(),
    strategyareaId: 0,
    disabled: false,
    events: [],
  });

  const { list: eventTypes } = useEventTypeList();
  const { list: strategyAreas } = useStrategyAreaList();

  const filteredEventTypes = useMemo(() => {
    return eventTypes?.filter((et) => et.frcyear === item.frcyear) || [];
  }, [eventTypes, item.frcyear]);

  const filteredStrategyAreas = useMemo(() => {
    return strategyAreas?.filter((sa) => sa.frcyear === item.frcyear) || [];
  }, [strategyAreas, item.frcyear]);

  useEffect(() => {
    if (initialData) {
      setItem(initialData);
    }
  }, [initialData]);

  useEffect(() => {
    if (item.events && item.events.length > 0) {
      const validEvents = item.events.filter(
        (ev) => ev.eventtype.frcyear === item.frcyear,
      );
      if (validEvents.length !== item.events.length) {
        setItem((prev) => ({ ...prev, events: validEvents }));
      }
    }
  }, [item.frcyear]);

  const handleFormSubmit = (e: FormEvent) => {
    e.preventDefault();
    submitFunction(item);
  };

  const addEvent = () => {
    if (filteredEventTypes.length === 0) return;
    const newEvent: SequenceEvent = {
      id: 0,
      sequencetype: item,
      eventtype: filteredEventTypes[0],
      startOfSequence: false,
      endOfSequence: false,
    };
    if (item.events) {
      setItem({ ...item, events: [...item.events, newEvent] });
    } else {
      setItem({ ...item, events: [newEvent] });
    }
  };

  const updateEvent = (index: number, updatedEvent: Partial<SequenceEvent>) => {
    const newEvents = [...item.events];
    newEvents[index] = { ...newEvents[index], ...updatedEvent };
    setItem({ ...item, events: newEvents });
  };

  const removeEvent = (index: number) => {
    const newEvents = item.events.filter((_, i) => i !== index);
    setItem({ ...item, events: newEvents });
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
      <p>
        <label id={"disabled-label"}>Disabled:</label>
        <br />
        <input
          aria-labelledby={"disabled-label"}
          type="checkbox"
          name="disabled"
          checked={item.disabled}
          onChange={(e) => setItem({ ...item, disabled: e.target.checked })}
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
      {item && (
        <div>
          <h3>Events</h3>
          <table>
            <thead>
              <tr>
                <th>Event Type</th>
                <th>Start</th>
                <th>End</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {item.events?.map((ev, index) => (
                <tr key={index}>
                  <td>
                    <select
                      value={ev.eventtype.eventtype}
                      onChange={(e) => {
                        const et = filteredEventTypes?.find(
                          (t) => t.eventtype === e.target.value,
                        );
                        if (et) updateEvent(index, { eventtype: et });
                      }}
                    >
                      {filteredEventTypes?.map((et) => (
                        <option key={et.eventtype} value={et.eventtype}>
                          {et.name}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <input
                      type="checkbox"
                      checked={ev.startOfSequence}
                      onChange={(e) =>
                        updateEvent(index, {
                          startOfSequence: e.target.checked,
                        })
                      }
                    />
                  </td>
                  <td>
                    <input
                      type="checkbox"
                      checked={ev.endOfSequence}
                      onChange={(e) =>
                        updateEvent(index, { endOfSequence: e.target.checked })
                      }
                    />
                  </td>
                  <td>
                    <button type="button" onClick={() => removeEvent(index)}>
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <button type="button" onClick={addEvent}>
            Add Event
          </button>
        </div>
      )}
      <hr />
      <button type={"submit"} disabled={disabled}>
        Save
      </button>
      <NavLink to={"/admin/sequence-types"}>
        <button type="button">Cancel</button>
      </NavLink>
    </form>
  );
};
