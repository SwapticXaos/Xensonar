import type { GlobalHarmonicContext } from "../features/resonance/config/stateSlices";
import type { ResonanceScene } from "../features/resonance/config/scenes";
import type { GridTuning, QuantizeSubdivision } from "../shared/tuning/grid";

export type HarmonicWorldIntensity = "light" | "balanced" | "dense";

/** Maps "16"|"32"|"64" to numeric order for comparison; avoids string/number coercion. */
function subdivisionOrder(sub: QuantizeSubdivision): number {
  return sub === "16" ? 16 : sub === "32" ? 32 : 64;
}

/**
 * Simple performance envelope for a world.
 * Can be used by rooms to pick agent counts, pattern density, etc.
 */
export type HarmonicWorldProfile = {
  intensity: HarmonicWorldIntensity;
};

export type HarmonicWorldId = string;

export type HarmonicWorld = {
  id: HarmonicWorldId | null;
  label: string | null;
  description: string | null;
  baseFreq: number;
  gridTuning: GlobalHarmonicContext["gridTuning"];
  quantizeOn: boolean;
  quantizeBpm: number;
  quantizeSubdivision: GlobalHarmonicContext["quantizeSubdivision"];
  /** Human-facing tags describing the world (tuning family, groove feel, curator tags). */
  tags: string[];
  /** Lightweight performance envelope hint. */
  profile: HarmonicWorldProfile;
  /** Optional short mood label from scene (e.g. "Meditative"); for discoverability in Gallery and HUD. */
  mood?: string | null;
};

type BuildWorldArgs = {
  global: GlobalHarmonicContext;
  scene: ResonanceScene | null;
};

function deriveTags(global: GlobalHarmonicContext, scene: ResonanceScene | null): string[] {
  const tags = new Set<string>();

  // Tuning family
  switch (global.gridTuning) {
    case "ji":
      tags.add("Just Intonation");
      break;
    case "bp":
      tags.add("Bohlen–Pierce");
      tags.add("Non-octave");
      break;
    case "12edo":
      tags.add("12-EDO");
      break;
    case "17edo":
      tags.add("17-EDO");
      tags.add("Microtonal");
      break;
    case "19edo":
      tags.add("19-EDO");
      tags.add("Microtonal");
      break;
    case "22edo":
      tags.add("22-EDO");
      tags.add("Microtonal");
      break;
    case "31edo":
      tags.add("31-EDO");
      tags.add("Microtonal");
      break;
    default:
      tags.add("Microtonal");
      break;
  }

  // Groove / texture based on subdivision.
  if (global.quantizeOn) {
    const order = subdivisionOrder(global.quantizeSubdivision);
    if (order <= 16) {
      tags.add("Groove");
    } else if (order <= 32) {
      tags.add("Tight");
    } else {
      tags.add("Wash");
    }
  } else {
    tags.add("Free-time");
  }

  // Scene-derived flavour and curator tags.
  if (scene) {
    const label = scene.label.toLowerCase();
    const description = scene.description.toLowerCase();
    if (label.includes("polyrhythm")) {
      tags.add("Polyrhythm");
    }
    if (label.includes("constellation") || description.includes("starfield")) {
      tags.add("Starscape");
    }
    if (scene.mood) {
      tags.add(scene.mood);
    }
    if (scene.tags?.length) {
      for (const t of scene.tags) {
        if (t.trim()) tags.add(t.trim());
      }
    }
  }

  return Array.from(tags);
}

function deriveProfile(global: GlobalHarmonicContext): HarmonicWorldProfile {
  if (!global.quantizeOn) {
    return { intensity: "light" };
  }

  const order = subdivisionOrder(global.quantizeSubdivision);
  if (order <= 16) {
    return { intensity: "balanced" };
  }
  return { intensity: "dense" };
}

