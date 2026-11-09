import type { MutableRefObject } from "react";
import {
  GAME_WIDTH,
  KAMMERTON_KEYS,
} from "../domain/instrumentData";
import type { AppNexusParams } from "./nexusParamsInitialState";
import type { AppResonanceManualGridActionPorts } from "./appResonanceManualGridActionPorts";
import { buildKeyboardGridFrequencies, clamp, freqFromY, yFromFreq } from "./resonanceRuntimeMath";
import type { ResonanceNexusRuntimeRefs } from "./resonanceNexusRuntimeRefs";

export const RESONANCE_NEXUS_OVERLAY_FRAME_CONTRACT = {
  ownsGridLineRuntimeMutation: true,
  ownsNoAudioNodes: true,
  ownsNoRafLifecycle: true,
  ownsNoReactLifecycle: true,
  preservesGridLineMutationOrder: true,
} as const;

export type ResonanceNexusOverlayFrameArgs = {
  ctx: CanvasRenderingContext2D;
  state: ResonanceNexusRuntimeRefs;
  params: AppNexusParams;
  t: number;
  readonly focusCursorRef: MutableRefObject<{ x: number; y: number }>;
  readonly getVisibleGridLines: AppResonanceManualGridActionPorts["getVisibleGridLines"];
  readonly activeGridLineFreqRef: MutableRefObject<number | null>;
  readonly activeGridLineSinceRef: MutableRefObject<number>;
  readonly previousGridLineFreqRef: MutableRefObject<number | null>;
  readonly previousGridLineAtRef: MutableRefObject<number>;
  readonly keyboardWindowOffsetRef: MutableRefObject<number>;
};

