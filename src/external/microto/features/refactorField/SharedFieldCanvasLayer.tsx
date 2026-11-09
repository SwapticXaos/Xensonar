import { useEffect, useMemo, useRef, useState } from "react";
import { drawSharedFieldOverlay } from "./sharedFieldDraw";
import type { SharedFieldController } from "./sharedFieldController";
import type { SharedFieldNode, SharedFieldSnapshot } from "./sharedFieldTypes";

type SharedFieldCanvasLayerProps = {
  width: number;
  height: number;
  controller: SharedFieldController | null;
  active?: boolean;
  interactive?: boolean;
};

export function SharedFieldCanvasLayer({
  width,
  height,
  controller,
  active = controller?.active ?? false,
  interactive = controller?.interactive ?? false,
}: SharedFieldCanvasLayerProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const frameRef = useRef<HTMLDivElement | null>(null);
  const draggingNodeIdRef = useRef<string | null>(null);
  const [snapshot, setSnapshot] = useState<SharedFieldSnapshot>({ width, height, entities: [] });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let frameId = 0;
    let alive = true;

    const loop = () => {
      if (!alive) return;
      if (!active || !controller) {
        ctx.clearRect(0, 0, width, height);
      } else {
        const nextSnapshot = controller.getSnapshot(width, height);
        setSnapshot(nextSnapshot);
        drawSharedFieldOverlay(ctx, nextSnapshot);
      }
      frameId = requestAnimationFrame(loop);
    };

    frameId = requestAnimationFrame(loop);

    return () => {
      alive = false;
      cancelAnimationFrame(frameId);
      ctx.clearRect(0, 0, width, height);
    };
  }, [active, controller, height, width]);

  useEffect(() => {
    if (!interactive || !controller) return;
    const handleMove = (event: MouseEvent) => {
      const nodeId = draggingNodeIdRef.current;
      const rect = frameRef.current?.getBoundingClientRect();
      if (!nodeId || !rect) return;
      controller.onNodeDragMove?.(nodeId, event.clientX, event.clientY, rect);
    };
    const handleUp = () => {
      if (!draggingNodeIdRef.current) return;
      draggingNodeIdRef.current = null;
      controller.onNodeDragEnd?.();
    };
    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", handleUp);
    return () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", handleUp);
    };
  }, [controller, interactive]);

  const nodes = useMemo(
    () => snapshot.entities.filter((entity): entity is SharedFieldNode => entity.kind === "ji-node"),
    [snapshot],
  );

  return (
    <div ref={frameRef} className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden="true">
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        className="pointer-events-none absolute inset-0 h-full w-full"
      />
      {active && interactive && controller
        ? nodes.map((node) => {
            const handleSize = Math.max(22, 26 + node.energy * 18);
            return (
              <button
                key={node.id}
                type="button"
                aria-label={`Resident Node ${node.label} verschieben`}
                title={`Resident ${node.label} verschieben`}
                className="pointer-events-auto absolute rounded-full border border-amber-200/20 bg-transparent cursor-crosshair"
                style={{
                  left: node.position.x,
                  top: node.position.y,
                  width: handleSize,
                  height: handleSize,
                  transform: "translate(-50%, -50%)",
                }}
                onMouseDown={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  const rect = frameRef.current?.getBoundingClientRect();
                  if (!rect) return;
                  draggingNodeIdRef.current = node.id;
                  controller.onNodeDragStart?.(node.id, event.clientX, event.clientY, rect);
                }}
              />
            );
          })
        : null}
    </div>
  );
}