export function worldFromSlices({ global, scene }: BuildWorldArgs): HarmonicWorld {
  return {
    id: scene?.id ?? null,
    label: scene?.label ?? null,
    description: scene?.description ?? null,
    baseFreq: global.baseFreq,
    gridTuning: global.gridTuning,
    quantizeOn: global.quantizeOn,
    quantizeBpm: global.quantizeBpm,
    quantizeSubdivision: global.quantizeSubdivision,
    tags: deriveTags(global, scene),
    profile: deriveProfile(global),
    mood: scene?.mood ?? null,
  };
}

/**
 * Build a short human-readable summary for a HarmonicWorld.
 * Intended for cards and tooltips; avoids duplicating formatting logic across components.
 */
export function describeHarmonicWorld(world: HarmonicWorld): string {
  const parts: string[] = [];

  if (Number.isFinite(world.baseFreq)) {
    parts.push(`${world.baseFreq.toFixed(2)} Hz`);
  }

  if (world.gridTuning) {
    parts.push(world.gridTuning.toUpperCase());
  }

  if (world.quantizeOn) {
    parts.push(`1/${world.quantizeSubdivision} groove`);
  } else {
    parts.push("Free time");
  }

  if (world.profile?.intensity) {
    parts.push(`Intensity: ${world.profile.intensity}`);
  }

  return parts.join(" · ");
}

/** Schema version for export/import; bump when format changes. */
export const HARMONIC_WORLD_EXPORT_VERSION = 1;

/**
 * Serializable snapshot of a HarmonicWorld for export/import and future "world gallery".
 * Keeps harmonic systems first-class: users can save and share named tuning + groove bundles.
 */
export type HarmonicWorldExport = {
  version: number;
  id: string | null;
  label: string | null;
  description: string | null;
  baseFreq: number;
  gridTuning: HarmonicWorld["gridTuning"];
  quantizeOn: boolean;
  quantizeBpm: number;
  quantizeSubdivision: HarmonicWorld["quantizeSubdivision"];
  tags: string[];
  profile: HarmonicWorldProfile;
  /** Optional mood label from scene; preserved on export/import. */
  mood?: string | null;
  /** ISO timestamp when exported (for display/organization). */
  exportedAt: string;
};

/**
 * Build a serializable export from the current HarmonicWorld.
 * Use with serializeHarmonicWorldExport() for clipboard or file download.
 */
export function exportHarmonicWorld(world: HarmonicWorld): HarmonicWorldExport {
  return {
    version: HARMONIC_WORLD_EXPORT_VERSION,
    id: world.id,
    label: world.label,
    description: world.description,
    baseFreq: world.baseFreq,
    gridTuning: world.gridTuning,
    quantizeOn: world.quantizeOn,
    quantizeBpm: world.quantizeBpm,
    quantizeSubdivision: world.quantizeSubdivision,
    tags: [...world.tags],
    profile: { ...world.profile },
    mood: world.mood ?? undefined,
    exportedAt: new Date().toISOString(),
  };
}

/**
 * Build a HarmonicWorld from a stored/imported export.
 * Enables reusing world-based APIs (favorites, matching, display) from export data
 * without requiring the full runtime world (vision §5 discoverability; shell recent/favorites).
 */
export function worldFromExport(data: HarmonicWorldExport): HarmonicWorld {
  return {
    id: data.id ?? null,
    label: data.label ?? null,
    description: data.description ?? null,
    baseFreq: data.baseFreq,
    gridTuning: data.gridTuning,
    quantizeOn: data.quantizeOn,
    quantizeBpm: data.quantizeBpm,
    quantizeSubdivision: data.quantizeSubdivision,
    tags: [...(data.tags ?? [])],
    profile: data.profile ? { intensity: data.profile.intensity } : { intensity: "balanced" },
    mood: data.mood ?? null,
  };
}

/**
 * Serialize an export to JSON (pretty for download, compact for clipboard if preferred).
 */
export function serializeHarmonicWorldExport(
  data: HarmonicWorldExport,
  pretty = true
): string {
  return pretty ? JSON.stringify(data, null, 2) : JSON.stringify(data);
}

const GRID_TUNINGS: readonly GridTuning[] = [
  "12edo",
  "17edo",
  "19edo",
  "22edo",
  "31edo",
  "ji",
  "bp",
];
const QUANTIZE_SUBDIVISIONS: readonly QuantizeSubdivision[] = ["16", "32", "64"];

