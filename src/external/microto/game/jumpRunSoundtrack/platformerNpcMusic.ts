import { clamp } from "../../shared/tuning/grid";
import type { Platform } from "./platformerState";
import {
  analyzePlatformerNpcMirrorProfile,
  resolvePlatformerNpcLoomDraft,
  type PlatformerLastMelodyToken,
  type PlatformerLevelMemory,
  type PlatformerLoomDraftId,
  type PlatformerMirrorFacet,
} from "./platformerNpcMirror";
import type { MovementEvent } from "./platformerArrangement";
import {
  getDispositionMotionTuning,
  getDispositionPitchBias,
  getTarotMotionTuning,
  getTarotOrientation,
  resolveDiatonicSemi,
} from "./platformerNpcMusicTuning";
import {
  NPC_ANCHORS,
  getPlatformerScaleProfile,
  getPlatformerAnimalProfile,
  type PlatformerScaleId,
  type PlatformerNpcAnimal,
  type PlatformerNpcThrowStyle,
  type PlatformerNpcTarotCard,
  type PlatformerNpcDisposition,
} from "./platformerNpcCatalog";

export type { PlatformerScaleId, PlatformerNpcAnimal, PlatformerScaleProfile, PlatformerAnimalProfile, PlatformerNpcThrowStyle, PlatformerNpcTarotCard, PlatformerNpcDisposition } from "./platformerNpcCatalog";
export { getPlatformerScaleProfile, getPlatformerAnimalProfile } from "./platformerNpcCatalog";

export type PlatformerCollectibleKind = "coin_red" | "coin_blue" | "mushroom";

export type PlatformerNpcTarotOrientation = "upright" | "reversed";

export type PlatformerMusicNpc = {
  id: string;
  animal: PlatformerNpcAnimal;
  label: string;
  scaleId: PlatformerScaleId;
  throwStyle: PlatformerNpcThrowStyle;
  color: string;
  x: number;
  y: number;
  lane: number;
  lastThrowAt: number;
  throwInterval: number;
  phase: number;
  orbCursor: number;
  throwDirection: 1 | -1;
  rootOffset: number;
  tarotCard?: PlatformerNpcTarotCard;
  tarotTitle?: string;
  tarotOrientation?: PlatformerNpcTarotOrientation;
  modernRole?: string;
  giftLabel?: string;
  shadowLabel?: string;
  lessonLabel?: string;
  disposition?: PlatformerNpcDisposition;
  moodLabel?: string;
  lastDispositionShiftAt?: number;
  mirrorFacet?: PlatformerMirrorFacet;
  mirrorLabel?: string;
  loomDraftId?: PlatformerLoomDraftId;
  loomDraftLabel?: string;
  loomReverseLabel?: string;
  loomActiveLabel?: string;
  loomVerbLabel?: string;
  draftMotif?: number[];
  memoryEchoLabel?: string | null;
  memoryEchoSemi?: number;
};

export type PlatformerNpcNoteOrb = {
  id: number;
  npcId: string;
  animal: PlatformerNpcAnimal;
  label: string;
  scaleId: PlatformerScaleId;
  throwStyle: PlatformerNpcThrowStyle;
  color: string;
  lane: number;
  rootOffset: number;
  noteIndex: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  age: number;
  life: number;
  drift: number;
  disposition?: PlatformerNpcDisposition;
  tarotCard?: PlatformerNpcTarotCard;
  tarotTitle?: string;
  tarotOrientation?: PlatformerNpcTarotOrientation;
  modernRole?: string;
  giftLabel?: string;
  shadowLabel?: string;
  lessonLabel?: string;
  pitchBias?: number;
  mirrorFacet?: PlatformerMirrorFacet;
  mirrorLabel?: string;
  loomDraftId?: PlatformerLoomDraftId;
  loomDraftLabel?: string;
  loomReverseLabel?: string;
  loomActiveLabel?: string;
  loomVerbLabel?: string;
  draftMotif?: number[];
  memoryEchoLabel?: string | null;
  memoryEchoSemi?: number;
};

