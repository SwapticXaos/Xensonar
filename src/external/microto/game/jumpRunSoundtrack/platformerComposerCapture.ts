/**
 * Platformer composer capture — movement → event recording.
 * Extracted from platformerAudio for single-responsibility and LOC discipline.
 * Pure capture logic: turn player movement into MovementEvents for arrangement.
 */
import { clamp } from "../../shared/tuning/grid";
import { SCALE, WORLD_W, VIEW_H, MAX_SPEED } from "./platformerState";
import type {
  CompletionArrangement,
  CompletionIntroPattern,
  CompletionPattern,
  CompletionTheme,
  MovementEvent,
  MovementEventKind,
} from "./platformerArrangementTypes";
import { MAX_MOVEMENT_EVENTS } from "./platformerArrangementTypes";

export type PlatformerCaptureState = {
  phrase: number[];
  completionPhrase: number[];
  nextCompletionAt: number;
  completionStep: number;
  completionLoopArmed: boolean;
  completionTheme: CompletionTheme | null;
  completionIntroPattern: CompletionIntroPattern | null;
  nextCompletionIntroAt: number;
  completionIntroStep: number;
  completionIntroComplete: boolean;
  completionCyclePattern: CompletionPattern | null;
  completionCycleKey: string;
  nextMotionSampleAt: number;
  motionSampleIndex: number;
  lastMovementTime: number;
  lastMotionDir: -1 | 0 | 1;
  eventOrdinal: number;
  movementEvents: MovementEvent[];
  completionPattern: CompletionPattern | null;
  completionArrangement: CompletionArrangement | null;
};

export function resetCompositionCapture(m: PlatformerCaptureState): void {
  m.completionPhrase = [];
  m.nextCompletionAt = 0;
  m.completionStep = 0;
  m.completionLoopArmed = false;
  m.completionTheme = null;
  m.completionIntroPattern = null;
  m.nextCompletionIntroAt = 0;
  m.completionIntroStep = 0;
  m.completionIntroComplete = false;
  m.nextMotionSampleAt = 0;
  m.motionSampleIndex = 0;
  m.lastMovementTime = 0;
  m.lastMotionDir = 0;
  m.eventOrdinal = 0;
  m.movementEvents = [];
  m.completionPattern = null;
  m.completionArrangement = null;
  m.completionCyclePattern = null;
  m.completionCycleKey = "";
}

export function pushMovementEvent(
  m: PlatformerCaptureState,
  event: MovementEvent,
  maxEvents: number = MAX_MOVEMENT_EVENTS,
): void {
  const events = m.movementEvents;
  const ordinal =
    typeof event.ordinal === "number" && Number.isFinite(event.ordinal)
      ? Math.max(0, Math.round(event.ordinal))
      : m.eventOrdinal;
  events.push({
    ...event,
    ordinal,
  });
  m.eventOrdinal = Math.max(m.eventOrdinal, ordinal + 1);
  if (events.length > maxEvents) {
    events.splice(0, events.length - maxEvents);
  }
}

export function recordMovementEvent(
  m: PlatformerCaptureState,
  kind: MovementEventKind,
  semi: number,
  energy: number,
  lane = 0,
  airborne = false,
  detail?: number,
): void {
  pushMovementEvent(m, {
    kind,
    semi: Math.round(clamp(semi, -18, 24)),
    energy: clamp(energy, 0.05, 1),
    t: m.lastMovementTime,
    lane,
    airborne,
    ...(typeof detail === "number" && Number.isFinite(detail)
      ? { detail: Number(detail.toFixed(3)) }
      : {}),
  });
}

export function processMovementFrame(
  m: PlatformerCaptureState,
  x: number,
  y: number,
  vx: number,
  vy: number,
  onGround: boolean,
  simTime: number,
  pushPhrase: (semi: number) => void,
): void {
  m.lastMovementTime = simTime;

  const dir: -1 | 0 | 1 = vx > 40 ? 1 : vx < -40 ? -1 : 0;
  if (dir !== 0 && m.lastMotionDir !== 0 && dir !== m.lastMotionDir) {
    const laneNow = Math.floor((x / WORLD_W) * SCALE.length) % SCALE.length;
    recordMovementEvent(m, "turn", SCALE[laneNow] + (onGround ? 2 : 7), clamp(Math.abs(vx) / MAX_SPEED, 0.35, 1), laneNow, !onGround);
  }
  if (dir !== 0) {
    m.lastMotionDir = dir;
  }

  if (simTime < m.nextMotionSampleAt) return;
  m.nextMotionSampleAt = simTime + 0.11;

  const lane = Math.floor((x / WORLD_W) * SCALE.length) % SCALE.length;
  const speedNorm = clamp(Math.abs(vx) / MAX_SPEED, 0, 1);
  const altitudeNorm = clamp(1 - y / VIEW_H, 0, 1);
  let semi = SCALE[lane];
  semi += Math.round((altitudeNorm - 0.5) * 6);
  if (!onGround) semi += 5;
  if (vy < -220) semi += 2;
  if (vy > 260) semi -= 2;
  semi = Math.round(clamp(semi, -12, 22));
  const energy = clamp(speedNorm * 0.75 + altitudeNorm * 0.4 + (onGround ? 0 : 0.2), 0.15, 1);

  pushMovementEvent(m, {
    kind: "motion",
    semi,
    energy,
    t: simTime,
    lane,
    airborne: !onGround,
  });
  if (speedNorm > 0.22 && m.motionSampleIndex % 2 === 0) {
    pushPhrase(semi);
  }
  m.motionSampleIndex += 1;
}
