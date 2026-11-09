/**
 * Platformer simulation tick: physics, composer obstacles, audio sync, HUD updates.
 * Extracted from JumpRunSoundtrackRoom to keep room file under 700 LOC (vision §6).
 */

import { clamp } from "../../shared/tuning/grid";
import {
arePlatformerGatePedestalsSolved,
getNextPlatformerPuzzlePedestal,
resetPlatformerGatePedestals,
type PlatformerPuzzleToken,
} from "./platformerAdventure";
import type {
PlatformerArrangementForm,
PlatformerArrangementMode,
PlatformerTuningMode,
} from "./platformerArrangement";
import {
platformerPitchToFreq,
type MusicState,
type PlatformerAudioApi,
} from "./platformerAudio";
import type { PlatformerComposerPreview } from "./platformerComposerPreview";
import type { PlatformerHudState } from "./platformerHudHelpers";
import { buildPlatformerNpcFieldState } from "./platformerNpcField";
import {
createPlatformerNpcOrb,
getPlatformerNpcIntent,
getPlatformerNpcThrowDirection,
relaunchPlatformerNpcOrb,
tickPlatformerNpcOrb,
} from "./platformerNpcMusic";
import { type PlatformerSectionBias } from "./platformerSectionBias";
import {
isPlatformActiveForRoute,
PLAYER_H,
PLAYER_W,
VIEW_H,
VIEW_W,
WORLD_W,
type Platform,
type SimState,
} from "./platformerState";
import { processComposerObstacleCollisions } from "./platformerTickComposer";
import {
getNearbyNpc,
getPlatformerActionDrive,
isPlayerTouchingPuzzlePedestal,
orbBounceVelocity
} from "./platformerTickHelpers";
import { buildPlatformerHudStateFromTick } from "./platformerTickHud";
import { applyPlatformerPlayerPhysics } from "./platformerTickPhysics";

export type PlatformerTickContext = {
  simRef: { current: SimState };
  apiRef: { current: PlatformerAudioApi | null };
  musicRef: { current: MusicState };
  platforms: Platform[];
  bpm: number;
  composerOn: boolean;
  tuningMode: PlatformerTuningMode;
  arrangementMode: PlatformerArrangementMode;
  formMode: PlatformerArrangementForm;
  sectionBias: PlatformerSectionBias;
  evolutionDepth: number;
  tempoFollow: number;
  onHudUpdate: (hud: PlatformerHudState) => void;
  onComposerPreview: (preview: PlatformerComposerPreview) => void;
};

const ORB_RADIUS = 9;
const PUZZLE_TOKEN_WINDOW = 2.4;
const PUZZLE_TOUCH_COOLDOWN = 0.45;

