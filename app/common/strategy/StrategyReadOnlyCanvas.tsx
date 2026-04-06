import { forwardRef } from "react";
import StrategyCanvas, {
  type CanvasRotation,
  type StrategyCanvasHandle,
} from "~/common/strategy/StrategyCanvas.tsx";
import type { StrategyStroke } from "~/types/StrategyStroke.ts";

type Props = {
  backgroundSrc: string;
  strokes: StrategyStroke[];
  rotation?: CanvasRotation;
  zoom?: number;
  panX?: number;
  panY?: number;
  fillHeight?: boolean;
  onPanChange?: (panX: number, panY: number) => void;
  onZoomChange?: (zoom: number, panX: number, panY: number) => void;
  onPlaybackEnd?: () => void;
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
        rotation={props.rotation}
        zoom={props.zoom}
        panX={props.panX}
        panY={props.panY}
        fillHeight={props.fillHeight}
        onPanChange={props.onPanChange}
        onZoomChange={props.onZoomChange}
        onPlaybackEnd={props.onPlaybackEnd}
      />
    );
  },
);

export default StrategyReadOnlyCanvas;