export type PlatformerNpcTelemetry = {
  playerX: number;
  playerVx: number;
  actionDrive: number;
  stuckTime: number;
  solvedPedestals: number;
  gatesOpen: number;
  lives: number;
  lastMelodyToken: PlatformerLastMelodyToken;
  recentEvents: MovementEvent[];
  lastLevelMemory?: PlatformerLevelMemory | null;
};

export type PlatformerNpcIntent = {
  tarotCard: PlatformerNpcTarotCard;
  tarotTitle: string;
  tarotOrientation: PlatformerNpcTarotOrientation;
  modernRole: string;
  giftLabel: string;
  shadowLabel: string;
  lessonLabel: string;
  disposition: PlatformerNpcDisposition;
  moodLabel: string;
  pitchBias: number;
  intervalScale: number;
  velocityScale: number;
  lifeScale: number;
  driftScale: number;
  mirrorFacet: PlatformerMirrorFacet;
  mirrorLabel: string;
  loomDraftId: PlatformerLoomDraftId;
  loomDraftLabel: string;
  loomReverseLabel: string;
  loomActiveLabel: string;
  loomVerbLabel: string;
  draftMotif: number[];
  memoryEchoLabel: string | null;
  memoryEchoSemi: number;
};

const DISPOSITION_LABELS: Record<PlatformerNpcDisposition, string> = {
  guide: "Guide",
  trickster: "Trickster",
  mirror: "Mirror",
};

const getNpcAspectLabel = (
  orientation: PlatformerNpcTarotOrientation,
  giftLabel: string,
  shadowLabel: string,
) => (orientation === "upright" ? giftLabel : shadowLabel);

const getNpcMoodLabel = (
  disposition: PlatformerNpcDisposition,
  orientation: PlatformerNpcTarotOrientation,
  giftLabel: string,
  shadowLabel: string,
  loomActiveLabel?: string,
) => `${DISPOSITION_LABELS[disposition]} / ${getNpcAspectLabel(orientation, giftLabel, shadowLabel)}${loomActiveLabel ? ` / ${loomActiveLabel}` : ""}`;

export function getPlatformerNpcThrowDirection(
  npc: Pick<PlatformerMusicNpc, "x" | "throwDirection">,
  disposition: PlatformerNpcDisposition,
  playerX: number,
  playerVx: number,
): 1 | -1 {
  const towardPlayer: 1 | -1 = playerX >= npc.x ? 1 : -1;
  if (disposition === "guide") return towardPlayer;
  if (disposition === "trickster") return towardPlayer === 1 ? -1 : 1;
  if (playerVx > 16) return 1;
  if (playerVx < -16) return -1;
  return npc.throwDirection;
}

