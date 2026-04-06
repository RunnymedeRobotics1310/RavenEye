import type { StoredStrategyDrawing } from "~/common/storage/db.ts";

type Props = {
  drawings: StoredStrategyDrawing[];
  activeLocalId: string | null;
  onSelect: (localId: string) => void;
  onAdd: () => void;
  onDelete: (localId: string) => void;
  canEdit: boolean;
};

export default function DrawingList(props: Props) {
  const { drawings, activeLocalId, onSelect, onAdd, onDelete, canEdit } = props;
  return (
    <div className="strategy-drawing-list">
      <h3>Drawings</h3>
      <ul>
        {drawings.map((d) => {
          const isActive = d.localId === activeLocalId;
          return (
            <li
              key={d.localId}
              className={isActive ? "is-active" : undefined}
              onClick={() => onSelect(d.localId)}
            >
              <div className="strategy-drawing-label">
                <div className="strategy-drawing-title">
                  {d.label || "(untitled)"}
                </div>
                <div className="strategy-drawing-meta">
                  by {d.createdByDisplayName || "you"}
                  {d.dirty ? " · unsynced" : ""}
                </div>
              </div>
              {canEdit && (
                <button
                  type="button"
                  className="strategy-drawing-delete"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm("Delete this drawing?")) {
                      onDelete(d.localId);
                    }
                  }}
                >
                  ×
                </button>
              )}
            </li>
          );
        })}
      </ul>
      {canEdit && (
        <button
          type="button"
          className="strategy-drawing-add"
          onClick={onAdd}
        >
          + New Drawing
        </button>
      )}
    </div>
  );
}
