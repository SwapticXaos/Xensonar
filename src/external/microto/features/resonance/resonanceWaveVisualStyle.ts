import type { DirectedPulse, NexusRipple } from "../runtime/types";
import type { ResonanceWaveTelemetry } from "./resonanceWaveTelemetry";

type Rgb = { r: number; g: number; b: number };

export type ResonanceStrokeVisualStyle = {
  strokeStyle: string;
  glowStrokeStyle: string;
  highlightStrokeStyle: string | null;
  lineWidth: number;
  glowLineWidth: number;
  lineDash: number[];
  lineCap: "round" | "square" | "butt";
};

export type ResonanceCursorVisualStyle = {
  innerColor: string;
  outerColor: string;
  auraRadius: number;
  dotColor: string;
  dotRadius: number;
};

export type ResonanceAgentVisualStyle = {
  haloFillStyle: string;
  haloRadius: number;
  dotFillStyle: string;
  ringStrokeStyle: string | null;
  ringRadius: number;
  ringWidth: number;
  labelFillStyle: string;
};

export type ResonanceImpactMarkerStyle = {
  glowFillStyle: string;
  fillStyle: string;
  markerRadius: number;
  glowRadius: number;
  angleStepRadians: number;
};

export type ResonanceRippleFlashStyle = {
  strokeStyle: string;
  lineWidth: number;
  radiusOffset: number;
};

export type ResonanceSectorFlashStyle = {
  frontStrokeStyle: string;
  frontLineWidth: number;
  frontRadiusOffset: number;
  rayStrokeStyle: string;
  rayWidth: number;
  rayOuterOffset: number;
};

export type ResonanceSectorGlyphStyle = {
  glowStrokeStyle: string;
  strokeStyle: string;
  lineWidth: number;
  glowWidth: number;
  glyphLength: number;
  glyphSpread: number;
  glyphInset: number;
  glyphCount: number;
  glyphKind: "chevrons" | "crown" | "spear";
};

export type ResonanceSectorTrailShardStyle = {
  glowStrokeStyle: string;
  strokeStyle: string;
  lineWidth: number;
  glowWidth: number;
  shardLength: number;
  shardSpread: number;
  shardInset: number;
  shardDrift: number;
  shardCount: number;
  shardKind: "stagger" | "fan" | "tail";
};

const WAVEFORM_PALETTES: Record<
  ResonanceWaveTelemetry["waveStartWaveform"],
  {
    core: Rgb;
    glow: Rgb;
    accent: Rgb;
    dash: number[];
    lineCap: ResonanceStrokeVisualStyle["lineCap"];
  }
> = {
  sine: {
    core: { r: 96, g: 165, b: 250 },
    glow: { r: 125, g: 211, b: 252 },
    accent: { r: 191, g: 219, b: 254 },
    dash: [],
    lineCap: "round",
  },
  square: {
    core: { r: 250, g: 204, b: 21 },
    glow: { r: 251, g: 191, b: 36 },
    accent: { r: 253, g: 224, b: 71 },
    dash: [12, 8],
    lineCap: "square",
  },
  sawtooth: {
    core: { r: 248, g: 113, b: 113 },
    glow: { r: 251, g: 146, b: 60 },
    accent: { r: 252, g: 165, b: 165 },
    dash: [5, 7],
    lineCap: "butt",
  },
};

const DIRECTION_TINTS: Record<DirectedPulse["direction"], Rgb> = {
  right: { r: 12, g: 24, b: 34 },
  up: { r: 18, g: 34, b: 8 },
  left: { r: 32, g: 6, b: 18 },
  down: { r: 34, g: 16, b: 4 },
};

