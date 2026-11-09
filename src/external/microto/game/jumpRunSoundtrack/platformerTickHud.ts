/**
 * Platformer tick HUD derivation: builds PlatformerHudState from sim + api + context.
 * Extracted from platformerTick to keep tick file under 700 LOC (STRUCTURE soft target).
 */

import type { SimState } from "./platformerState";
import type { PlatformerNpcFieldState } from "./platformerNpcField";
import type { MusicState, PlatformerAudioApi } from "./platformerAudio";
import type {
  PlatformerArrangementForm,
  PlatformerArrangementMode,
  PlatformerTuningMode,
} from "./platformerArrangement";
import type { PlatformerHudState } from "./platformerHudHelpers";
import type { PlatformerMusicNpc } from "./platformerNpcMusic";
import {
  isComposerObstacleEvent,
  describeComposerObstacleHit,
  summarizeComposerInfluence,
} from "./platformerHelpers";
import {
  buildPlatformerRouteProfileFromSelections,
  formatPlatformerRouteChoice,
  formatPlatformerRouteMode,
} from "./platformerRouteProfile";
import { formatPlatformerSectionBias, type PlatformerSectionBias } from "./platformerSectionBias";

export type PlatformerTickHudParams = {
  s: SimState;
  musicRef: { current: MusicState };
  bpm: number;
  tuningMode: PlatformerTuningMode;
  arrangementMode: PlatformerArrangementMode;
  formMode: PlatformerArrangementForm;
  sectionBias: PlatformerSectionBias;
  evolutionDepth: number;
  tempoFollow: number;
  api: PlatformerAudioApi;
  npcFieldForHud: PlatformerNpcFieldState;
  solvedPedestals: number;
  clampedActionDrive: number;
  nearbyNpc: PlatformerMusicNpc | null;
  win: boolean;
};

/**
 * Builds the HUD state object from current sim, music, and context. Pure view derivation.
 */
export function buildPlatformerHudStateFromTick(params: PlatformerTickHudParams): PlatformerHudState {
  const {
    s,
    musicRef,
    api,
    npcFieldForHud,
    solvedPedestals,
    clampedActionDrive,
    nearbyNpc,
    win,
  } = params;
  const m = musicRef.current;
  const composition = api.getCompositionSummary();
  const influence = summarizeComposerInfluence(m.movementEvents);
  const preview = api.getComposerPreview(params.bpm);
  const routeProfile = buildPlatformerRouteProfileFromSelections(s.routeSelections);

  const latestComposerEvent = [...m.movementEvents]
    .reverse()
    .find((event) => isComposerObstacleEvent(event.kind)) ?? null;
  const latestMelodyEvent = [...m.movementEvents]
    .reverse()
    .find((event) => event.kind === "npc_orb" || event.kind === "mode_shift") ?? null;
  const latestAdventureEvent = [...m.movementEvents]
    .reverse()
    .find((event) => event.kind === "puzzle_step" || event.kind === "gate_unlock") ?? null;

  const composerStatus =
    latestComposerEvent && s.t - latestComposerEvent.t < 1.35
      ? describeComposerObstacleHit(latestComposerEvent)
      : null;
  const melodyStatus =
    latestMelodyEvent && s.t - latestMelodyEvent.t < 1.1
      ? latestMelodyEvent.kind === "mode_shift"
        ? `Mode Shift ${s.modeShift + 1}/7`
        : "NPC orb phrase captured"
      : null;
  const adventureStatus =
    latestAdventureEvent && s.t - latestAdventureEvent.t < 1.6
      ? latestAdventureEvent.kind === "gate_unlock"
        ? "Echo Gate offen"
        : "Resonance puzzle step locked"
      : null;
  const npcStatus =
    nearbyNpc
    && (
      s.t - (nearbyNpc.lastDispositionShiftAt ?? -999) < 1.6
      || s.t - nearbyNpc.lastThrowAt < 0.85
    )
      ? `${nearbyNpc.label} / ${nearbyNpc.loomActiveLabel ?? nearbyNpc.moodLabel ?? nearbyNpc.tarotTitle ?? "NPC"} / ${nearbyNpc.mirrorLabel ?? nearbyNpc.modernRole ?? "echo"}`
      : null;
  const memoryStatus =
    m.lastLevelMemory && !win
      ? `Last level echo / ${m.lastLevelMemory.label}`
      : null;

  const status = win
    ? m.completionIntroComplete
      ? "Run completed - movement suite looping"
      : "Run completed - movement suite intro"
    : composerStatus
      ? composerStatus
      : adventureStatus
        ? adventureStatus
        : npcFieldForHud.statusLabel
          ? npcFieldForHud.statusLabel
          : npcStatus
            ? npcStatus
            : memoryStatus
              ? memoryStatus
              : melodyStatus
                ? melodyStatus
                : s.lives <= 1
                  ? "Kritisch, halte den Flow"
                  : `Flow stabil - mode ${s.modeShift + 1}/7`;

  return {
    score: s.score,
    lives: s.lives,
    collected: s.collected,
    totalCoins: s.coins.length,
    combo: win
      ? m.completionPhrase.length || m.phrase.length
      : m.phrase.length,
    form: preview.ready ? preview.formLabel : composition.form,
    events: composition.events,
    syncHits: influence.syncHits,
    phaseHits: influence.phaseHits,
    tuningHits: influence.tuningHits,
    forkHits: influence.forkHits,
    restHits: influence.restHits,
    phaseFocus: preview.ready ? preview.phaseFocus : influence.phaseFocus,
    tuningTilt: preview.ready ? preview.tuningTilt : influence.tuningTilt,
    forkBias: preview.ready ? preview.forkBias : influence.forkBias,
    restDensity: preview.ready ? preview.restDensity : 0,
    previewSlots: preview.ready ? preview.timeline.length : 0,
    puzzleSteps: solvedPedestals,
    puzzleTotal: s.puzzlePedestals.length,
    gatesOpen: s.resonanceGates.filter((gate) => gate.open).length,
    actionDrive: clampedActionDrive,
    routeOne: formatPlatformerRouteChoice(routeProfile.first),
    routeTwo: formatPlatformerRouteChoice(routeProfile.second),
    routeMode: formatPlatformerRouteMode(routeProfile.mode),
    routeBias: preview.ready ? preview.routeBias : routeProfile.branchBias,
    routeTravel: preview.ready ? preview.routeTravel : routeProfile.splitMotion,
    routeColor: preview.ready ? preview.routeColor : "--",
    routeGroove: preview.ready ? preview.routeGroove : "--",
    routeLeadVoice: preview.ready ? preview.routeLeadVoice : "--",
    sectionBias: formatPlatformerSectionBias(preview.ready ? preview.sectionBias : params.sectionBias),
    targetTempo: preview.ready ? preview.targetBpm : composition.targetBpm,
    complexity: preview.ready ? preview.complexity : composition.complexity,
    cycle: composition.cycle,
    tuning: params.tuningMode,
    arrangement: params.arrangementMode,
    formMode: params.formMode,
    evolution: params.evolutionDepth,
    tempoFollow: params.tempoFollow,
    status,
  };
}
