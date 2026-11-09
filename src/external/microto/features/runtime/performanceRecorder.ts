/**
 * In-memory input event log for performance/session capture.
 * Vision: exploratory instrument; future replay or diagnostics.
 * Call logEvent() from input path; supports export/import of a versioned payload.
 * Emit shape from shared/input/inputLogTypes; stored shape adds t.
 */
import type { InputLogEntryEmit } from "../../shared/input/inputLogTypes";
import type { Room } from "../../app/roomRegistry";

/** Stored entry (emit shape + timestamp). Re-export for consumers that read the log. */
export type StoredInputLogEntry = InputLogEntryEmit & { t: number };

/** @deprecated Use StoredInputLogEntry for new code. */
export type InputLogEntry = StoredInputLogEntry;

const MAX_EVENTS = 500;
const buffer: StoredInputLogEntry[] = [];

function append(entry: StoredInputLogEntry): void {
  buffer.push(entry);
  if (buffer.length > MAX_EVENTS) buffer.shift();
}

export function logInputEvent(entry: InputLogEntryEmit): void {
  append({ ...entry, t: performance.now() });
}

export function getInputLog(): readonly StoredInputLogEntry[] {
  return buffer;
}

export function clearInputLog(): void {
  buffer.length = 0;
}

export type PerformanceExportV1 = {
  version: 1;
  createdAt: string;
  maxEvents: number;
  eventCount: number;
  log: readonly StoredInputLogEntry[];
};

type ImportResult =
  | { ok: true; imported: number; dropped: number }
  | { ok: false; error: string };

export function buildPerformanceExportV1(): PerformanceExportV1 {
  const log = getInputLog();
  return {
    version: 1,
    createdAt: new Date().toISOString(),
    maxEvents: MAX_EVENTS,
    eventCount: log.length,
    log,
  };
}

export function exportPerformanceJson(pretty = true): string {
  const payload = buildPerformanceExportV1();
  return JSON.stringify(payload, null, pretty ? 2 : 0);
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value != null && !Array.isArray(value);
}

function isRoom(value: unknown): value is Room {
  return typeof value === "string";
}

function isEventType(value: unknown): value is InputLogEntryEmit["type"] {
  return (
    value === "keydown" ||
    value === "keyup" ||
    value === "pointerdown" ||
    value === "pointermove" ||
    value === "pointerup"
  );
}

function parseStoredLogEntry(value: unknown): StoredInputLogEntry | null {
  if (!isPlainObject(value)) return null;
  const room = value.room;
  const type = value.type;
  const t = value.t;
  if (!isRoom(room) || !isEventType(type) || typeof t !== "number" || !Number.isFinite(t)) return null;

  const entry: StoredInputLogEntry = { room, type, t };
  if (typeof value.key === "string") entry.key = value.key;
  const pointer = value.pointer;
  if (isPlainObject(pointer) && typeof pointer.x === "number" && typeof pointer.y === "number") {
    entry.pointer = { x: pointer.x, y: pointer.y };
  }
  return entry;
}

export function importPerformanceExportV1(payload: unknown): ImportResult {
  if (!isPlainObject(payload)) return { ok: false, error: "Not an object" };
  if (payload.version !== 1) return { ok: false, error: "Unsupported version" };
  if (!Array.isArray(payload.log)) return { ok: false, error: "Missing log array" };

  const parsed: StoredInputLogEntry[] = [];
  for (const item of payload.log) {
    const entry = parseStoredLogEntry(item);
    if (entry) parsed.push(entry);
  }
  if (parsed.length === 0 && payload.log.length !== 0) return { ok: false, error: "No valid log entries" };

  const keep = parsed.slice(-MAX_EVENTS);
  const dropped = parsed.length - keep.length;

  buffer.length = 0;
  buffer.push(...keep);

  return { ok: true, imported: keep.length, dropped };
}

export function importPerformanceJson(json: string): ImportResult {
  try {
    const parsed = JSON.parse(json) as unknown;
    return importPerformanceExportV1(parsed);
  } catch {
    return { ok: false, error: "Invalid JSON" };
  }
}

export type PerformanceRecorder = {
  logEvent: (entry: InputLogEntryEmit) => void;
  getLog: () => readonly StoredInputLogEntry[];
  clear: () => void;
  exportJson: (pretty?: boolean) => string;
  importJson: (json: string) => ImportResult;
};

export function getPerformanceRecorder(): PerformanceRecorder {
  return {
    logEvent: logInputEvent,
    getLog: getInputLog,
    clear: clearInputLog,
    exportJson: exportPerformanceJson,
    importJson: importPerformanceJson,
  };
}