function clampColor(value: number): number {
  return Math.max(0, Math.min(255, Math.round(value)));
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function tint(base: Rgb, offset: Partial<Rgb>, amount: number): Rgb {
  return {
    r: clampColor(base.r + (offset.r ?? 0) * amount),
    g: clampColor(base.g + (offset.g ?? 0) * amount),
    b: clampColor(base.b + (offset.b ?? 0) * amount),
  };
}

function mixRgb(a: Rgb, b: Rgb, amount: number): Rgb {
  const t = clamp01(amount);
  return {
    r: clampColor(a.r + (b.r - a.r) * t),
    g: clampColor(a.g + (b.g - a.g) * t),
    b: clampColor(a.b + (b.b - a.b) * t),
  };
}

function rgba(rgb: Rgb, alpha: number): string {
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
}

function getGoldAccent(amount: number): Rgb {
  return mixRgb(
    { r: 245, g: 158, b: 11 },
    { r: 253, g: 224, b: 71 },
    amount,
  );
}

export function createResonanceRippleVisualStyle(
  telemetry: ResonanceWaveTelemetry,
  ripple: NexusRipple,
): ResonanceStrokeVisualStyle {
  const palette = WAVEFORM_PALETTES[telemetry.waveStartWaveform];
  const drive = clamp01(telemetry.driveLevel);
  const directionTint = ripple.direction ? DIRECTION_TINTS[ripple.direction] : { r: 0, g: 0, b: 0 };
  const core = tint(palette.core, directionTint, 0.45);
  const glow = tint(palette.glow, directionTint, 0.35);
  const highlight = telemetry.octaveBoostActive ? getGoldAccent(0.45 + drive * 0.35) : null;

  return {
    strokeStyle: rgba(core, 0.2 + clamp01(ripple.life) * 0.68),
    glowStrokeStyle: rgba(glow, 0.14 + clamp01(ripple.life) * 0.28 + drive * 0.14),
    highlightStrokeStyle: highlight ? rgba(highlight, 0.2 + drive * 0.2) : null,
    lineWidth: 1.8 + drive * 1.8 + (telemetry.octaveBoostActive ? 0.35 : 0),
    glowLineWidth: 5 + drive * 5 + (telemetry.octaveBoostActive ? 1.4 : 0),
    lineDash:
      palette.dash.length === 0
        ? []
        : palette.dash.map((segment, index) => segment - (index % 2 === 0 ? drive * 2 : drive)),
    lineCap: palette.lineCap,
  };
}

export function createResonanceSectorPulseVisualStyle(
  telemetry: ResonanceWaveTelemetry,
  pulse: DirectedPulse,
): ResonanceStrokeVisualStyle {
  const palette = WAVEFORM_PALETTES[telemetry.waveStartWaveform];
  const drive = clamp01(telemetry.driveLevel);
  const persistentBoost = pulse.persistent ? 1 : 0;
  const directionTint = DIRECTION_TINTS[pulse.direction];
  const core = tint(palette.core, directionTint, 0.65 + persistentBoost * 0.18);
  const glow = tint(palette.glow, directionTint, 0.6 + persistentBoost * 0.22);
  const highlight = telemetry.octaveBoostActive ? getGoldAccent(0.55 + persistentBoost * 0.2) : null;
  const baseDash =
    palette.dash.length === 0
      ? pulse.persistent
        ? [18, 10]
        : []
      : palette.dash.map((segment, index) =>
          segment + (index % 2 === 0 ? persistentBoost * 3 - drive : persistentBoost * 2),
        );

  return {
    strokeStyle: rgba(core, pulse.persistent ? 0.86 : 0.28 + clamp01(pulse.life) * 0.62),
    glowStrokeStyle: rgba(
      glow,
      0.18 + clamp01(pulse.life) * 0.24 + drive * 0.18 + persistentBoost * 0.12,
    ),
    highlightStrokeStyle: highlight
      ? rgba(highlight, 0.28 + drive * 0.16 + persistentBoost * 0.12)
      : null,
    lineWidth: 2.1 + drive * 2.4 + persistentBoost * 1.4 + (telemetry.octaveBoostActive ? 0.5 : 0),
    glowLineWidth: 7 + drive * 6 + persistentBoost * 2.8 + (telemetry.octaveBoostActive ? 1.8 : 0),
    lineDash: baseDash,
    lineCap: palette.lineCap,
  };
}

export function createResonanceCursorVisualStyle(
  telemetry: ResonanceWaveTelemetry,
): ResonanceCursorVisualStyle {
  const palette = WAVEFORM_PALETTES[telemetry.waveStartWaveform];
  const drive = clamp01(telemetry.driveLevel);
  const inner = telemetry.octaveBoostActive
    ? mixRgb(palette.accent, getGoldAccent(0.85), 0.42)
    : palette.accent;
  const outer = telemetry.octaveBoostActive
    ? mixRgb(palette.glow, getGoldAccent(0.65), 0.35)
    : palette.glow;

  return {
    innerColor: rgba(inner, 0.12 + drive * 0.12 + (telemetry.octaveBoostActive ? 0.08 : 0)),
    outerColor: rgba(outer, 0),
    auraRadius: 120 + drive * 28 + (telemetry.octaveBoostActive ? 18 : 0),
    dotColor: rgba(inner, 0.9),
    dotRadius: 4 + drive * 1.8 + (telemetry.octaveBoostActive ? 0.75 : 0),
  };
}

export function createResonanceAgentVisualStyle(
  telemetry: ResonanceWaveTelemetry,
  hitGlow: number,
): ResonanceAgentVisualStyle {
  const palette = WAVEFORM_PALETTES[telemetry.waveStartWaveform];
  const drive = clamp01(telemetry.driveLevel);
  const hit = clamp01(hitGlow);
  const dot = telemetry.octaveBoostActive
    ? mixRgb(palette.accent, getGoldAccent(0.8), 0.35 + hit * 0.25)
    : palette.accent;
  const halo = telemetry.octaveBoostActive
    ? mixRgb(palette.glow, getGoldAccent(0.75), 0.3 + hit * 0.25)
    : palette.glow;
  const ring = telemetry.octaveBoostActive
    ? getGoldAccent(0.7 + hit * 0.2)
    : mixRgb(palette.core, palette.accent, 0.6 + hit * 0.2);

  return {
    haloFillStyle: rgba(halo, 0.24 + hit * 0.32 + drive * 0.08),
    haloRadius: 4.8 + hit * 4.4 + drive * 1.2,
    dotFillStyle: rgba(dot, 0.72 + hit * 0.24),
    ringStrokeStyle: hit > 0.02 ? rgba(ring, 0.34 + hit * 0.42) : null,
    ringRadius: 7 + hit * 5.6 + drive * 1.1,
    ringWidth: 1.1 + hit * 1.6 + drive * 0.35,
    labelFillStyle: rgba(dot, 0.44 + hit * 0.5),
  };
}

export function createResonanceImpactMarkerStyle(
  telemetry: ResonanceWaveTelemetry,
  count: number,
  persistent = false,
): ResonanceImpactMarkerStyle {
  const palette = WAVEFORM_PALETTES[telemetry.waveStartWaveform];
  const drive = clamp01(telemetry.driveLevel);
  const hitDensity = clamp01(count / 3);
  const marker = telemetry.octaveBoostActive
    ? mixRgb(palette.accent, getGoldAccent(0.82), 0.35 + hitDensity * 0.25)
    : mixRgb(palette.accent, palette.glow, 0.4 + hitDensity * 0.25);
  const glow = telemetry.octaveBoostActive
    ? mixRgb(palette.glow, getGoldAccent(0.7), 0.28 + hitDensity * 0.22)
    : palette.glow;

  return {
    glowFillStyle: rgba(glow, 0.2 + hitDensity * 0.2 + drive * 0.12 + (persistent ? 0.08 : 0)),
    fillStyle: rgba(marker, 0.52 + hitDensity * 0.24),
    markerRadius: 3.2 + drive * 1.4 + hitDensity * 1.4 + (persistent ? 0.75 : 0),
    glowRadius: 7 + drive * 2.8 + hitDensity * 2.2 + (persistent ? 1.4 : 0),
    angleStepRadians: 0.18 + hitDensity * 0.05,
  };
}

export function createResonanceRippleFlashStyle(
  telemetry: ResonanceWaveTelemetry,
  freshness: number,
  hitCount: number,
): ResonanceRippleFlashStyle {
  const palette = WAVEFORM_PALETTES[telemetry.waveStartWaveform];
  const fresh = clamp01(freshness);
  const hits = clamp01(hitCount / 3);
  const drive = clamp01(telemetry.driveLevel);
  const flash = telemetry.octaveBoostActive
    ? mixRgb(palette.glow, getGoldAccent(0.76), 0.35 + fresh * 0.3)
    : mixRgb(palette.glow, palette.accent, 0.45 + fresh * 0.25);

  return {
    strokeStyle: rgba(flash, 0.18 + fresh * 0.42 + hits * 0.1 + drive * 0.08),
    lineWidth: 1.2 + fresh * 3 + hits * 1.1 + drive * 0.6,
    radiusOffset: 3 + fresh * 12 + hits * 4,
  };
}

export function createResonanceSectorFlashStyle(
  telemetry: ResonanceWaveTelemetry,
  freshness: number,
  persistent = false,
): ResonanceSectorFlashStyle {
  const palette = WAVEFORM_PALETTES[telemetry.waveStartWaveform];
  const fresh = clamp01(freshness);
  const drive = clamp01(telemetry.driveLevel);
  const persistentBoost = persistent ? 1 : 0;
  const front = telemetry.octaveBoostActive
    ? mixRgb(palette.glow, getGoldAccent(0.82), 0.32 + fresh * 0.28)
    : mixRgb(palette.glow, palette.accent, 0.38 + fresh * 0.24);
  const ray = telemetry.octaveBoostActive
    ? mixRgb(palette.accent, getGoldAccent(0.92), 0.44 + fresh * 0.2)
    : mixRgb(palette.core, palette.accent, 0.62 + fresh * 0.18);

  return {
    frontStrokeStyle: rgba(front, 0.2 + fresh * 0.38 + drive * 0.1 + persistentBoost * 0.08),
    frontLineWidth: 2.2 + fresh * 4 + drive * 0.8 + persistentBoost * 1.2,
    frontRadiusOffset: 6 + fresh * 14 + persistentBoost * 4,
    rayStrokeStyle: rgba(ray, 0.26 + fresh * 0.44 + persistentBoost * 0.08),
    rayWidth: 1.3 + fresh * 2.4 + drive * 0.4 + persistentBoost * 0.7,
    rayOuterOffset: 14 + fresh * 20 + persistentBoost * 8,
  };
}

export function createResonanceSectorGlyphStyle(
  telemetry: ResonanceWaveTelemetry,
  direction: DirectedPulse["direction"],
  freshness: number,
  persistent = false,
): ResonanceSectorGlyphStyle {
  const palette = WAVEFORM_PALETTES[telemetry.waveStartWaveform];
  const fresh = clamp01(freshness);
  const drive = clamp01(telemetry.driveLevel);
  const persistentBoost = persistent ? 1 : 0;
  const directionTint = DIRECTION_TINTS[direction];
  const glow = telemetry.octaveBoostActive
    ? tint(mixRgb(palette.glow, getGoldAccent(0.82), 0.34 + fresh * 0.28), directionTint, 0.42)
    : tint(mixRgb(palette.glow, palette.accent, 0.42 + fresh * 0.22), directionTint, 0.32);
  const stroke = telemetry.octaveBoostActive
    ? tint(mixRgb(palette.accent, getGoldAccent(0.9), 0.38 + fresh * 0.24), directionTint, 0.54)
    : tint(mixRgb(palette.core, palette.accent, 0.62 + fresh * 0.18), directionTint, 0.38);
  const glyphKind =
    direction === "up" ? "crown"
    : direction === "down" ? "spear"
    : "chevrons";

  return {
    glowStrokeStyle: rgba(glow, 0.18 + fresh * 0.36 + drive * 0.08 + persistentBoost * 0.08),
    strokeStyle: rgba(stroke, 0.3 + fresh * 0.46 + persistentBoost * 0.08),
    lineWidth: 1.1 + fresh * 1.8 + drive * 0.35 + persistentBoost * 0.4,
    glowWidth: 3.8 + fresh * 2.8 + drive * 0.8 + persistentBoost * 0.8,
    glyphLength: 10 + fresh * 8 + persistentBoost * 2,
    glyphSpread: 5.5 + fresh * 3.4 + drive * 0.8,
    glyphInset: 10 + fresh * 14 + persistentBoost * 4,
    glyphCount:
      glyphKind === "chevrons"
        ? 2 + persistentBoost
        : glyphKind === "crown"
          ? 3
          : 2,
    glyphKind,
  };
}

export function createResonanceSectorTrailShardStyle(
  telemetry: ResonanceWaveTelemetry,
  direction: DirectedPulse["direction"],
  freshness: number,
  persistent = false,
): ResonanceSectorTrailShardStyle {
  const palette = WAVEFORM_PALETTES[telemetry.waveStartWaveform];
  const fresh = clamp01(freshness);
  const drive = clamp01(telemetry.driveLevel);
  const persistentBoost = persistent ? 1 : 0;
  const directionTint = DIRECTION_TINTS[direction];
  const glow = telemetry.octaveBoostActive
    ? tint(mixRgb(palette.glow, getGoldAccent(0.76), 0.24 + fresh * 0.24), directionTint, 0.34)
    : tint(mixRgb(palette.glow, palette.accent, 0.3 + fresh * 0.18), directionTint, 0.26);
  const stroke = telemetry.octaveBoostActive
    ? tint(mixRgb(palette.accent, getGoldAccent(0.88), 0.28 + fresh * 0.22), directionTint, 0.44)
    : tint(mixRgb(palette.core, palette.accent, 0.56 + fresh * 0.16), directionTint, 0.3);
  const shardKind =
    direction === "up" ? "fan"
    : direction === "down" ? "tail"
    : "stagger";

  return {
    glowStrokeStyle: rgba(glow, 0.14 + fresh * 0.24 + drive * 0.08 + persistentBoost * 0.08),
    strokeStyle: rgba(stroke, 0.2 + fresh * 0.34 + persistentBoost * 0.1),
    lineWidth: 0.9 + fresh * 1.25 + drive * 0.25 + persistentBoost * 0.28,
    glowWidth: 2.8 + fresh * 2.4 + drive * 0.7 + persistentBoost * 0.9,
    shardLength: 9 + fresh * 8 + persistentBoost * 3,
    shardSpread: 4.8 + fresh * 3 + drive * 0.7,
    shardInset: 6 + fresh * 9 + persistentBoost * 2,
    shardDrift: 5 + fresh * 5 + persistentBoost * 1.4,
    shardCount:
      shardKind === "fan"
        ? 3 + persistentBoost
        : shardKind === "tail"
          ? 2 + persistentBoost
          : 3 + persistentBoost,
    shardKind,
  };
}
