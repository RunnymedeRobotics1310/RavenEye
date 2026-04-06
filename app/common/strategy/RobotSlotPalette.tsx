import type { RobotSlot } from "~/types/StrategyStroke.ts";
import { ROBOT_COLORS, ROBOT_SLOTS } from "~/common/strategy/colors.ts";

type Props = {
  selected: RobotSlot;
  onSelect: (slot: RobotSlot) => void;
  teamNumbers: Record<RobotSlot, number | null>;
  disabled?: boolean;
  /**
   * When non-null, only this slot's strokes are visible on the canvas. All
   * other slot buttons are rendered as hidden/dimmed in the palette.
   */
  soloedSlot?: RobotSlot | null;
  /** Optional CSS overrides merged into the container. */
  style?: React.CSSProperties;
};

export default function RobotSlotPalette(props: Props) {
  const {
    selected,
    onSelect,
    teamNumbers,
    disabled,
    soloedSlot = null,
    style,
  } = props;
  return (
    <div className="strategy-palette" style={style}>
      {ROBOT_SLOTS.map((slot, i) => {
        const isSelected = selected === slot;
        const color = ROBOT_COLORS[i]!;
        const team = teamNumbers[slot];
        const isHidden = soloedSlot != null && slot !== soloedSlot;
        const classes = [
          "strategy-palette-slot",
          isSelected && "is-selected",
          isHidden && "is-hidden",
        ]
          .filter(Boolean)
          .join(" ");
        return (
          <button
            key={slot}
            type="button"
            disabled={disabled}
            onClick={() => onSelect(slot)}
            title={
              isHidden
                ? `${slot} strokes hidden — tap to show everyone`
                : undefined
            }
            className={classes}
            style={{ "--slot-color": color } as React.CSSProperties}
          >
            <div className="strategy-palette-slot-label">{slot}</div>
            <div className="strategy-palette-slot-team">
              {team != null && team > 0 ? team : "—"}
            </div>
          </button>
        );
      })}
    </div>
  );
}