export function runResonanceNexusOverlayFrame(args: ResonanceNexusOverlayFrameArgs): void {
  const {
    ctx: c,
    state,
    params: p,
    t,
    focusCursorRef,
    getVisibleGridLines,
    activeGridLineFreqRef,
    activeGridLineSinceRef,
    previousGridLineFreqRef,
    previousGridLineAtRef,
    keyboardWindowOffsetRef,
  } = args;

  const focusCursor = focusCursorRef.current;
  const tetherDx = focusCursor.x - state.cursorX;
  const tetherDy = focusCursor.y - state.cursorY;
  const tetherDist = Math.hypot(tetherDx, tetherDy);

  const aura = c.createRadialGradient(state.cursorX, state.cursorY, 0, state.cursorX, state.cursorY, 120);
  aura.addColorStop(0, "rgba(220, 180, 255, 0.15)");
  aura.addColorStop(1, "rgba(220, 180, 255, 0)");
  c.fillStyle = aura;
  c.beginPath();
  c.arc(state.cursorX, state.cursorY, 120, 0, Math.PI * 2);
  c.fill();

  if (tetherDist > 2.5) {
    c.save();
    c.strokeStyle = `rgba(150, 210, 255, ${clamp(0.14 + tetherDist / 180, 0.16, 0.34)})`;
    c.lineWidth = 1;
    c.setLineDash([4, 4]);
    c.beginPath();
    c.moveTo(focusCursor.x, focusCursor.y);
    c.lineTo(state.cursorX, state.cursorY);
    c.stroke();
    c.restore();
  }

  c.save();
  c.strokeStyle = tetherDist > 2.5 ? "rgba(140, 220, 255, 0.9)" : "rgba(200, 220, 255, 0.62)";
  c.lineWidth = 1;
  c.beginPath();
  c.moveTo(focusCursor.x - 9, focusCursor.y);
  c.lineTo(focusCursor.x + 9, focusCursor.y);
  c.moveTo(focusCursor.x, focusCursor.y - 9);
  c.lineTo(focusCursor.x, focusCursor.y + 9);
  c.stroke();
  c.beginPath();
  c.arc(focusCursor.x, focusCursor.y, 2.2, 0, Math.PI * 2);
  c.fillStyle = tetherDist > 2.5 ? "rgba(188, 238, 255, 0.95)" : "rgba(228, 236, 255, 0.72)";
  c.fill();
  c.restore();

  c.fillStyle = "rgba(255, 255, 255, 0.9)";
  c.beginPath();
  c.arc(state.cursorX, state.cursorY, 4 + Math.sin(t * 5) * 1.5, 0, Math.PI * 2);
  c.fill();

  if (!p.gridOn) return;

  c.fillStyle = "rgba(255, 255, 255, 0.35)";
  c.font = "10px monospace";
  c.textAlign = "left";

  const lines = getVisibleGridLines();
  const nowMs = performance.now();

  if (p.lockCursorToGrid) {
    const cursorFreq = freqFromY(state.cursorY);
    const cursorY = yFromFreq(cursorFreq);

    let nearestLineFreq: number | null = null;
    let nearestDist = Number.POSITIVE_INFINITY;
    for (const line of lines) {
      const y = yFromFreq(line.freq);
      const dist = Math.abs(y - cursorY);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearestLineFreq = line.freq;
      }
    }

    if (nearestLineFreq !== null) {
      const prev = activeGridLineFreqRef.current;
      if (prev === null || Math.abs(prev - nearestLineFreq) > 0.001) {
        if (prev !== null) {
          previousGridLineFreqRef.current = prev;
          previousGridLineAtRef.current = nowMs;
        }
        activeGridLineFreqRef.current = nearestLineFreq;
        activeGridLineSinceRef.current = nowMs;
      }
    }
  } else {
    if (activeGridLineFreqRef.current !== null) {
      previousGridLineFreqRef.current = activeGridLineFreqRef.current;
      previousGridLineAtRef.current = nowMs;
    }
    activeGridLineFreqRef.current = null;
    activeGridLineSinceRef.current = 0;
  }

  const activeFreq = activeGridLineFreqRef.current;
  const activeAt = activeGridLineSinceRef.current;
  const previousFreq = previousGridLineFreqRef.current;
  const previousAt = previousGridLineAtRef.current;
  const activeY = activeFreq !== null ? yFromFreq(activeFreq) : null;
  const activeProgress = activeAt > 0 ? clamp((nowMs - activeAt) / 1000, 0, 1) : 0;
  const previousY = previousFreq !== null ? yFromFreq(previousFreq) : null;
  const previousProgress = previousAt > 0 ? clamp(1 - (nowMs - previousAt) / 650, 0, 1) : 0;
  const cursorXNorm = clamp(state.cursorX / GAME_WIDTH, 0, 1);
  const pulse = 0.92 + 0.08 * (0.5 + 0.5 * Math.sin(nowMs * 0.007));
  const keyboardGridDesc = buildKeyboardGridFrequencies(
    p.gridBase,
    p.gridTuning,
    p.manualGridMutedSteps,
    p.manualGridStepOffsets,
  );
  const keyboardWindowStart = Math.max(0, Math.min(Math.round(keyboardWindowOffsetRef.current), Math.max(0, keyboardGridDesc.length - 1)));
  const keyboardWindowEnd = Math.max(keyboardWindowStart, Math.min(keyboardGridDesc.length - 1, keyboardWindowStart + KAMMERTON_KEYS.length - 1));
  const keyboardWindowFreqs = keyboardGridDesc.slice(keyboardWindowStart, keyboardWindowEnd + 1);
  const isLineInKeyboardWindow = (freq: number) => keyboardWindowFreqs.some((target) => Math.abs(target - freq) < 0.12);
  lines.forEach((line) => {
    const y = yFromFreq(line.freq);
    c.beginPath();
    c.moveTo(0, y);
    c.lineTo(GAME_WIDTH, y);
    const isMuted = line.manualMuted || line.modeMuted;
    const isPlayedLine = p.lockCursorToGrid && activeY !== null && Math.abs(y - activeY) <= 1.4;
    const isAfterGlowLine = !isPlayedLine && previousY !== null && previousProgress > 0 && Math.abs(y - previousY) <= 1.4;
    if (isMuted) {
      c.strokeStyle = "rgba(255, 255, 255, 0.03)";
    } else if (isPlayedLine) {
      const blend = activeProgress * pulse;
      const bright = `rgba(78, 164, 98, ${0.68 * blend})`;
      const base = `rgba(42, 88, 58, ${0.16 + 0.34 * blend})`;
      const grad = c.createLinearGradient(0, y, GAME_WIDTH, y);
      const l = clamp(cursorXNorm - 0.16, 0, 1);
      const r = clamp(cursorXNorm + 0.16, 0, 1);
      grad.addColorStop(0, base);
      grad.addColorStop(l, base);
      grad.addColorStop(cursorXNorm, bright);
      grad.addColorStop(r, base);
      grad.addColorStop(1, base);
      c.strokeStyle = grad;
    } else if (isAfterGlowLine) {
      const alpha = 0.05 + 0.18 * previousProgress;
      c.strokeStyle = `rgba(48, 104, 66, ${alpha})`;
    } else {
      c.strokeStyle = "rgba(255, 255, 255, 0.12)";
    }
    c.stroke();

    const inKeyboardWindow = isLineInKeyboardWindow(line.freq);
    c.fillStyle = isMuted
      ? (inKeyboardWindow ? "rgba(255, 196, 196, 0.22)" : "rgba(255, 160, 160, 0.1)")
      : (inKeyboardWindow ? "rgba(235, 245, 255, 0.48)" : "rgba(255, 255, 255, 0.24)");
    c.fillText(line.label, 20, y - 4);

    if (line.stepIndex !== undefined) {
      c.beginPath();
      c.moveTo(15, y);
      c.lineTo(0, y - 5);
      c.lineTo(0, y + 5);
      c.closePath();
      if (isMuted) {
        c.fillStyle = inKeyboardWindow ? "rgba(255, 110, 110, 0.42)" : "rgba(110, 44, 44, 0.32)";
      } else if (isPlayedLine) {
        c.fillStyle = "rgba(78, 164, 98, 0.92)";
      } else if (inKeyboardWindow) {
        c.fillStyle = "rgba(132, 200, 255, 0.96)";
      } else {
        c.fillStyle = "rgba(86, 126, 168, 0.38)";
      }
      c.fill();
    }
  });
}