export type ParseWorldExportResult =
  | { ok: true; data: HarmonicWorldExport }
  | { ok: false; error: string };

/**
 * Parse and validate JSON as HarmonicWorldExport for paste/load world.
 * Validates version, gridTuning, quantizeSubdivision, baseFreq, and required shape.
 */
/**
 * Returns true when the exported world matches the current harmonic world
 * (by id when both set, otherwise by tuning + baseFreq + quantize tuple).
 * Used by shell Gallery/Favorites to highlight the active world.
 */
export function exportMatchesWorld(
  data: HarmonicWorldExport,
  world: HarmonicWorld
): boolean {
  if (data.id != null && data.id !== "" && world.id != null && world.id !== "") {
    return data.id === world.id;
  }
  if (data.gridTuning !== world.gridTuning) return false;
  if (Math.abs(data.baseFreq - world.baseFreq) > 0.01) return false;
  if (data.quantizeOn !== world.quantizeOn) return false;
  if (data.quantizeSubdivision !== world.quantizeSubdivision) return false;
  if (Math.abs(data.quantizeBpm - world.quantizeBpm) > 0.5) return false;
  return true;
}

export function parseAndValidateHarmonicWorldExport(json: string): ParseWorldExportResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    return { ok: false, error: "Invalid JSON" };
  }
  if (parsed == null || typeof parsed !== "object") {
    return { ok: false, error: "Not an object" };
  }
  const d = parsed as Record<string, unknown>;
  if (d.version !== HARMONIC_WORLD_EXPORT_VERSION) {
    return { ok: false, error: `Unsupported version (expected ${HARMONIC_WORLD_EXPORT_VERSION})` };
  }
  if (!GRID_TUNINGS.includes(d.gridTuning as GridTuning)) {
    return { ok: false, error: "Invalid gridTuning" };
  }
  if (!QUANTIZE_SUBDIVISIONS.includes(d.quantizeSubdivision as QuantizeSubdivision)) {
    return { ok: false, error: "Invalid quantizeSubdivision" };
  }
  if (!Number.isFinite(d.baseFreq) || (d.baseFreq as number) <= 0) {
    return { ok: false, error: "Invalid baseFreq" };
  }
  if (typeof d.quantizeOn !== "boolean") {
    return { ok: false, error: "Invalid quantizeOn" };
  }
  if (!Number.isFinite(d.quantizeBpm) || (d.quantizeBpm as number) <= 0) {
    return { ok: false, error: "Invalid quantizeBpm" };
  }
  if (!Array.isArray(d.tags)) {
    return { ok: false, error: "Invalid tags" };
  }
  if (d.profile == null || typeof d.profile !== "object") {
    return { ok: false, error: "Invalid profile" };
  }
  const profile = d.profile as Record<string, unknown>;
  const intensity = profile.intensity;
  if (intensity !== "light" && intensity !== "balanced" && intensity !== "dense") {
    return { ok: false, error: "Invalid profile.intensity" };
  }
  const data: HarmonicWorldExport = {
    version: d.version as number,
    id: d.id == null ? null : String(d.id),
    label: d.label == null ? null : String(d.label),
    description: d.description == null ? null : String(d.description),
    baseFreq: Number(d.baseFreq),
    gridTuning: d.gridTuning as HarmonicWorldExport["gridTuning"],
    quantizeOn: Boolean(d.quantizeOn),
    quantizeBpm: Number(d.quantizeBpm),
    quantizeSubdivision: d.quantizeSubdivision as HarmonicWorldExport["quantizeSubdivision"],
    tags: (d.tags as unknown[]).map((t) => String(t)),
    profile: { intensity: intensity as HarmonicWorldProfile["intensity"] },
    mood: d.mood != null && d.mood !== "" ? String(d.mood) : undefined,
    exportedAt: typeof d.exportedAt === "string" ? d.exportedAt : new Date().toISOString(),
  };
  return { ok: true, data };
}

