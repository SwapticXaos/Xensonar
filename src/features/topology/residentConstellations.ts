import { isRecord, type WorkspacePackageImportMode } from "../../core/systemMemory/packageCore";
import type { SemanticNode } from "../xensonar/domain/runtimeTypes";
import type { InstallationFieldConfig } from "./installationFieldConfig";

export const RESIDENT_CONSTELLATIONS_STORAGE_KEY = "xensonar.resident.constellations.v1";

export type SavedResidentConstellation = {
  id: string;
  name: string;
  createdAt: number;
  config: Pick<InstallationFieldConfig, "residentsEnabled" | "residentSystem" | "residentMode" | "residentSound" | "residentVolume" | "residentElasticPitch">;
  nodes: Array<Pick<SemanticNode, "x" | "y" | "freq" | "energy" | "label" | "ratio" | "tuningCents" | "residentId" | "residentSystem" | "residentMode" | "residentStepIndex" | "residentMuted" | "isCustomResident" | "customResidentSound" | "customResidentElasticPitch">>;
};

export type ResidentConstellationArchivePayload = {
  schemaVersion: 1;
  entries: SavedResidentConstellation[];
};

const MAX_RESIDENT_CONSTELLATIONS = 12;

const cloneNodes = (nodes: SemanticNode[]) => nodes.map((node) => ({
  x: node.x,
  y: node.y,
  freq: node.freq,
  energy: 0,
  label: node.label,
  ratio: node.ratio,
  tuningCents: node.tuningCents ?? 0,
  residentId: node.residentId,
  residentSystem: node.residentSystem,
  residentMode: node.residentMode,
  residentStepIndex: node.residentStepIndex,
  residentMuted: !!node.residentMuted,
  isCustomResident: !!node.isCustomResident,
  customResidentSound: node.customResidentSound,
  customResidentElasticPitch: !!node.customResidentElasticPitch,
}));

function finiteNumber(value: unknown, fallback = 0) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function optionalString(value: unknown) {
  return typeof value === "string" && value.trim() ? value : undefined;
}

function sanitizeSavedResidentConstellation(raw: unknown): SavedResidentConstellation | null {
  if (!isRecord(raw)) return null;
  const id = optionalString(raw.id) ?? `resident-constellation-import-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  const name = optionalString(raw.name) ?? "Importierte Konstellation";
  const config = isRecord(raw.config) ? raw.config : {};
  const nodes = Array.isArray(raw.nodes)
    ? raw.nodes
        .filter(isRecord)
        .map((node) => ({
          x: finiteNumber(node.x, 0.5),
          y: finiteNumber(node.y, 0.5),
          freq: finiteNumber(node.freq, 220),
          energy: 0,
          label: optionalString(node.label) ?? "Resident",
          ratio: finiteNumber(node.ratio, 1),
          tuningCents: finiteNumber(node.tuningCents, 0),
          residentId: optionalString(node.residentId),
          residentSystem: optionalString(node.residentSystem) as SavedResidentConstellation["nodes"][number]["residentSystem"],
          residentMode: optionalString(node.residentMode) as SavedResidentConstellation["nodes"][number]["residentMode"],
          residentStepIndex: Number.isFinite(Number(node.residentStepIndex)) ? Math.trunc(Number(node.residentStepIndex)) : undefined,
          residentMuted: node.residentMuted === true,
          isCustomResident: node.isCustomResident === true,
          customResidentSound: optionalString(node.customResidentSound) as SavedResidentConstellation["nodes"][number]["customResidentSound"],
          customResidentElasticPitch: node.customResidentElasticPitch === true,
        }))
    : [];
  return {
    id,
    name,
    createdAt: finiteNumber(raw.createdAt, Date.now()),
    config: {
      residentsEnabled: config.residentsEnabled === true,
      residentSystem: optionalString(config.residentSystem) as SavedResidentConstellation["config"]["residentSystem"] ?? "ji",
      residentMode: optionalString(config.residentMode) as SavedResidentConstellation["config"]["residentMode"] ?? "chromatic",
      residentSound: optionalString(config.residentSound) as SavedResidentConstellation["config"]["residentSound"] ?? "glass_needle",
      residentVolume: finiteNumber(config.residentVolume, 0.5),
      residentElasticPitch: config.residentElasticPitch === true,
    },
    nodes,
  };
}

function normalizeResidentConstellations(raw: unknown): SavedResidentConstellation[] {
  if (!Array.isArray(raw)) return [];
  const out: SavedResidentConstellation[] = [];
  const seen = new Set<string>();
  for (const entry of raw) {
    const normalized = sanitizeSavedResidentConstellation(entry);
    if (!normalized || seen.has(normalized.id)) continue;
    seen.add(normalized.id);
    out.push(normalized);
    if (out.length >= MAX_RESIDENT_CONSTELLATIONS) break;
  }
  return out;
}

function residentConstellationSignature(entry: SavedResidentConstellation) {
  return JSON.stringify({
    name: entry.name.trim().toLocaleLowerCase(),
    config: entry.config,
    nodes: entry.nodes.map((node) => ({
      x: Number(node.x).toFixed(3),
      y: Number(node.y).toFixed(3),
      freq: Number(node.freq).toFixed(3),
      label: node.label,
      ratio: Number(node.ratio).toFixed(5),
      tuningCents: Number(node.tuningCents ?? 0).toFixed(3),
      residentSystem: node.residentSystem,
      residentMode: node.residentMode,
      residentStepIndex: node.residentStepIndex,
      residentMuted: !!node.residentMuted,
      isCustomResident: !!node.isCustomResident,
      customResidentSound: node.customResidentSound,
      customResidentElasticPitch: !!node.customResidentElasticPitch,
    })),
  });
}

export function createResidentConstellationSnapshot(args: { name: string; nodes: SemanticNode[]; config: InstallationFieldConfig }): SavedResidentConstellation {
  const { name, nodes, config } = args;
  return {
    id: `resident-constellation-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    name: name.trim() || `Konstellation ${new Date().toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })}`,
    createdAt: Date.now(),
    config: {
      residentsEnabled: config.residentsEnabled,
      residentSystem: config.residentSystem,
      residentMode: config.residentMode,
      residentSound: config.residentSound,
      residentVolume: config.residentVolume,
      residentElasticPitch: !!config.residentElasticPitch,
    },
    nodes: cloneNodes(nodes),
  };
}

