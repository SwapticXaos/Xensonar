import { useEffect, useRef, useState, type PointerEvent } from "react";
import { SPECTRAL_HEIGHT, SPECTRAL_WIDTH } from "../../state/store";
import { SpectralData } from "../../audio/SpectralData";

export type GestureStripSelection = {
  start: number;
  end: number;
};

export type GestureStripSnapshot = {
  projectId: string;
  spectralSnapshot: Float32Array;
};

export function clampRatio(value: number) {
  return Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));
}

export function normalizeGestureSelection(selection: GestureStripSelection): GestureStripSelection {
  const start = clampRatio(Math.min(selection.start, selection.end));
  const end = clampRatio(Math.max(selection.start, selection.end));
  return { start: Math.min(0.995, start), end: Math.max(start + 0.005, end) };
}

export function drawGestureStripCanvas(canvas: HTMLCanvasElement, spectralSnapshot: Float32Array) {
  const width = 640;
  const height = 112;
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const image = ctx.createImageData(width, height);
  for (let y = 0; y < height; y += 1) {
    const srcY = Math.max(0, Math.min(SPECTRAL_HEIGHT - 1, Math.floor((y / Math.max(1, height - 1)) * (SPECTRAL_HEIGHT - 1))));
    for (let x = 0; x < width; x += 1) {
      const srcX = Math.max(0, Math.min(SPECTRAL_WIDTH - 1, Math.floor((x / Math.max(1, width - 1)) * (SPECTRAL_WIDTH - 1))));
      const value = Math.max(0, Math.min(1, Number(spectralSnapshot[srcY * SPECTRAL_WIDTH + srcX] ?? 0)));
      const lifted = Math.sqrt(value);
      const offset = (y * width + x) * 4;
      image.data[offset] = Math.round(18 + lifted * 150);
      image.data[offset + 1] = Math.round(10 + lifted * 62);
      image.data[offset + 2] = Math.round(32 + lifted * 210);
      image.data[offset + 3] = 255;
    }
  }
  ctx.putImageData(image, 0, 0);
}

export function copySpectralSelection(snapshot: GestureStripSnapshot, selection: GestureStripSelection): SpectralData {
  const normalized = normalizeGestureSelection(selection);
  const out = new SpectralData(SPECTRAL_WIDTH, SPECTRAL_HEIGHT);
  const startX = Math.floor(normalized.start * SPECTRAL_WIDTH);
  const span = Math.max(1, Math.floor((normalized.end - normalized.start) * SPECTRAL_WIDTH));
  for (let x = 0; x < SPECTRAL_WIDTH; x += 1) {
    const srcX = Math.max(0, Math.min(SPECTRAL_WIDTH - 1, startX + Math.floor((x / Math.max(1, SPECTRAL_WIDTH - 1)) * span)));
    for (let y = 0; y < SPECTRAL_HEIGHT; y += 1) {
      out.data[y * SPECTRAL_WIDTH + x] = snapshot.spectralSnapshot[y * SPECTRAL_WIDTH + srcX] ?? 0;
    }
  }
  return out;
}

export function CarrierGestureStrip(props: {
  snapshot: GestureStripSnapshot | null;
  selection: GestureStripSelection;
  playheadRatio: number | null;
  onSelectionChange: (selection: GestureStripSelection) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [dragAnchor, setDragAnchor] = useState<number | null>(null);
  const selection = normalizeGestureSelection(props.selection);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !props.snapshot) return;
    drawGestureStripCanvas(canvas, props.snapshot.spectralSnapshot);
  }, [props.snapshot]);

  useEffect(() => {
    if (dragAnchor == null) return undefined;
    const stop = () => setDragAnchor(null);
    window.addEventListener("pointerup", stop);
    window.addEventListener("pointercancel", stop);
    return () => {
      window.removeEventListener("pointerup", stop);
      window.removeEventListener("pointercancel", stop);
    };
  }, [dragAnchor]);

  const ratioFromPointer = (event: PointerEvent<HTMLElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    return clampRatio((event.clientX - rect.left) / Math.max(1, rect.width));
  };

  const update = (event: PointerEvent<HTMLElement>, anchor = dragAnchor) => {
    const ratio = ratioFromPointer(event);
    props.onSelectionChange(normalizeGestureSelection(anchor == null
      ? { start: ratio - 0.08, end: ratio + 0.08 }
      : { start: Math.min(anchor, ratio), end: Math.max(anchor, ratio) }));
  };

  return (
    <div
      className="relative mt-2 h-24 cursor-crosshair overflow-hidden rounded border border-violet-900/60 bg-neutral-950"
      data-xensonar-carrier-integral-gesture-navigator="true"
      onPointerDown={(event) => {
        event.currentTarget.setPointerCapture?.(event.pointerId);
        const ratio = ratioFromPointer(event);
        setDragAnchor(ratio);
        update(event, ratio);
      }}
      onPointerMove={(event) => {
        if (dragAnchor != null && event.buttons) update(event);
      }}
    >
      {props.snapshot ? (
        <>
          <canvas ref={canvasRef} className="h-full w-full" aria-hidden="true" />
          <div
            className="absolute top-0 h-full border-x border-fuchsia-200/95 bg-fuchsia-500/18 shadow-[0_0_18px_rgba(217,70,239,0.25)]"
            data-xensonar-carrier-integral-gesture-selection="true"
            style={{ left: `${selection.start * 100}%`, width: `${Math.max(0.5, (selection.end - selection.start) * 100)}%` }}
          />
          {props.playheadRatio != null ? (
            <div
              className="absolute top-0 h-full w-px bg-white/90 shadow-[0_0_10px_rgba(255,255,255,0.7)]"
              data-xensonar-carrier-integral-gesture-playhead="true"
              style={{ left: `${clampRatio(props.playheadRatio) * 100}%` }}
            />
          ) : null}
        </>
      ) : (
        <div className="flex h-full items-center justify-center text-[11px] text-neutral-600">keine Gestalt geladen</div>
      )}
    </div>
  );
}
