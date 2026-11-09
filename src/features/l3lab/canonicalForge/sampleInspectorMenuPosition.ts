export type SampleInspectorMenuPosition = { left: number; top: number };

export type ComputeSampleInspectorMenuPositionArgs = {
  anchorX: number;
  anchorY: number;
  menuWidth: number;
  menuHeight: number;
  viewportWidth: number;
  viewportHeight: number;
  margin?: number;
};

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(value, max));
}

export function computeSampleInspectorMenuPosition({
  anchorX,
  anchorY,
  menuWidth,
  menuHeight,
  viewportWidth,
  viewportHeight,
  margin = 16,
}: ComputeSampleInspectorMenuPositionArgs): SampleInspectorMenuPosition {
  const safeViewportWidth = Math.max(viewportWidth, margin * 2 + 1);
  const safeViewportHeight = Math.max(viewportHeight, margin * 2 + 1);
  const safeWidth = Math.max(1, Math.min(menuWidth, safeViewportWidth - margin * 2));
  const safeHeight = Math.max(1, Math.min(menuHeight, safeViewportHeight - margin * 2));
  const left = clamp(anchorX, margin, Math.max(margin, safeViewportWidth - safeWidth - margin));
  const spaceBelow = safeViewportHeight - anchorY - margin;
  const spaceAbove = anchorY - margin;

  if (safeHeight <= spaceBelow) {
    return { left, top: clamp(anchorY, margin, Math.max(margin, safeViewportHeight - safeHeight - margin)) };
  }

  if (safeHeight <= spaceAbove) {
    return { left, top: clamp(anchorY - safeHeight, margin, Math.max(margin, safeViewportHeight - safeHeight - margin)) };
  }

  return { left, top: clamp(anchorY - safeHeight / 2, margin, Math.max(margin, safeViewportHeight - safeHeight - margin)) };
}
