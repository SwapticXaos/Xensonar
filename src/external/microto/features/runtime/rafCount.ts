/**
 * Dev-only RAF loop count for DiagnosticsHUD and lifecycle observability.
 * Hooks that own a requestAnimationFrame loop call register (and unregister on cleanup).
 * Optional label (e.g. room id) enables "which room has active RAF" and dev-only leak detection.
 * Supports vision: "Stable ~60 FPS" and room-level behavior isolated (vision §6).
 */

let rafCount = 0;
const rafLabels = new Set<string>();

export function registerRaf(label?: string): void {
  rafCount += 1;
  if (label != null) rafLabels.add(label);
}

export function unregisterRaf(label?: string): void {
  rafCount = Math.max(0, rafCount - 1);
  if (label != null) rafLabels.delete(label);
}

export function getRafCount(): number {
  return rafCount;
}

/** Dev-only: which labels (e.g. room ids) currently have an active RAF. For DiagnosticsHUD and lifecycle leak check. */
export function getRafRoomLabels(): string[] {
  return Array.from(rafLabels);
}
