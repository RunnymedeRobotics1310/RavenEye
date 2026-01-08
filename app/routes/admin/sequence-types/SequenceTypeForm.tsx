import { type FormEvent, useState, useEffect } from "react";
import { NavLink } from "react-router";
import type { SequenceType } from "~/types/SequenceType.ts";
import type { SequenceEvent } from "~/types/SequenceEvent.ts";
import type { EventType } from "~/types/EventType.ts";
import { useEventTypeList } from "~/common/storage/db.ts";

export const SequenceTypeForm = ({
  submitFunction,
  disabled,
  initialData,
}: {
  submitFunction: (item: SequenceType) => void;
  disabled: boolean;
  initialData?: SequenceType;
}) => {
  const [item, setItem] = useState<SequenceType>({
    id: 0,
    name: "",
    description: "",
    events: [],
  });

  const { list: eventTypes } = useEventTypeList();

  useEffect(() => {
    if (initialData) {
      setItem(initialData);
    }
  }, [initialData]);

  const handleFormSubmit = (e: FormEvent) => {
    e.preventDefault();
    submitFunction(item);
  };

  const addEvent = () => {
    if (!eventTypes || eventTypes.length === 0) return;
    const newEvent: SequenceEvent = {
      id: 0,
      sequencetype: item,
      eventtype: eventTypes[0],
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
                        const et = eventTypes?.find(
                          (t) => t.eventtype === e.target.value,
                        );
                        if (et) updateEvent(index, { eventtype: et });
                      }}
                    >
                      {eventTypes?.map((et) => (
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
