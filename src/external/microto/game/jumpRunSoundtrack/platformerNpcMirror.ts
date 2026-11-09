import { clamp } from "../../shared/tuning/grid";
import { deriveMovementTheme, type MovementEvent, type MovementEventKind } from "./platformerArrangementTheme";

export type PlatformerMirrorFacet =
  | "momentum"
  | "airtime"
  | "repetition"
  | "recovery"
  | "curiosity"
  | "precision";

export type PlatformerLoomDraftId =
  | "open"
  | "weave"
  | "mend"
  | "reveal"
  | "tempt"
  | "sever"
  | "balance"
  | "leap";

export type PlatformerLastMelodyToken = "major" | "minor" | "npc" | "mode" | null;

export type PlatformerLevelMemory = {
  phrase: number[];
  motif: number[];
  cadence: number[];
  facet: PlatformerMirrorFacet;
  label: string;
  energy: number;
  routeBias: number;
  seed: number;
};

export type PlatformerNpcMirrorTelemetry = {
  recentEvents: MovementEvent[];
  playerVx: number;
  actionDrive: number;
  stuckTime: number;
  solvedPedestals: number;
  gatesOpen: number;
  lives: number;
  lastMelodyToken: PlatformerLastMelodyToken;
  lastLevelMemory?: PlatformerLevelMemory | null;
};

export type PlatformerNpcMirrorProfile = {
  facet: PlatformerMirrorFacet;
  label: string;
  dominantKind: MovementEventKind | null;
  motif: number[];
  supportNeed: number;
  noveltyNeed: number;
  aggression: number;
  airborneBias: number;
  greedBias: number;
  cadenceBias: number;
  routeBias: -1 | 0 | 1;
  memoryLabel: string | null;
};

export type PlatformerNpcLoomDraft = {
  id: PlatformerLoomDraftId;
  forwardLabel: string;
  reverseLabel: string;
  activeLabel: string;
  verbLabel: string;
  motif: number[];
  echoSemi: number;
  echoLabel: string | null;
};

type PlatformerNpcAnimal =
  | "camel"
  | "panda"
  | "owl"
  | "fox"
  | "wolf"
  | "crane"
  | "frog"
  | "cat";

type PlatformerNpcDisposition = "guide" | "trickster" | "mirror";
type PlatformerNpcTarotOrientation = "upright" | "reversed";

type DraftSpec = {
  id: PlatformerLoomDraftId;
  forwardLabel: string;
  reverseLabel: string;
  motif: number[];
};

const MIRROR_FACET_LABELS: Record<PlatformerMirrorFacet, string> = {
  momentum: "momentum hunger",
  airtime: "airtime drift",
  repetition: "repetition lock",
  recovery: "recovery need",
  curiosity: "curiosity pull",
  precision: "precision ritual",
};

const DRAFT_LIBRARY: Record<PlatformerNpcAnimal, DraftSpec> = {
  camel: { id: "weave", forwardLabel: "WEAVE", reverseLabel: "UNWEAVE", motif: [0, 1, 5, 7] },
  panda: { id: "mend", forwardLabel: "MEND", reverseLabel: "FRAY", motif: [0, 2, 7, 9] },
  owl: { id: "reveal", forwardLabel: "REVEAL", reverseLabel: "VEIL", motif: [0, 6, 7, 12] },
  fox: { id: "tempt", forwardLabel: "TEMPT", reverseLabel: "RELEASE", motif: [0, 3, 8, 10] },
  wolf: { id: "sever", forwardLabel: "SEVER", reverseLabel: "BRIDGE", motif: [0, 6, 7, 12] },
  crane: { id: "balance", forwardLabel: "BALANCE", reverseLabel: "TILT", motif: [0, 5, 7, 12] },
  frog: { id: "leap", forwardLabel: "LEAP", reverseLabel: "STALL", motif: [0, 2, 6, 10] },
  cat: { id: "open", forwardLabel: "OPEN", reverseLabel: "SEAL", motif: [0, 4, 7, 12] },
};

const clampInterval = (semi: number) => Math.round(clamp(semi, -12, 14));

const buildRelativeMotif = (source: number[], fallback: number[]): number[] => {
  const picked = source.length > 0 ? source.slice(0, 4) : fallback.slice(0, 4);
  const root = picked[0] ?? 0;
  return picked.map((semi, index) => (index === 0 ? 0 : clampInterval(semi - root)));
};

const getDominantEventKind = (events: MovementEvent[]): MovementEventKind | null => {
  if (events.length === 0) return null;
  const scores = new Map<MovementEventKind, number>();
  for (const event of events) {
    scores.set(event.kind, (scores.get(event.kind) ?? 0) + (event.kind === "motion" ? 0.25 : 1 + event.energy * 0.4));
  }
  let bestKind: MovementEventKind | null = null;
  let bestScore = -Infinity;
  scores.forEach((score, kind) => {
    if (score > bestScore) {
      bestScore = score;
      bestKind = kind;
    }
  });
  return bestKind;
};

