import type { RobotSlot } from "~/types/StrategyStroke.ts";
import { ROBOT_COLORS, ROBOT_SLOTS } from "~/common/strategy/colors.ts";

type Props = {
  selected: RobotSlot;
  onSelect: (slot: RobotSlot) => void;
  teamNumbers: Record<RobotSlot, number | null>;
  disabled?: boolean;
  /** Optional CSS overrides merged into the container. */
  style?: React.CSSProperties;
};

export default function RobotSlotPalette(props: Props) {
  const { selected, onSelect, teamNumbers, disabled, style } = props;
  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        gap: "0.4rem",
        ...style,
      }}
    >
      {ROBOT_SLOTS.map((slot, i) => {
        const isSelected = selected === slot;
        const color = ROBOT_COLORS[i]!;
        const team = teamNumbers[slot];
        return (
          <button
            key={slot}
            type="button"
            disabled={disabled}
            onClick={() => onSelect(slot)}
            style={{
              background: isSelected ? color : "transparent",
              color: isSelected ? "#fff" : color,
              border: `3px solid ${color}`,
              borderRadius: "0.5rem",
              padding: "0.4rem 0.7rem",
              minWidth: "4.2rem",
              fontWeight: 700,
              cursor: disabled ? "not-allowed" : "pointer",
              opacity: disabled ? 0.5 : 1,
              textTransform: "none",
              letterSpacing: 0,
            }}
          >
            <div style={{ fontSize: "0.75rem" }}>{slot}</div>
            <div style={{ fontSize: "1rem" }}>
              {team != null && team > 0 ? team : "—"}
            </div>
          </button>
        );
      })}
    </div>
  );
}
