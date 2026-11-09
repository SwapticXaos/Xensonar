import type { WaveDecayPreset } from "../xensonar/domain/instrumentData";
import type { SemanticNode } from "../xensonar/domain/runtimeTypes";
import { waveIntensityScalar } from "../xensonar/helpers";
import type { InstallationFieldConfig } from "./installationFieldConfig";
import { mapFieldPoint } from "./installationFieldMapping";
import { crossedExpandingShell, crossingT, getPulseCenterAngle, normalizeAngleDelta } from "./waveCollisionGeometry";

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

type Vec2 = { x: number; y: number };
type RippleLike = { x: number; y: number; radius: number; prevRadius?: number; maxRadius: number; decay: WaveDecayPreset };
type SectorPulseLike = { x: number; y: number; radius: number; prevRadius?: number; maxRadius: number; decay: WaveDecayPreset; direction: "left" | "right" | "up" | "down" };

export type ResidentFieldNode = {
  node: SemanticNode;
  x: number;
  y: number;
  id: string;
};

export type ResidentFieldFrame = {
  active: boolean;
  residents: ResidentFieldNode[];
  nodeCount: number;
  mappedCount: number;
};

export type ResidentFieldWaveCollisionEvent = {
  targetKind: "resident";
  sourceKind: "ripple" | "sector";
  targetId: string;
  freq: number;
  amp: number;
  x: number;
  y: number;
  waveGain: number;
  occurredAtMs: number;
  soundSelectionId?: string;
  elasticPitchEnabled?: boolean;
};

const lastResidentWaveTrigger = new WeakMap<SemanticNode, number>();
const SHELL_TOLERANCE = 8;

export function buildResidentFieldFrame(args: {
  active: boolean;
  config: InstallationFieldConfig;
  nodes: SemanticNode[];
  oscillatorBall: Vec2 | null;
  sourceWidth: number;
  sourceHeight: number;
  targetWidth: number;
  targetHeight: number;
}): ResidentFieldFrame {
  const { active, config, nodes, oscillatorBall, sourceWidth, sourceHeight, targetWidth, targetHeight } = args;

  nodes.forEach((node) => {
    node.energy = Math.max(0, (node.energy ?? 0) * 0.965 - 0.0035);
  });

  if (!active) return { active: false, residents: [], nodeCount: nodes.length, mappedCount: 0 };

  const residents: ResidentFieldNode[] = [];
  nodes.forEach((node) => {
    if (node.residentMuted) return;
    const mappedNode = mapFieldPoint(node, sourceWidth, sourceHeight, targetWidth, targetHeight);
    residents.push({ node, x: mappedNode.x, y: mappedNode.y, id: node.residentId ?? node.label });
  });

  if (config.residentBallCoupling.oscillatorBall && oscillatorBall) {
    residents.forEach((resident) => {
      const dx = oscillatorBall.x - resident.x;
      const dy = oscillatorBall.y - resident.y;
      const dist = Math.hypot(dx, dy);
      const proximity = clamp(1 - dist / 92, 0, 1);
      if (proximity <= 0.04) return;
      resident.node.energy = Math.max(resident.node.energy, 0.12 + proximity * 0.8);
    });
  }

  return { active: true, residents, nodeCount: nodes.length, mappedCount: residents.length };
}