const pickMirrorFacet = (
  supportNeed: number,
  noveltyNeed: number,
  airborneBias: number,
  greedBias: number,
  cadenceBias: number,
  dominantKind: MovementEventKind | null,
): PlatformerMirrorFacet => {
  if (supportNeed > 0.62) return "recovery";
  if (noveltyNeed > 0.64 && (dominantKind === "step" || dominantKind === "turn" || dominantKind === "motion")) {
    return "repetition";
  }
  if (airborneBias > 0.48) return "airtime";
  if (cadenceBias > 0.26) return "precision";
  if (greedBias > 0.34) return "curiosity";
  return "momentum";
};

const computeSeed = (events: MovementEvent[], phrase: number[], routeBias: number): number => {
  let seed = 0x811c9dc5;
  for (let index = 0; index < events.length; index += 1) {
    const event = events[index];
    seed ^= ((event.semi + 64) & 0xff) | (((event.lane + 16) & 0xff) << 8);
    seed = Math.imul(seed, 16777619);
    seed ^= ((event.kind.charCodeAt(0) + index * 17) & 0xff) | (Math.round(event.energy * 255) << 8);
    seed = Math.imul(seed, 16777619);
  }
  for (let index = 0; index < phrase.length; index += 1) {
    seed ^= ((phrase[index] + 64 + index * 3) & 0xffff) ^ ((routeBias + 2) << 20);
    seed = Math.imul(seed, 16777619);
  }
  seed >>>= 0;
  return seed === 0 ? 1 : seed;
};

export function analyzePlatformerNpcMirrorProfile(
  telemetry: PlatformerNpcMirrorTelemetry,
): PlatformerNpcMirrorProfile {
  const events = telemetry.recentEvents.slice(-16);
  const nonMotion = events.filter((event) => event.kind !== "motion");
  const airborneCount = events.filter((event) => event.airborne || event.kind === "jump" || event.kind === "fall").length;
  const jumpLikeCount = events.filter((event) => event.kind === "jump" || event.kind === "turn").length;
  const greedCount = events.filter((event) =>
    event.kind === "coin" || event.kind === "npc_orb" || event.kind === "mode_shift").length;
  const cadenceCount = events.filter((event) =>
    event.kind === "puzzle_step" || event.kind === "gate_unlock" || event.kind === "sync_gate" || event.kind === "phase_gate").length;
  const uniqueKinds = new Set(nonMotion.map((event) => event.kind)).size;
  const supportNeed = clamp(
    telemetry.stuckTime / 8.5
      + (telemetry.lives <= 2 ? 0.18 : 0)
      + (telemetry.lastMelodyToken == null ? 0.08 : 0)
      - telemetry.actionDrive * 0.16,
    0,
    1,
  );
  const noveltyNeed = clamp(
    telemetry.actionDrive * 0.58
      + (uniqueKinds <= 2 ? 0.22 : 0)
      + (jumpLikeCount >= 2 ? 0.08 : 0)
      + (telemetry.gatesOpen > 0 ? 0.05 : 0)
      - supportNeed * 0.22,
    0,
    1,
  );
  const aggression = clamp(
    Math.abs(telemetry.playerVx) / 420 * 0.56
      + telemetry.actionDrive * 0.28
      + Math.min(0.18, jumpLikeCount * 0.05),
    0,
    1,
  );
  const airborneBias = clamp(
    (airborneCount + jumpLikeCount * 0.6) / Math.max(1, events.length),
    0,
    1,
  );
  const greedBias = clamp(greedCount / Math.max(1, nonMotion.length), 0, 1);
  const cadenceBias = clamp(
    cadenceCount / Math.max(1, nonMotion.length)
      + Math.min(0.16, telemetry.solvedPedestals * 0.06),
    0,
    1,
  );
  const dominantKind = getDominantEventKind(nonMotion.length > 0 ? nonMotion : events);
  const facet = pickMirrorFacet(
    supportNeed,
    noveltyNeed,
    airborneBias,
    greedBias,
    cadenceBias,
    dominantKind,
  );
  const melodicSource = (nonMotion.length > 0 ? nonMotion : events)
    .slice(-4)
    .map((event) => event.semi);
  const fallbackMotif =
    facet === "recovery"
      ? [0, 2, 7, 9]
      : facet === "repetition"
        ? [0, 6, 7, 12]
        : facet === "airtime"
          ? [0, 5, 9, 12]
          : facet === "precision"
            ? [0, 4, 7, 11]
            : facet === "curiosity"
              ? [0, 3, 8, 10]
              : [0, 4, 7, 12];
  const routeBias: -1 | 0 | 1 =
    telemetry.playerVx > 42 ? 1 : telemetry.playerVx < -42 ? -1 : telemetry.lastMelodyToken === "minor" ? -1 : telemetry.lastMelodyToken === "major" || telemetry.lastMelodyToken === "npc" ? 1 : 0;
  return {
    facet,
    label: MIRROR_FACET_LABELS[facet],
    dominantKind,
    motif: buildRelativeMotif(melodicSource, fallbackMotif),
    supportNeed,
    noveltyNeed,
    aggression,
    airborneBias,
    greedBias,
    cadenceBias,
    routeBias,
    memoryLabel: telemetry.lastLevelMemory?.label ?? null,
  };
}