export function restoreResidentConstellationNodes(snapshot: SavedResidentConstellation): SemanticNode[] {
  return snapshot.nodes.map((node) => ({
    x: node.x,
    y: node.y,
    freq: node.freq,
    energy: 0,
    label: node.label,
    ratio: node.ratio,
    tuningCents: node.tuningCents ?? 0,
    residentId: node.residentId,
    residentSystem: node.residentSystem,
    residentMode: node.residentMode,
    residentStepIndex: node.residentStepIndex,
    residentMuted: !!node.residentMuted,
    isCustomResident: !!node.isCustomResident,
    customResidentSound: node.customResidentSound,
    customResidentElasticPitch: !!node.customResidentElasticPitch,
  }));
}

export function loadResidentConstellations(): SavedResidentConstellation[] {
  if (typeof window === "undefined" || typeof localStorage === "undefined") return [];
  try {
    const raw = localStorage.getItem(RESIDENT_CONSTELLATIONS_STORAGE_KEY);
    if (!raw) return [];
    return normalizeResidentConstellations(JSON.parse(raw));
  } catch {
    return [];
  }
}

export function persistResidentConstellations(entries: SavedResidentConstellation[]) {
  if (typeof window === "undefined" || typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(RESIDENT_CONSTELLATIONS_STORAGE_KEY, JSON.stringify(normalizeResidentConstellations(entries)));
  } catch {
    // ignore storage errors
  }
}

export function exportResidentConstellationArchivePayload(): ResidentConstellationArchivePayload {
  return { schemaVersion: 1, entries: loadResidentConstellations() };
}

export function parseResidentConstellationArchivePayload(raw: unknown): ResidentConstellationArchivePayload | null {
  if (!isRecord(raw)) return null;
  return { schemaVersion: 1, entries: normalizeResidentConstellations(raw.entries) };
}

export function applyResidentConstellationArchivePayload(args: {
  payload: ResidentConstellationArchivePayload | null;
  mode: WorkspacePackageImportMode;
}) {
  const payload = parseResidentConstellationArchivePayload(args.payload);
  const result = { present: !!payload, importedCount: 0, skippedCount: 0, replacedCount: 0 };
  if (!payload) return result;

  const incoming = normalizeResidentConstellations(payload.entries);
  const current = args.mode === "replace" ? [] : loadResidentConstellations();
  const byId = new Map(current.map((entry) => [entry.id, entry]));
  const signatures = new Set(current.map(residentConstellationSignature));
  const next = [...current];

  for (const entry of incoming) {
    const existingIndex = next.findIndex((candidate) => candidate.id === entry.id);
    const signature = residentConstellationSignature(entry);
    if (args.mode === "merge" && (existingIndex >= 0 || signatures.has(signature))) {
      result.skippedCount += 1;
      continue;
    }
    if (existingIndex >= 0) {
      next[existingIndex] = entry;
      byId.set(entry.id, entry);
      signatures.add(signature);
      result.replacedCount += 1;
    } else if (!byId.has(entry.id)) {
      next.unshift(entry);
      byId.set(entry.id, entry);
      signatures.add(signature);
      result.importedCount += 1;
    }
  }

  persistResidentConstellations(next.slice(0, MAX_RESIDENT_CONSTELLATIONS));
  return result;
}
