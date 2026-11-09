/**
 * Canonical input log entry types. Single source of truth for what useRoomInput emits
 * and what performanceRecorder accepts (emit shape) or stores (emit + t).
 * Aligns with vision: input/router by room; exploratory instrument session capture.
 */
import type { Room } from "../../app/roomRegistry";

export type InputLogEventType =
  | "keydown"
  | "keyup"
  | "pointerdown"
  | "pointermove"
  | "pointerup";

/** Shape emitted by useRoomInput and accepted by performanceRecorder.logEvent. */
export type InputLogEntryEmit = {
  room: Room;
  type: InputLogEventType;
  key?: string;
  pointer?: { x: number; y: number };
};