export function buildPlatformerLevelMemory(
  events: MovementEvent[],
  fallbackPhrase: number[],
): PlatformerLevelMemory | null {
  if (events.length === 0 && fallbackPhrase.length === 0) return null;
  const phrase = (fallbackPhrase.length > 0 ? fallbackPhrase : [0, 3, 7, 10]).slice(-24);
  const theme = deriveMovementTheme(events, phrase);
  const energy = clamp(
    (theme.strideDensity + theme.airDensity + theme.accentDensity + theme.syncDensity) / 4,
    0,
    1,
  );
  const dominantKind = getDominantEventKind(events.slice(-16));
  const facet = pickMirrorFacet(
    clamp((1 - energy) * 0.35 + (theme.restDensity > 0.18 ? 0.2 : 0), 0, 1),
    clamp(energy * 0.52 + Math.abs(theme.routeProfile.splitMotion) * 0.24, 0, 1),
    theme.airDensity,
    theme.accentDensity,
    clamp(theme.syncDensity * 0.4 + Math.abs(theme.forkBias) * 0.26, 0, 1),
    dominantKind,
  );
  return {
    phrase,
    motif: buildRelativeMotif(theme.groundMotif, phrase),
    cadence: buildRelativeMotif(theme.cadenceMotif, [0, 5, 7, 12]),
    facet,
    label: MIRROR_FACET_LABELS[facet],
    energy,
    routeBias: Number(theme.routeProfile.branchBias.toFixed(3)),
    seed: computeSeed(events, phrase, Math.round(theme.routeProfile.branchBias * 10)),
  };
}

export function resolvePlatformerNpcLoomDraft(opts: {
  animal: PlatformerNpcAnimal;
  disposition: PlatformerNpcDisposition;
  tarotOrientation: PlatformerNpcTarotOrientation;
  mirror: PlatformerNpcMirrorProfile;
  lastLevelMemory?: PlatformerLevelMemory | null;
}): PlatformerNpcLoomDraft {
  const { animal, disposition, tarotOrientation, mirror, lastLevelMemory = null } = opts;
  const spec = DRAFT_LIBRARY[animal];
  const activeLabel = tarotOrientation === "upright" ? spec.forwardLabel : spec.reverseLabel;
  const mirrorBlend =
    disposition === "mirror"
      ? 0.5
      : disposition === "trickster"
        ? 0.34
        : 0.22;
  const memoryBlend = disposition === "guide" ? 0.26 : 0.18;
  const memoryMotif = lastLevelMemory?.motif ?? [];
  const motif = spec.motif.map((semi, index) => {
    const mirrorSemi = mirror.motif[index % Math.max(1, mirror.motif.length)] ?? 0;
    const memorySemi = memoryMotif[index % Math.max(1, memoryMotif.length)] ?? 0;
    const noveltyLift =
      mirror.facet === "repetition" && index === 1
        ? 1
        : mirror.facet === "airtime" && index % 2 === 1
          ? 2
          : mirror.facet === "recovery" && index === 2
            ? -1
            : 0;
    return index === 0
      ? 0
      : clampInterval(semi + mirrorSemi * mirrorBlend + memorySemi * memoryBlend + noveltyLift);
  });
  const verbPrefix =
    disposition === "guide"
      ? "guides"
      : disposition === "trickster"
        ? "distorts"
        : "mirrors";
  const echoSemi = clampInterval(
    (lastLevelMemory?.cadence[0] ?? mirror.motif[0] ?? 0)
      + (tarotOrientation === "upright" ? 2 : -2),
  );
  return {
    id: spec.id,
    forwardLabel: spec.forwardLabel,
    reverseLabel: spec.reverseLabel,
    activeLabel,
    verbLabel: `${verbPrefix} via ${activeLabel.toLowerCase()}`,
    motif,
    echoSemi,
    echoLabel: lastLevelMemory ? `echoes ${lastLevelMemory.label}` : null,
  };
}