export function collectResidentFieldWaveCollisionEvents(args: {
  frame: ResidentFieldFrame;
  active: boolean;
  config: InstallationFieldConfig;
  ripples: RippleLike[];
  sectorPulses: SectorPulseLike[];
  nowMs: number;
  targetFreq: number;
}): ResidentFieldWaveCollisionEvent[] {
  const { frame, active, config, ripples, sectorPulses, nowMs, targetFreq } = args;
  if (!active || !frame.active || !config.residentWaveExcitation.sonarWaves) return [];
  if (frame.residents.length === 0 || (ripples.length === 0 && sectorPulses.length === 0)) return [];

  const events: ResidentFieldWaveCollisionEvent[] = [];

  frame.residents.forEach((resident) => {
    const node = resident.node;
    const lastTrigger = lastResidentWaveTrigger.get(node) ?? -Infinity;

    for (const ripple of ripples) {
      const dx = resident.x - ripple.x;
      const dy = resident.y - ripple.y;
      const dist = Math.hypot(dx, dy);
      const prevRadius = ripple.prevRadius ?? Math.max(0, ripple.radius - 6);
      if (!crossedExpandingShell(dist, prevRadius, ripple.radius, SHELL_TOLERANCE)) continue;
      if (nowMs - lastTrigger < 120) continue;
      const hitT = crossingT(dist, prevRadius, ripple.radius);
      const waveProgress = ripple.maxRadius > 0 ? ((prevRadius + (ripple.radius - prevRadius) * hitT) / ripple.maxRadius) : 0;
      const waveGain = waveIntensityScalar(waveProgress, ripple.decay);
      lastResidentWaveTrigger.set(node, nowMs);
      node.energy = Math.max(node.energy, 0.24 + waveGain * 0.7);
      events.push({
        targetKind: "resident",
        sourceKind: "ripple",
        targetId: resident.id,
        freq: clamp(targetFreq * Math.max(0.125, node.freq / Math.max(1, targetFreq)), 80, 2400),
        amp: clamp(0.05 + waveGain * 0.17, 0.04, 0.24),
        x: resident.x,
        y: resident.y,
        waveGain,
        occurredAtMs: nowMs - (1 - hitT) * 16,
        soundSelectionId: node.isCustomResident ? node.customResidentSound : undefined,
        elasticPitchEnabled: node.isCustomResident ? !!node.customResidentElasticPitch : !!config.residentElasticPitch,
      });
      return;
    }

    for (const pulse of sectorPulses) {
      const prevTrigger = lastResidentWaveTrigger.get(node) ?? -Infinity;
      if (nowMs - prevTrigger < 110) break;
      const dx = resident.x - pulse.x;
      const dy = resident.y - pulse.y;
      const dist = Math.hypot(dx, dy);
      const prevRadius = pulse.prevRadius ?? Math.max(0, pulse.radius - 6);
      if (!crossedExpandingShell(dist, prevRadius, pulse.radius, SHELL_TOLERANCE)) continue;

      const centerAngle = getPulseCenterAngle(pulse.direction);
      const halfSector = Math.PI / 4;
      const angle = Math.atan2(dy, dx);
      const delta = normalizeAngleDelta(angle, centerAngle);
      if (Math.abs(delta) > halfSector) continue;

      const hitT = crossingT(dist, prevRadius, pulse.radius);
      const waveProgress = pulse.maxRadius > 0 ? ((prevRadius + (pulse.radius - prevRadius) * hitT) / pulse.maxRadius) : 0;
      const waveGain = waveIntensityScalar(waveProgress, pulse.decay);
      lastResidentWaveTrigger.set(node, nowMs);
      node.energy = Math.max(node.energy, 0.24 + waveGain * 0.78);
      events.push({
        targetKind: "resident",
        sourceKind: "sector",
        targetId: resident.id,
        freq: clamp(targetFreq * Math.max(0.125, node.freq / Math.max(1, targetFreq)), 80, 2400),
        amp: clamp((0.06 + 0.15 * (1 - Math.abs(delta) / halfSector)) * Math.max(0.4, waveGain), 0.04, 0.23),
        x: resident.x,
        y: resident.y,
        waveGain,
        occurredAtMs: nowMs - (1 - hitT) * 16,
        soundSelectionId: node.isCustomResident ? node.customResidentSound : undefined,
        elasticPitchEnabled: node.isCustomResident ? !!node.customResidentElasticPitch : !!config.residentElasticPitch,
      });
      break;
    }
  });

  return events;
}
