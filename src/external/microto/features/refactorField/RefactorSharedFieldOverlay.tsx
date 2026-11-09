import { SharedFieldCanvasLayer } from "./SharedFieldCanvasLayer";
import type { SharedFieldController } from "./sharedFieldController";
import type { SharedFieldSnapshot } from "./sharedFieldTypes";

type RefactorSharedFieldOverlayProps = {
  width: number;
  height: number;
  active: boolean;
  interactive?: boolean;
  getSnapshot: (width: number, height: number) => SharedFieldSnapshot;
  onNodeDragStart?: (nodeId: string, clientX: number, clientY: number, rect: DOMRect) => void;
  onNodeDragMove?: (nodeId: string, clientX: number, clientY: number, rect: DOMRect) => void;
  onNodeDragEnd?: () => void;
};

export function RefactorSharedFieldOverlay({
  width,
  height,
  active,
  interactive = false,
  getSnapshot,
  onNodeDragStart,
  onNodeDragMove,
  onNodeDragEnd,
}: RefactorSharedFieldOverlayProps) {
  const controller: SharedFieldController = {
    active,
    interactive,
    getSnapshot,
    onNodeDragStart,
    onNodeDragMove,
    onNodeDragEnd,
  };

  return <SharedFieldCanvasLayer width={width} height={height} controller={controller} />;
}