export function getPlatformerNpcIntent(
  npc: Pick<PlatformerMusicNpc, "animal">,
  telemetry: PlatformerNpcTelemetry,
): PlatformerNpcIntent {
  const profile = getPlatformerAnimalProfile(npc.animal);
  const stuckPressure = clamp(telemetry.stuckTime / 7.5, 0, 1);
  const speedPressure = clamp(Math.abs(telemetry.playerVx) / 420, 0, 1);
  const guideScore =
    profile.guideBias
    + stuckPressure * 0.9
    + (telemetry.lives <= 2 ? 0.18 : 0)
    + (telemetry.actionDrive < 0.28 ? 0.1 : 0)
    + (telemetry.lastMelodyToken == null ? 0.06 : 0);
  const tricksterScore =
    profile.tricksterBias
    + telemetry.actionDrive * 0.54
    + speedPressure * 0.24
    + (stuckPressure < 0.2 ? 0.08 : 0)
    + clamp((telemetry.solvedPedestals + telemetry.gatesOpen) * 0.04, 0, 0.2);
  const mirrorWindow = 1 - clamp(Math.abs(telemetry.actionDrive - 0.46) / 0.46, 0, 1);
  const mirrorScore =
    profile.mirrorBias
    + mirrorWindow * 0.42
    + clamp(telemetry.solvedPedestals * 0.06, 0, 0.18)
    + clamp(telemetry.gatesOpen * 0.08, 0, 0.16);
  const disposition =
    guideScore > tricksterScore && guideScore >= mirrorScore
      ? "guide"
      : tricksterScore >= mirrorScore
        ? "trickster"
        : "mirror";
  const tarotOrientation = getTarotOrientation(npc.animal, disposition, telemetry);
  const motion = getTarotMotionTuning(disposition, tarotOrientation);
  const mirror = analyzePlatformerNpcMirrorProfile({
    recentEvents: telemetry.recentEvents,
    playerVx: telemetry.playerVx,
    actionDrive: telemetry.actionDrive,
    stuckTime: telemetry.stuckTime,
    solvedPedestals: telemetry.solvedPedestals,
    gatesOpen: telemetry.gatesOpen,
    lives: telemetry.lives,
    lastMelodyToken: telemetry.lastMelodyToken,
    lastLevelMemory: telemetry.lastLevelMemory,
  });
  const loomDraft = resolvePlatformerNpcLoomDraft({
    animal: npc.animal,
    disposition,
    tarotOrientation,
    mirror,
    lastLevelMemory: telemetry.lastLevelMemory,
  });
  return {
    tarotCard: profile.tarotCard,
    tarotTitle: profile.tarotTitle,
    tarotOrientation,
    modernRole: profile.modernRole,
    giftLabel: profile.giftLabel,
    shadowLabel: profile.shadowLabel,
    lessonLabel: profile.lessonLabel,
    disposition,
    moodLabel: getNpcMoodLabel(
      disposition,
      tarotOrientation,
      profile.giftLabel,
      profile.shadowLabel,
      loomDraft.activeLabel,
    ),
    pitchBias: getDispositionPitchBias(npc.animal, disposition, telemetry),
    mirrorFacet: mirror.facet,
    mirrorLabel: mirror.label,
    loomDraftId: loomDraft.id,
    loomDraftLabel: loomDraft.forwardLabel,
    loomReverseLabel: loomDraft.reverseLabel,
    loomActiveLabel: loomDraft.activeLabel,
    loomVerbLabel: loomDraft.verbLabel,
    draftMotif: loomDraft.motif,
    memoryEchoLabel: loomDraft.echoLabel,
    memoryEchoSemi: loomDraft.echoSemi,
    ...motion,
  };
}

function getOrbVelocity(style: PlatformerNpcThrowStyle, noteIndex: number, direction: 1 | -1) {
  if (style === "fan") {
    const spread = (noteIndex % 3) - 1;
    return {
      vx: direction * (72 + spread * 56),
      vy: -120 - Math.abs(spread) * 18,
      drift: 8 + Math.abs(spread) * 4,
      life: 2.8,
    };
  }
  if (style === "drift") {
    return {
      vx: direction * 38,
      vy: -42 - (noteIndex % 2) * 14,
      drift: 22,
      life: 3.4,
    };
  }
  if (style === "skip") {
    return {
      vx: direction * (134 + (noteIndex % 2) * 28),
      vy: -68 - (noteIndex % 3) * 8,
      drift: 10,
      life: 2.4,
    };
  }
  return {
    vx: direction * (96 + (noteIndex % 2) * 22),
    vy: -156 - (noteIndex % 3) * 12,
    drift: 6,
    life: 2.9,
  };
}

export function getPlatformerCollectibleKind(
  platformIndex: number,
  slotIndex: number,
): PlatformerCollectibleKind {
  if ((platformIndex + 1) % 4 === 0 && slotIndex === 0) return "mushroom";
  return (platformIndex + slotIndex) % 2 === 0 ? "coin_red" : "coin_blue";
}

export function getPlatformerTriadSemis(
  kind: Exclude<PlatformerCollectibleKind, "mushroom">,
  lane: number,
  modeShift: number,
): number[] {
  const root = resolveDiatonicSemi(lane + modeShift) - 2;
  const triad = kind === "coin_red" ? [0, 4, 7] : [0, 3, 7];
  return triad.map((interval) => root + interval);
}

export function getPlatformerModeShiftSemis(lane: number, nextModeShift: number): number[] {
  const baseDegree = lane + nextModeShift;
  return [
    resolveDiatonicSemi(baseDegree) - 2,
    resolveDiatonicSemi(baseDegree + 2) - 2,
    resolveDiatonicSemi(baseDegree + 4) - 2,
  ];
}

