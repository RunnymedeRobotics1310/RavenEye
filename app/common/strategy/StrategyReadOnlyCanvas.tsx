import { forwardRef } from "react";
import StrategyCanvas, {
  type StrategyCanvasHandle,
} from "~/common/strategy/StrategyCanvas.tsx";
import type { StrategyStroke } from "~/types/StrategyStroke.ts";

type Props = {
  backgroundSrc: string;
  strokes: StrategyStroke[];
};

const StrategyReadOnlyCanvas = forwardRef<StrategyCanvasHandle, Props>(
  function StrategyReadOnlyCanvas(props, ref) {
    return (
      <StrategyCanvas
        ref={ref}
        backgroundSrc={props.backgroundSrc}
        strokes={props.strokes}
        readOnly={true}
        selectedSlot="R1"
      />
    );
  },
);

export default StrategyReadOnlyCanvas;
