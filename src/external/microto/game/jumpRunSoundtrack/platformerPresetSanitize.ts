/**
 * Platformer composition preset sanitization (pure).
 * Validates and normalizes preset data from JSON/localStorage.
 * Extracted from platformerPresetPersistence for LOC discipline and testability.
 */

import type {
  MovementEvent,
  MovementEventKind,
  PlatformerArrangementForm,
  PlatformerArrangementMode,
  PlatformerTuningMode,
} from "./platformerArrangement";
import { MAX_MOVEMENT_EVENTS } from "./platformerArrangementTypes";
import {
  sanitizePlatformerSectionBias,
  type PlatformerSectionBias,
} from "./platformerSectionBias";
import { clamp } from "../../shared/tuning/grid";

export const MAX_PHRASE_LENGTH = 24;
/** Re-export for backward compat; single source in platformerArrangementTypes. */
export const MAX_EVENTS = MAX_MOVEMENT_EVENTS;

const EVENT_KINDS: MovementEventKind[] = [
  "motion",
  "step",
  "jump",
  "land",
  "coin",
  "npc_orb",
  "mode_shift",
  "puzzle_step",
  "gate_unlock",
  "checkpoint",
  "fall",
  "turn",
  "sync_gate",
  "phase_gate",
  "tuning_crystal",
  "chord_fork",
  "silence_field",
];

const isObject = (value: unknown): value is Record<string, unknown> =>
  value != null && typeof value === "object" && !Array.isArray(value);

export const sanitizeFinite = (value: unknown, fallback: number, min: number, max: number) => {
  const num = typeof value === "number" ? value : fallback;
  return clamp(Number.isFinite(num) ? num : fallback, min, max);
};

export const sanitizeName = (value: unknown, fallback = "Session Loop") => {
  const text = typeof value === "string" ? value.trim() : "";
  if (!text) return fallback;
  return text.slice(0, 40);
};

export const sanitizeId = (value: unknown): string | null => {
  if (typeof value !== "string") return null;
  const id = value.trim().slice(0, 64);
  return id.length > 0 ? id : null;
};

export const sanitizePhrase = (value: unknown): number[] => {
  if (!Array.isArray(value)) return [];
  const out: number[] = [];
  for (const item of value) {
    if (typeof item !== "number" || !Number.isFinite(item)) continue;
    out.push(Math.round(clamp(item, -36, 48)));
    if (out.length >= MAX_PHRASE_LENGTH) break;
  }
  return out;
};

export const sanitizeMovementEvents = (value: unknown): MovementEvent[] => {
  if (!Array.isArray(value)) return [];
  const out: MovementEvent[] = [];
  for (const item of value) {
    if (!isObject(item)) continue;
    const kind = typeof item.kind === "string" ? (item.kind as MovementEventKind) : "motion";
    if (!EVENT_KINDS.includes(kind)) continue;
    out.push({
      kind,
      semi: Math.round(sanitizeFinite(item.semi, 0, -36, 48)),
      energy: sanitizeFinite(item.energy, 0.5, 0.05, 1),
      t: sanitizeFinite(item.t, 0, 0, 99999),
      lane: Math.round(sanitizeFinite(item.lane, 0, -64, 64)),
      airborne: !!item.airborne,
      ordinal: Math.round(sanitizeFinite(item.ordinal, out.length, 0, MAX_EVENTS * 4)),
      ...(typeof item.detail === "number" && Number.isFinite(item.detail)
        ? { detail: sanitizeFinite(item.detail, 0, -8, 8) }
        : {}),
    });
    if (out.length >= MAX_EVENTS) break;
  }
  return out;
};

export const sanitizeTuningMode = (value: unknown): PlatformerTuningMode =>
  value === "19edo" || value === "22edo" || value === "ji" || value === "bp" ? value : "12edo";

export const sanitizeArrangementMode = (value: unknown): PlatformerArrangementMode => {
  if (value === "cinematic" || value === "percussive" || value === "glitch") return value;
  return "balanced";
};

export const sanitizeFormMode = (value: unknown): PlatformerArrangementForm => {
  if (value === "aaba" || value === "abab" || value === "abca" || value === "abcb" || value === "abac") {
    return value;
  }
  return "auto";
};

export type PlatformerCompositionPreset = {
  version: 1;
  savedAt: number;
  phrase: number[];
  movementEvents: MovementEvent[];
  tuningMode: PlatformerTuningMode;
  arrangementMode: PlatformerArrangementMode;
  formMode: PlatformerArrangementForm;
  sectionBias: PlatformerSectionBias;
  evolutionDepth: number;
  tempoFollow: number;
  bpm: number;
  masterVolume: number;
  composerOn: boolean;
};

export type PlatformerCompositionPresetItem = {
  id: string;
  name: string;
  savedAt: number;
  preset: PlatformerCompositionPreset;
};

export const sanitizePreset = (value: unknown): PlatformerCompositionPreset | null => {
  if (!isObject(value)) return null;
  const phrase = sanitizePhrase(value.phrase);
  const movementEvents = sanitizeMovementEvents(value.movementEvents);
  if (phrase.length === 0 && movementEvents.length === 0) return null;
  return {
    version: 1,
    savedAt: sanitizeFinite(value.savedAt, Date.now(), 0, Number.MAX_SAFE_INTEGER),
    phrase,
    movementEvents,
    tuningMode: sanitizeTuningMode(value.tuningMode),
    arrangementMode: sanitizeArrangementMode(value.arrangementMode),
    formMode: sanitizeFormMode(value.formMode),
    sectionBias: sanitizePlatformerSectionBias(value.sectionBias),
    evolutionDepth: sanitizeFinite(value.evolutionDepth, 0.68, 0, 1),
    tempoFollow: sanitizeFinite(value.tempoFollow, 0.62, 0, 1),
    bpm: Math.round(sanitizeFinite(value.bpm, 110, 50, 200)),
    masterVolume: sanitizeFinite(value.masterVolume, 0.58, 0, 1),
    composerOn: typeof value.composerOn === "boolean" ? value.composerOn : true,
  };
};

export const sanitizePresetItem = (value: unknown): PlatformerCompositionPresetItem | null => {
  if (!isObject(value)) return null;
  const id = sanitizeId(value.id);
  if (!id) return null;
  const preset = sanitizePreset(value.preset);
  if (!preset) return null;
  return {
    id,
    name: sanitizeName(value.name, "Session Loop"),
    savedAt: sanitizeFinite(value.savedAt, preset.savedAt, 0, Number.MAX_SAFE_INTEGER),
    preset,
  };
};