export function createPlatformerMusicNpcs(platforms: Platform[]): PlatformerMusicNpc[] {
  return NPC_ANCHORS.flatMap((anchor, index) => {
    const platform = platforms.find((entry) => entry.id === anchor.platformId);
    if (!platform) return [];
    const profile = getPlatformerAnimalProfile(anchor.animal);
    const phase = index / Math.max(1, NPC_ANCHORS.length);
    const x =
      anchor.side === "left"
        ? platform.x + 32
        : anchor.side === "right"
          ? platform.x + platform.w - 38
          : platform.x + platform.w * 0.5;
    const y = platform.y - (anchor.yLift ?? 28);
    const lane = Math.max(0, Math.round((x / 4300) * 6));
    const tarotOrientation = profile.preferredDisposition === "trickster" ? "reversed" : "upright";
    const defaultLoomDraft = resolvePlatformerNpcLoomDraft({
      animal: profile.animal,
      disposition: profile.preferredDisposition,
      tarotOrientation,
      mirror: {
        facet: "momentum",
        label: "momentum hunger",
        dominantKind: null,
        motif: [0, 4, 7, 12],
        supportNeed: 0.16,
        noveltyNeed: 0.22,
        aggression: 0.22,
        airborneBias: 0.08,
        greedBias: 0.1,
        cadenceBias: 0.08,
        routeBias: 0,
        memoryLabel: null,
      },
      lastLevelMemory: null,
    });
    return [{
      id: `npc-${anchor.animal}`,
      animal: anchor.animal,
      label: profile.label,
      scaleId: profile.scaleId,
      throwStyle: profile.throwStyle,
      color: profile.color,
      x,
      y,
      lane,
      lastThrowAt: -profile.throwInterval * (0.25 + phase),
      throwInterval: profile.throwInterval,
      phase,
      orbCursor: 0,
      throwDirection: anchor.direction ?? 1,
      rootOffset: profile.rootOffset,
      tarotCard: profile.tarotCard,
      tarotTitle: profile.tarotTitle,
      tarotOrientation,
      modernRole: profile.modernRole,
      giftLabel: profile.giftLabel,
      shadowLabel: profile.shadowLabel,
      lessonLabel: profile.lessonLabel,
      disposition: profile.preferredDisposition,
      moodLabel: getNpcMoodLabel(
        profile.preferredDisposition,
        tarotOrientation,
        profile.giftLabel,
        profile.shadowLabel,
        defaultLoomDraft.activeLabel,
      ),
      lastDispositionShiftAt: -999,
      mirrorFacet: "momentum",
      mirrorLabel: "momentum hunger",
      loomDraftId: defaultLoomDraft.id,
      loomDraftLabel: defaultLoomDraft.forwardLabel,
      loomReverseLabel: defaultLoomDraft.reverseLabel,
      loomActiveLabel: defaultLoomDraft.activeLabel,
      loomVerbLabel: defaultLoomDraft.verbLabel,
      draftMotif: defaultLoomDraft.motif,
      memoryEchoLabel: defaultLoomDraft.echoLabel,
      memoryEchoSemi: defaultLoomDraft.echoSemi,
    }];
  });
}

