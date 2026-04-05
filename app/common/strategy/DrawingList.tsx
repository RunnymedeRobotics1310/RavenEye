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
    <div>
      <h3 style={{ margin: "0.5rem 0" }}>Drawings</h3>
      <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
        {drawings.map((d) => {
          const isActive = d.localId === activeLocalId;
          return (
            <li
              key={d.localId}
              style={{
                padding: "0.5rem",
                marginBottom: "0.3rem",
                borderRadius: "0.4rem",
                border: isActive
                  ? "2px solid var(--color-btn-primary-bg, #38f)"
                  : "2px solid transparent",
                background: isActive
                  ? "rgba(56, 136, 255, 0.12)"
                  : "rgba(128, 128, 128, 0.08)",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "0.5rem",
              }}
              onClick={() => onSelect(d.localId)}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600 }}>{d.label || "(untitled)"}</div>
                <div style={{ fontSize: "0.75rem", opacity: 0.7 }}>
                  by {d.createdByDisplayName || "you"}
                  {d.dirty ? " · unsynced" : ""}
                </div>
              </div>
              {canEdit && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm("Delete this drawing?")) {
                      onDelete(d.localId);
                    }
                  }}
                  style={{
                    padding: "0.2rem 0.5rem",
                    fontSize: "0.7rem",
                    background: "transparent",
                    color: "var(--color-text-primary)",
                    border: "1px solid currentColor",
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
          onClick={onAdd}
          style={{ marginTop: "0.5rem", width: "100%" }}
        >
          + New Drawing
        </button>
      )}
    </div>
  );
}