export function tickPlatformer(dt: number, ctx: PlatformerTickContext): void {
  const api = ctx.apiRef.current;
  if (!api) return;
  const s = ctx.simRef.current;
  s.t += dt;

  const player = s.player;
  const markProgress = (x = player.x) => {
    s.lastProgressAt = s.t;
    s.lastProgressX = Math.max(s.lastProgressX, x);
  };
  if (!s.win) {
    const activePlatforms = ctx.platforms.filter((platform) =>
      isPlatformActiveForRoute(platform, s.routeSelections),
    );
    const closedGates = s.resonanceGates.filter((gate) => !gate.open);
    const npcFieldBeforePhysics = buildPlatformerNpcFieldState({
      playerX: player.x + PLAYER_W * 0.5,
      playerY: player.y + PLAYER_H * 0.5,
      playerVx: player.vx,
      playerOnGround: player.onGround,
      t: s.t,
      lastProgressAt: s.lastProgressAt,
      lastMelodyToken: s.lastMelodyToken,
      routeSelections: s.routeSelections,
      platforms: ctx.platforms,
      musicNpcs: s.musicNpcs,
      puzzlePedestals: s.puzzlePedestals,
      resonanceGates: s.resonanceGates,
    });
    const activeCollisionPlatforms = [...activePlatforms, ...npcFieldBeforePhysics.manifestPlatforms];

    const physicsResult = applyPlatformerPlayerPhysics({
      player,
      activeCollisionPlatforms,
      closedGates,
      npcField: npcFieldBeforePhysics,
      routeSelections: s.routeSelections,
      dt,
      keys: s.keys,
      lastProgressX: s.lastProgressX,
      markProgress,
    });

    api.captureMovementFrame(player.x, player.y, player.vx, player.vy, player.onGround, s.t);
    if (physicsResult.didJump) api.playJumpCue();
    if (player.onGround) {
      if (!player.wasGrounded) {
        const impact = clamp(Math.abs(physicsResult.landingImpactVy) / 860, 0.2, 1);
        api.playLandCue(impact);
      }
      if (physicsResult.landedKind === "bounce") {
        api.playVoice(210, "triangle", 0.1, 0.12);
        api.pushPhrase(5);
      }
    }
    if (player.onGround && Math.abs(player.vx) > 40) {
      player.stepTravel += Math.abs(player.vx) * dt;
      const threshold = clamp(120 - Math.abs(player.vx) * 0.12, 56, 120);
      if (player.stepTravel >= threshold) {
        player.stepTravel = 0;
        api.playStepCue(player.x, Math.abs(player.vx));
      }
    }

    const solvedPedestalsBeforeNpc = s.puzzlePedestals.filter((pedestal) => pedestal.activated).length;
    const openGatesBeforeNpc = s.resonanceGates.filter((gate) => gate.open).length;
    const recentActionEventsForNpc = ctx.musicRef.current.movementEvents.filter(
      (event) => event.kind !== "motion" && s.t - event.t < 2.2,
    );
    const recentMirrorEventsForNpc = ctx.musicRef.current.movementEvents.filter(
      (event) => s.t - event.t < 3.4,
    );
    const npcActionDrive = getPlatformerActionDrive(
      player.vx,
      player.onGround,
      recentActionEventsForNpc.length,
      solvedPedestalsBeforeNpc,
      openGatesBeforeNpc,
    );
    const stuckTime = clamp(s.t - s.lastProgressAt, 0, 12);
    const orbSpawnMin = s.cameraX - 140;
    const orbSpawnMax = s.cameraX + VIEW_W + 180;
    for (const npc of s.musicNpcs) {
      const intent = getPlatformerNpcIntent(npc, {
        playerX: player.x + PLAYER_W * 0.5,
        playerVx: player.vx,
        actionDrive: npcActionDrive,
        stuckTime,
        solvedPedestals: solvedPedestalsBeforeNpc,
        gatesOpen: openGatesBeforeNpc,
        lives: s.lives,
        lastMelodyToken: s.lastMelodyToken,
        recentEvents: recentMirrorEventsForNpc,
        lastLevelMemory: ctx.musicRef.current.lastLevelMemory ?? null,
      });
      if (npc.disposition !== intent.disposition) {
        npc.lastDispositionShiftAt = s.t;
      }
      npc.disposition = intent.disposition;
      npc.tarotCard = intent.tarotCard;
      npc.tarotTitle = intent.tarotTitle;
      npc.tarotOrientation = intent.tarotOrientation;
      npc.modernRole = intent.modernRole;
      npc.giftLabel = intent.giftLabel;
      npc.shadowLabel = intent.shadowLabel;
      npc.lessonLabel = intent.lessonLabel;
      npc.moodLabel = intent.moodLabel;
      npc.mirrorFacet = intent.mirrorFacet;
      npc.mirrorLabel = intent.mirrorLabel;
      npc.loomDraftId = intent.loomDraftId;
      npc.loomDraftLabel = intent.loomDraftLabel;
      npc.loomReverseLabel = intent.loomReverseLabel;
      npc.loomActiveLabel = intent.loomActiveLabel;
      npc.loomVerbLabel = intent.loomVerbLabel;
      npc.draftMotif = intent.draftMotif;
      npc.memoryEchoLabel = intent.memoryEchoLabel;
      npc.memoryEchoSemi = intent.memoryEchoSemi;
      npc.phase += dt * (0.7 + npc.throwInterval * 0.2) * (intent.disposition === "trickster" ? 1.08 : intent.disposition === "guide" ? 0.94 : 1);
      npc.throwDirection = getPlatformerNpcThrowDirection(
        npc,
        intent.disposition,
        player.x + PLAYER_W * 0.5,
        player.vx,
      );
      const effectiveInterval = npc.throwInterval * intent.intervalScale;
      if (npc.x < orbSpawnMin || npc.x > orbSpawnMax) continue;
      if (s.t - npc.lastThrowAt < effectiveInterval) continue;
      npc.lastThrowAt = s.t;
      const orb = createPlatformerNpcOrb(npc, s.nextNpcOrbId, intent);
      npc.orbCursor += 1;
      s.nextNpcOrbId += 1;
      s.noteOrbs.push(orb);
    }

    const liveOrbs = [];
    for (const orb of s.noteOrbs) {
      const prevX = orb.x;
      const prevY = orb.y;
      tickPlatformerNpcOrb(orb, dt);
      if (orb.life <= 0 || orb.x < -120 || orb.x > WORLD_W + 120) {
        continue;
      }

      if (orb.vy > 0) {
        for (const platform of activeCollisionPlatforms) {
          const minX = Math.min(prevX, orb.x) - ORB_RADIUS;
          const maxX = Math.max(prevX, orb.x) + ORB_RADIUS;
          if (maxX <= platform.x + 4 || minX >= platform.x + platform.w - 4) continue;
          const prevBottom = prevY + ORB_RADIUS;
          const nextBottom = orb.y + ORB_RADIUS;
          if (prevBottom > platform.y + 6 || nextBottom < platform.y) continue;
          orb.y = platform.y - ORB_RADIUS;
          orb.vy = orbBounceVelocity(orb.throwStyle, orb.vy);
          orb.vx *= orb.throwStyle === "skip" ? 0.94 : 0.98;
          break;
        }
      }

      if (orb.y > VIEW_H + 120) {
        const sourceNpc = s.musicNpcs.find((npc) => npc.id === orb.npcId);
        if (!sourceNpc) {
          continue;
        }
        relaunchPlatformerNpcOrb(orb, sourceNpc, player.x + PLAYER_W * 0.5);
      }
      if (npcFieldBeforePhysics.noteMagnetism > 0) {
        const targetX = player.x + PLAYER_W * 0.5;
        const targetY = player.y + PLAYER_H * 0.4;
        const dx = targetX - orb.x;
        const dy = targetY - orb.y;
        const dist = Math.hypot(dx, dy);
        if (dist > 0.001 && dist < 220) {
          const pull = npcFieldBeforePhysics.noteMagnetism * 54 * dt;
          orb.x += (dx / dist) * pull;
          orb.y += (dy / dist) * pull * 0.8;
        }
      }
      liveOrbs.push(orb);
    }
    s.noteOrbs = liveOrbs;

    const pickupRadius = 22 + npcFieldBeforePhysics.pickupRadiusBonus;
    for (const coin of s.coins) {
      if (coin.taken) continue;
      const cx = player.x + PLAYER_W * 0.5;
      const cy = player.y + PLAYER_H * 0.45;
      const d = Math.hypot(cx - coin.x, cy - coin.y);
      if (d < pickupRadius) {
        coin.taken = true;
        s.collected += 1;
        if (coin.kind === "mushroom") {
          const nextModeShift = (s.modeShift + 1) % 7;
          s.score += 18;
          api.playCoinCue(coin, s.modeShift, nextModeShift);
          s.modeShift = nextModeShift;
          s.lastMelodyToken = "mode";
          s.lastMelodyTokenAt = s.t;
        } else {
          s.score += 12;
          api.playCoinCue(coin, s.modeShift);
          s.lastMelodyToken = coin.kind === "coin_red" ? "major" : "minor";
          s.lastMelodyTokenAt = s.t;
        }
        markProgress(coin.x);
      }
    }

    const remainingOrbs = [];
    const orbPickupRadius = 20 + npcFieldBeforePhysics.pickupRadiusBonus;
    for (const orb of s.noteOrbs) {
      const cx = player.x + PLAYER_W * 0.5;
      const cy = player.y + PLAYER_H * 0.45;
      const d = Math.hypot(cx - orb.x, cy - orb.y);
      if (d < orbPickupRadius) {
        s.score += 10;
        api.playNpcOrbCue(orb, s.modeShift);
        s.lastMelodyToken = "npc";
        s.lastMelodyTokenAt = s.t;
        markProgress(orb.x);
        continue;
      }
      remainingOrbs.push(orb);
    }
    s.noteOrbs = remainingOrbs;

    const recentPuzzleToken: PlatformerPuzzleToken | null =
      s.lastMelodyToken && s.t - s.lastMelodyTokenAt <= PUZZLE_TOKEN_WINDOW + npcFieldBeforePhysics.puzzleTokenWindowBonus
        ? s.lastMelodyToken
        : null;
    const effectivePuzzleToken: PlatformerPuzzleToken | null =
      recentPuzzleToken ?? npcFieldBeforePhysics.echoPuzzleToken;
    for (const gate of s.resonanceGates) {
      if (gate.open) continue;
      const nextPedestal = getNextPlatformerPuzzlePedestal(s.puzzlePedestals, gate.id);
      if (!nextPedestal) continue;
      const touching = isPlayerTouchingPuzzlePedestal(
        player.x,
        player.y,
        nextPedestal.x,
        nextPedestal.y,
        npcFieldBeforePhysics.pedestalTouchBonus,
      );
      if (!touching || s.t - nextPedestal.lastTouchedAt < PUZZLE_TOUCH_COOLDOWN) continue;
      nextPedestal.lastTouchedAt = s.t;
      const shadowPuzzleToken =
        npcFieldBeforePhysics.focusPedestalId === nextPedestal.id
          ? npcFieldBeforePhysics.shadowPuzzleToken
          : null;
      const shadowSolve = recentPuzzleToken != null && shadowPuzzleToken === recentPuzzleToken;
      if (effectivePuzzleToken == null && !shadowSolve) continue;
      if (effectivePuzzleToken === nextPedestal.target || shadowSolve) {
        nextPedestal.activated = true;
        s.score += 26;
        api.playPuzzleStepCue(nextPedestal.target, nextPedestal.order + 1, true);
        markProgress(nextPedestal.x);
        if (arePlatformerGatePedestalsSolved(s.puzzlePedestals, gate.id)) {
          gate.open = true;
          s.score += 54;
          api.playGateUnlockCue(gate.label);
          markProgress(gate.x);
        }
      } else {
        resetPlatformerGatePedestals(s.puzzlePedestals, gate.id);
        api.playPuzzleStepCue(nextPedestal.target, nextPedestal.order + 1, false);
      }
    }

    processComposerObstacleCollisions(s, api, player);

    const milestone = Math.floor(player.x / 680);
    if (milestone > s.lastMilestone) {
      s.lastMilestone = milestone;
      s.checkpointX = player.x;
      s.checkpointY = Math.max(120, player.y);
      api.playCheckpointChord(milestone);
      markProgress(player.x);
    }

    if (player.y > VIEW_H + 220) {
      s.lives -= 1;
      api.playFallCue();
      if (s.lives <= 0) {
        s.win = true;
        s.lives = 0;
      }
      player.x = clamp(s.checkpointX, 50, WORLD_W - PLAYER_W - 50);
      player.y = clamp(s.checkpointY, 120, VIEW_H - 140);
      player.vx = 0;
      player.vy = 0;
    }

    if (player.x >= WORLD_W - 100) {
      s.win = true;
      s.score += 200;
      player.vx = 0;
      player.vy = 0;
      player.jumpQueued = false;
      api.armCompletionLoop();
      const nowAudio = ctx.musicRef.current.ctx?.currentTime;
      if (nowAudio) {
        [0, 4, 7, 12].forEach((semi, i) => {
          api.playVoice(
            platformerPitchToFreq(132, semi, ctx.tuningMode),
            "triangle",
            0.12,
            0.5,
            nowAudio + i * 0.08,
          );
        });
      }
    }
  } else {
    player.vx = 0;
    player.vy = 0;
    player.jumpQueued = false;
  }

  s.cameraX = clamp(player.x - VIEW_W * 0.35, 0, WORLD_W - VIEW_W);

  const m = ctx.musicRef.current;
  const ctxAudio = m.ctx;
  const recentActionEvents = m.movementEvents.filter(
    (event) => event.kind !== "motion" && s.t - event.t < 2.2,
  );
  const solvedPedestals = s.puzzlePedestals.filter((pedestal) => pedestal.activated).length;
  const openGateCount = s.resonanceGates.filter((gate) => gate.open).length;
  const npcFieldForHud = buildPlatformerNpcFieldState({
    playerX: player.x + PLAYER_W * 0.5,
    playerY: player.y + PLAYER_H * 0.5,
    playerVx: player.vx,
    playerOnGround: player.onGround,
    t: s.t,
    lastProgressAt: s.lastProgressAt,
    lastMelodyToken: s.lastMelodyToken,
    routeSelections: s.routeSelections,
    platforms: ctx.platforms,
    musicNpcs: s.musicNpcs,
    puzzlePedestals: s.puzzlePedestals,
    resonanceGates: s.resonanceGates,
  });
  const actionDrive = getPlatformerActionDrive(
    s.player.vx,
    s.player.onGround,
    recentActionEvents.length,
    solvedPedestals,
    openGateCount,
  ) + npcFieldForHud.actionDriveBias;
  const clampedActionDrive = clamp(actionDrive, 0, 1);
  const nearbyNpc = getNearbyNpc(s.musicNpcs, player.x + PLAYER_W * 0.5, 320);
  if (ctxAudio && s.win) {
    api.scheduleCompletionLoop(ctx.bpm);
  } else if (ctxAudio && ctx.composerOn) {
    const beatDur = (60 / clamp(ctx.bpm, 50, 200) / 2) * (1 - clampedActionDrive * 0.16);
    if (m.nextComposerAt <= 0) {
      m.nextComposerAt = ctxAudio.currentTime + beatDur;
    }

    while (m.nextComposerAt <= ctxAudio.currentTime + 0.12) {
      const phrase = m.phrase.length > 0 ? m.phrase : (m.lastLevelMemory?.phrase ?? []);
      if (phrase.length > 0) {
        const note = phrase[m.composerStep % phrase.length];
        const draftMotif = nearbyNpc?.draftMotif?.length
          ? nearbyNpc.draftMotif
          : (m.lastLevelMemory?.motif ?? []);
        const cadenceMotif = m.lastLevelMemory?.cadence ?? [];
        const leadWave: OscillatorType =
          nearbyNpc?.disposition === "trickster"
            ? "sawtooth"
            : nearbyNpc?.disposition === "mirror"
              ? "triangle"
              : "sine";
        const routeLift = (m.lastLevelMemory?.routeBias ?? 0) * 6;
        const root = 92 + (s.player.x / WORLD_W) * 52 + routeLift;
        const freq = platformerPitchToFreq(root, note, ctx.tuningMode);
        const vel = 0.04 + clamp(Math.abs(s.player.vx) / 500, 0, 0.08) + clampedActionDrive * 0.04;
        api.playVoice(
          freq,
          leadWave,
          vel,
          0.14,
          m.nextComposerAt,
          nearbyNpc?.tarotOrientation === "reversed" ? -8 : 0,
        );
        if (m.composerStep % 4 === 0) {
          api.playVoice(freq * 0.5, "triangle", 0.05 + clampedActionDrive * 0.025, 0.22, m.nextComposerAt);
        }
        if (draftMotif.length > 0 && (m.composerStep % 2 === 1 || m.phrase.length === 0)) {
          const echoSemi = note + (draftMotif[m.composerStep % draftMotif.length] ?? 0);
          api.playVoice(
            platformerPitchToFreq(root + 10, echoSemi, ctx.tuningMode),
            nearbyNpc?.disposition === "trickster" ? "square" : "triangle",
            0.018 + clampedActionDrive * 0.018 + (m.lastLevelMemory?.energy ?? 0) * 0.01,
            0.11,
            m.nextComposerAt + 0.02,
            (nearbyNpc?.memoryEchoSemi ?? 0) * 2,
          );
        }
        if (cadenceMotif.length > 0 && (m.composerStep % 4 === 2 || m.phrase.length === 0)) {
          const cadenceSemi = note + (cadenceMotif[m.composerStep % cadenceMotif.length] ?? 0);
          api.playVoice(
            platformerPitchToFreq(root - 16, cadenceSemi - 12, ctx.tuningMode),
            "sine",
            0.018 + (m.lastLevelMemory?.energy ?? 0) * 0.018,
            0.24,
            m.nextComposerAt,
          );
        }
        if (clampedActionDrive > 0.56 && m.composerStep % 3 === 1) {
          api.playVoice(freq * 2, "triangle", 0.022 + clampedActionDrive * 0.016, 0.08, m.nextComposerAt + 0.018);
        }
        m.composerStep += 1;
      }
      m.nextComposerAt += beatDur;
    }
  }

  s.uiClock += dt;
  if (s.uiClock > 0.1) {
    s.uiClock = 0;
    const preview = api.getComposerPreview(ctx.bpm);
    ctx.onComposerPreview(preview);
    const hudState = buildPlatformerHudStateFromTick({
      s,
      musicRef: ctx.musicRef,
      bpm: ctx.bpm,
      tuningMode: ctx.tuningMode,
      arrangementMode: ctx.arrangementMode,
      formMode: ctx.formMode,
      sectionBias: ctx.sectionBias,
      evolutionDepth: ctx.evolutionDepth,
      tempoFollow: ctx.tempoFollow,
      api,
      npcFieldForHud,
      solvedPedestals,
      clampedActionDrive,
      nearbyNpc,
      win: s.win,
    });
    ctx.onHudUpdate(hudState);
  }
}