export function createPlatformerNpcOrb(
  npc: PlatformerMusicNpc,
  id: number,
  intent?: PlatformerNpcIntent,
): PlatformerNpcNoteOrb {
  const disposition = intent?.disposition ?? npc.disposition ?? "mirror";
  const tarotOrientation = intent?.tarotOrientation ?? npc.tarotOrientation ?? "upright";
  const motion = getTarotMotionTuning(disposition, tarotOrientation);
  const velocity = getOrbVelocity(npc.throwStyle, npc.orbCursor, npc.throwDirection);
  return {
    id,
    npcId: npc.id,
    animal: npc.animal,
    label: npc.label,
    scaleId: npc.scaleId,
    throwStyle: npc.throwStyle,
    color: npc.color,
    lane: npc.lane,
    rootOffset: npc.rootOffset,
    noteIndex: npc.orbCursor,
    x: npc.x,
    y: npc.y - 12,
    vx: velocity.vx * (intent?.velocityScale ?? motion.velocityScale),
    vy: velocity.vy * (intent?.velocityScale ?? motion.velocityScale),
    age: 0,
    life: velocity.life * (intent?.lifeScale ?? motion.lifeScale),
    drift: velocity.drift * (intent?.driftScale ?? motion.driftScale),
    disposition,
    tarotCard: intent?.tarotCard ?? npc.tarotCard,
    tarotTitle: intent?.tarotTitle ?? npc.tarotTitle,
    tarotOrientation,
    modernRole: intent?.modernRole ?? npc.modernRole,
    giftLabel: intent?.giftLabel ?? npc.giftLabel,
    shadowLabel: intent?.shadowLabel ?? npc.shadowLabel,
    lessonLabel: intent?.lessonLabel ?? npc.lessonLabel,
    pitchBias: intent?.pitchBias ?? 0,
    mirrorFacet: intent?.mirrorFacet ?? npc.mirrorFacet,
    mirrorLabel: intent?.mirrorLabel ?? npc.mirrorLabel,
    loomDraftId: intent?.loomDraftId ?? npc.loomDraftId,
    loomDraftLabel: intent?.loomDraftLabel ?? npc.loomDraftLabel,
    loomReverseLabel: intent?.loomReverseLabel ?? npc.loomReverseLabel,
    loomActiveLabel: intent?.loomActiveLabel ?? npc.loomActiveLabel,
    loomVerbLabel: intent?.loomVerbLabel ?? npc.loomVerbLabel,
    draftMotif: intent?.draftMotif ?? npc.draftMotif,
    memoryEchoLabel: intent?.memoryEchoLabel ?? npc.memoryEchoLabel,
    memoryEchoSemi: intent?.memoryEchoSemi ?? npc.memoryEchoSemi,
  };
}

export function relaunchPlatformerNpcOrb(
  orb: PlatformerNpcNoteOrb,
  npc: PlatformerMusicNpc,
  targetX: number,
): void {
  const direction: 1 | -1 = targetX >= npc.x ? 1 : -1;
  const motion = getDispositionMotionTuning(orb.disposition ?? "mirror");
  const velocity = getOrbVelocity(npc.throwStyle, orb.noteIndex, direction);
  orb.x = npc.x;
  orb.y = npc.y - 12;
  orb.vx = velocity.vx * motion.velocityScale;
  orb.vy = velocity.vy * motion.velocityScale;
  orb.age = 0;
  orb.life = Math.max(orb.life, velocity.life * motion.lifeScale * 0.42);
  orb.drift = velocity.drift * motion.driftScale;
}

export function tickPlatformerNpcOrb(
  orb: PlatformerNpcNoteOrb,
  dt: number,
): void {
  orb.age += dt;
  orb.life -= dt;
  if (orb.throwStyle === "drift") {
    orb.x += orb.vx * dt + Math.cos(orb.age * 4 + orb.noteIndex) * orb.drift * dt;
    orb.y += orb.vy * dt + Math.sin(orb.age * 5 + orb.noteIndex) * 18 * dt;
    orb.vy = clamp(orb.vy + 24 * dt, -90, 42);
    return;
  }
  if (orb.throwStyle === "skip") {
    orb.vy += 320 * dt;
    orb.x += orb.vx * dt;
    orb.y += orb.vy * dt + Math.sin(orb.age * 8) * orb.drift * 0.18;
    return;
  }
  orb.vy += orb.throwStyle === "fan" ? 180 * dt : 260 * dt;
  orb.x += orb.vx * dt;
  orb.y += orb.vy * dt;
}

export function getPlatformerNpcOrbSemi(
  orb: PlatformerNpcNoteOrb,
  modeShift: number,
): number {
  const scale = getPlatformerScaleProfile(orb.scaleId).intervals;
  const length = scale.length;
  const shiftedIndex = orb.noteIndex + modeShift;
  const wrappedIndex = ((shiftedIndex % length) + length) % length;
  const octave = Math.floor(shiftedIndex / length);
  return orb.rootOffset + scale[wrappedIndex] + octave * 12 + clamp(orb.pitchBias ?? 0, -12, 12);
}
