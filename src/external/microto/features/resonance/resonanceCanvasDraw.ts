/**
 * Resonance room canvas drawing. Pure render from current state; no simulation or audio.
 * Contract: only called from useResonanceSimulation, once per frame, after all state updates
 * (ripples, sectorPulses, agents). Read-only view of state; no mutation. See
 * docu/REFLECTION-related-functions-consistency-v1.md §6.
 */
import { BP_13TET_RATIOS, DRONE_MIN_FREQ, DRONE_MAX_FREQ } from "./config/constants";
import { JI_NODES } from "./config/overtones";
import type { DirectedPulse, NexusAgent, NexusRipple } from "../runtime/types";
import type { ResonanceWaveTelemetry } from "./resonanceWaveTelemetry";
import { createResonanceAgentVisualStyle, createResonanceCursorVisualStyle } from "./resonanceWaveVisualStyle";
import { drawResonanceWaveLayer } from "./resonanceCanvasDrawWaveLayer";
import { getCursorIntervalLabel } from "./cursorIntervalLabel";

/** Single point in the cursor pitch trail (visual path of recent cursor positions). */
export type CursorTrailPoint = { x: number; y: number };

export type ResonanceDrawState = {
  cursorX: number;
  cursorY: number;
  /** Recent cursor positions for pitch trail (oldest first). Only drawn when grid is on. */
  cursorTrail?: CursorTrailPoint[];
  ripples: NexusRipple[];
  sectorPulses: DirectedPulse[];
  agents: NexusAgent[];
  swarmCollapseUntil: number;
  waveTelemetry: ResonanceWaveTelemetry;
};

export type ResonanceDrawParams = {
  gridOn: boolean;
  gridBase: number;
  gridTuning: string;
};

export function drawResonanceFrame(
  c: CanvasRenderingContext2D,
  state: ResonanceDrawState,
  params: ResonanceDrawParams,
  gameWidth: number,
  gameHeight: number,
  t: number,
  frameNow: number,
  yFromDroneFreq: (f: number, height: number) => number,
  droneFreqFromY?: (y: number, height: number) => number,
): void {
  const { cursorX, cursorY, cursorTrail, ripples, sectorPulses, agents, swarmCollapseUntil, waveTelemetry } = state;
  const collapseActive = frameNow < swarmCollapseUntil;
  const cursorVisual = createResonanceCursorVisualStyle(waveTelemetry);

  // Background
  const bg = c.createRadialGradient(cursorX, cursorY, 0, gameWidth / 2, gameHeight / 2, gameWidth);
  bg.addColorStop(0, "#1a1525");
  bg.addColorStop(1, "#050508");
  c.fillStyle = bg;
  c.fillRect(0, 0, gameWidth, gameHeight);

  c.strokeStyle = "rgba(120, 90, 160, 0.06)";
  c.lineWidth = 2;
  for (let i = 0; i < 8; i++) {
    c.beginPath();
    for (let x = 0; x < gameWidth; x += 50) {
      const y = gameHeight / 2 + Math.sin(x * 0.005 + t + i) * 150 * Math.sin(t * 0.2 + i * 0.5);
      if (x === 0) c.moveTo(x, y);
      else c.lineTo(x, y);
    }
    c.stroke();
  }

  // Wave layer (ripples + sector pulses: strokes, impact markers, flashes, glyphs, trail shards)
  drawResonanceWaveLayer(c, ripples, sectorPulses, waveTelemetry, frameNow);

  // Cursor pitch trail (visual path of recent positions — vision §3 cursor-driven pitch field)
  if (params.gridOn && cursorTrail && cursorTrail.length > 1) {
    const trailLen = cursorTrail.length;
    for (let i = 0; i < trailLen - 1; i++) {
      const a = (i + 1) / trailLen;
      const alpha = 0.06 + a * 0.28;
      c.strokeStyle = `rgba(165, 180, 252, ${alpha})`;
      c.lineWidth = 2;
      c.beginPath();
      c.moveTo(cursorTrail[i].x, cursorTrail[i].y);
      c.lineTo(cursorTrail[i + 1].x, cursorTrail[i + 1].y);
      c.stroke();
    }
  }

  // Agents (trail, dot, label)
  agents.forEach((agent) => {
    if (agent.history.length > 1) {
      c.beginPath();
      c.moveTo(agent.history[0].x, agent.history[0].y);
      for (let i = 1; i < agent.history.length; i++) {
        c.lineTo(agent.history[i].x, agent.history[i].y);
      }
      c.strokeStyle = `rgba(160, 200, 255, ${0.15 + Math.sin(t * 2 + agent.phase) * 0.1})`;
      c.lineWidth = collapseActive ? 3.8 : 3;
      c.stroke();
    }

    const hitGlow = Math.max(0, 1 - (frameNow - agent.lastHit) * 0.002);
    const agentVisual = createResonanceAgentVisualStyle(waveTelemetry, hitGlow);
    c.fillStyle = agentVisual.haloFillStyle;
    c.beginPath();
    c.arc(agent.x, agent.y, agentVisual.haloRadius, 0, Math.PI * 2);
    c.fill();
    if (agentVisual.ringStrokeStyle) {
      c.strokeStyle = agentVisual.ringStrokeStyle;
      c.lineWidth = agentVisual.ringWidth;
      c.beginPath();
      c.arc(agent.x, agent.y, agentVisual.ringRadius, 0, Math.PI * 2);
      c.stroke();
    }

    c.fillStyle = agentVisual.dotFillStyle;
    c.beginPath();
    c.arc(agent.x, agent.y, 3.2 + hitGlow * 1.8, 0, Math.PI * 2);
    c.fill();

    c.fillStyle = agentVisual.labelFillStyle;
    c.font = "10px monospace";
    c.fillText(agent.label, agent.x + 8, agent.y + 4);
  });

  // Cursor aura and dot
  const aura = c.createRadialGradient(cursorX, cursorY, 0, cursorX, cursorY, cursorVisual.auraRadius);
  aura.addColorStop(0, cursorVisual.innerColor);
  aura.addColorStop(1, cursorVisual.outerColor);
  c.fillStyle = aura;
  c.beginPath();
  c.arc(cursorX, cursorY, cursorVisual.auraRadius, 0, Math.PI * 2);
  c.fill();

  c.fillStyle = cursorVisual.dotColor;
  c.beginPath();
  c.arc(cursorX, cursorY, cursorVisual.dotRadius + Math.sin(t * 5) * 1.5, 0, Math.PI * 2);
  c.fill();

  // Cursor interval label (harmonic feedback when grid is on — vision: first-class tuning)
  if (params.gridOn && droneFreqFromY) {
    const cursorFreq = droneFreqFromY(cursorY, gameHeight);
    const intervalLabel = getCursorIntervalLabel(params.gridBase, params.gridTuning, cursorFreq);
    if (intervalLabel) {
      c.save();
      c.font = "11px monospace";
      c.textAlign = "left";
      c.textBaseline = "middle";
      const metrics = c.measureText(intervalLabel);
      const pad = 4;
      const boxW = metrics.width + pad * 2;
      const boxH = 16;
      let labelX = cursorX + 14;
      if (labelX + boxW > gameWidth) labelX = cursorX - boxW - 14;
      if (labelX < pad) labelX = pad;
      const labelY = cursorY + 4;
      c.fillStyle = "rgba(10, 8, 18, 0.88)";
      c.fillRect(labelX - pad, labelY - boxH / 2, boxW, boxH);
      c.strokeStyle = "rgba(165, 180, 252, 0.5)";
      c.lineWidth = 1;
      c.strokeRect(labelX - pad, labelY - boxH / 2, boxW, boxH);
      c.fillStyle = "rgba(224, 231, 255, 0.95)";
      c.fillText(intervalLabel, labelX, labelY);
      c.restore();
    }
  }

  c.save();
  c.textAlign = "left";
  c.font = "11px monospace";
  const panelWidth = 196;
  const panelHeight = 78;
  const panelX = gameWidth - panelWidth - 12;
  const panelY = 12;
  c.fillStyle = "rgba(5, 5, 8, 0.76)";
  c.fillRect(panelX, panelY, panelWidth, panelHeight);
  c.strokeStyle = waveTelemetry.octaveBoostActive
    ? "rgba(251, 191, 36, 0.9)"
    : "rgba(125, 211, 252, 0.65)";
  c.lineWidth = 1.5;
  c.strokeRect(panelX, panelY, panelWidth, panelHeight);
  c.fillStyle = "rgba(229, 231, 235, 0.92)";
  c.fillText(`DRONE  ${waveTelemetry.droneWaveform.toUpperCase()}`, panelX + 10, panelY + 18);
  c.fillText(`WAVE   ${waveTelemetry.waveStartWaveform.toUpperCase()}`, panelX + 10, panelY + 34);
  const octaveLabel =
    waveTelemetry.octaveMode === "latched"
      ? "OCT+1 LATCH"
      : waveTelemetry.octaveMode === "hold"
        ? "OCT+1 HOLD"
        : "OCT BASE";
  c.fillStyle = waveTelemetry.octaveBoostActive
    ? "rgba(253, 224, 71, 0.96)"
    : "rgba(191, 219, 254, 0.82)";
  c.fillText(octaveLabel, panelX + 10, panelY + 50);
  const meterX = panelX + 10;
  const meterY = panelY + 60;
  const meterWidth = panelWidth - 20;
  c.fillStyle = "rgba(38, 38, 42, 0.9)";
  c.fillRect(meterX, meterY, meterWidth, 10);
  const driveWidth = meterWidth * Math.max(0, Math.min(1, waveTelemetry.driveLevel));
  const driveGradient = c.createLinearGradient(meterX, meterY, meterX + meterWidth, meterY);
  driveGradient.addColorStop(0, "rgba(96, 165, 250, 0.9)");
  driveGradient.addColorStop(1, "rgba(248, 113, 113, 0.96)");
  c.fillStyle = driveGradient;
  c.fillRect(meterX, meterY, driveWidth, 10);
  c.fillStyle = "rgba(229, 231, 235, 0.9)";
  c.fillText(`DRIVE x${waveTelemetry.driveGain.toFixed(2)}`, meterX, meterY + 24);
  c.restore();

  // Grid (JI / BP / EDO)
  if (params.gridOn) {
    c.strokeStyle = "rgba(255, 255, 255, 0.12)";
    c.fillStyle = "rgba(255, 255, 255, 0.35)";
    c.font = "10px monospace";
    c.textAlign = "left";

    const drawFreqLine = (f: number, label: string) => {
      if (f < DRONE_MIN_FREQ || f > DRONE_MAX_FREQ) return;
      const y = yFromDroneFreq(f, gameHeight);
      c.beginPath();
      c.moveTo(0, y);
      c.lineTo(gameWidth, y);
      c.stroke();
      c.fillText(label, 10, y - 4);
    };

    if (params.gridTuning === "ji") {
      [0.125, 0.25, 0.5, 1, 2].forEach((oct) => {
        JI_NODES.forEach((ji) => {
          const f = params.gridBase * oct * ji.ratio;
          drawFreqLine(f, `${ji.label} (${f.toFixed(1)}Hz)`);
        });
      });
    } else if (params.gridTuning === "bp") {
      const tritaveOffsets = [-4, -3, -2, -1, 0, 1, 2, 3, 4];
      tritaveOffsets.forEach((tri) => {
        BP_13TET_RATIOS.forEach((ratio, step) => {
          const f = params.gridBase * ratio * Math.pow(3, tri);
          drawFreqLine(f, `BP ${tri >= 0 ? "+" : ""}${tri}:${step} (${f.toFixed(1)}Hz)`);
        });
      });
    } else {
      const edo = parseInt(params.gridTuning.replace("edo", ""), 10);
      if (!Number.isNaN(edo)) {
        for (let k = -edo * 4; k <= edo * 2; k += 1) {
          const f = params.gridBase * Math.pow(2, k / edo);
          drawFreqLine(f, `${k > 0 ? "+" : ""}${k} (${f.toFixed(1)}Hz)`);
        }
      }
    }
  }
}
