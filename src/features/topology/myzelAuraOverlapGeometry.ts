import type { MyzelAuraOverlap, MyzelNodeSpatialConfig } from './myzelSpatialFieldTypes';
import { getMyzelPresetWitnessHue } from './myzelNodeSpatialConfig';
import {
  getPrimaryMyzelEffectFamily,
  resolveMyzelRelationCompatibility,
} from './myzelSpatialEffectMix';

type NodeSpatialConfigEntry = {
  id: string;
  label: string;
  x: number;
  y: number;
  energy: number;
  config: MyzelNodeSpatialConfig;
};

const clamp01 = (value: number) => Math.min(1, Math.max(0, Number.isFinite(value) ? value : 0));
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, Number.isFinite(value) ? value : min));

function gaussianAuraWeight(distance: number, radius: number, falloff = 1.7) {
  const safeRadius = Math.max(1, radius);
  const normalized = distance / safeRadius;
  return clamp01(Math.exp(-Math.pow(normalized, Math.max(0.7, falloff)) * 1.86));
}

export function computeMyzelAuraOverlaps(nodeConfigs: NodeSpatialConfigEntry[]): MyzelAuraOverlap[] {
  const overlaps: MyzelAuraOverlap[] = [];
  for (let i = 0; i < nodeConfigs.length; i += 1) {
    for (let j = i + 1; j < nodeConfigs.length; j += 1) {
      const a = nodeConfigs[i];
      const b = nodeConfigs[j];
      const radiusA = clamp(a.config.auraRadius * (0.82 + a.energy * 0.28), 40, 260);
      const radiusB = clamp(b.config.auraRadius * (0.82 + b.energy * 0.28), 40, 260);
      const distance = Math.hypot(a.x - b.x, a.y - b.y);
      const rawOverlap = clamp01((radiusA + radiusB - distance) / Math.max(1, Math.min(radiusA, radiusB)));
      const midpointX = (a.x * radiusB + b.x * radiusA) / Math.max(1, radiusA + radiusB);
      const midpointY = (a.y * radiusB + b.y * radiusA) / Math.max(1, radiusA + radiusB);
      const fieldAAtMid = gaussianAuraWeight(Math.hypot(midpointX - a.x, midpointY - a.y), radiusA, a.config.modules[0]?.falloff ?? 1.7);
      const fieldBAtMid = gaussianAuraWeight(Math.hypot(midpointX - b.x, midpointY - b.y), radiusB, b.config.modules[0]?.falloff ?? 1.7);
      const softProduct = Math.sqrt(fieldAAtMid * fieldBAtMid);
      const softness = clamp01(softProduct * 0.82 + rawOverlap * 0.18);
      if (softness <= 0.035) continue;
      const familyA = getPrimaryMyzelEffectFamily(a.config);
      const familyB = getPrimaryMyzelEffectFamily(b.config);
      const chemistry = resolveMyzelRelationCompatibility(familyA, familyB);
      const interference = clamp01(softness * (0.54 + chemistry * 0.34 + (a.energy + b.energy) * 0.06));
      const sparkle = clamp01(interference * (0.62 + rawOverlap * 0.28));
      const hueA = getMyzelPresetWitnessHue(a.config.presetId);
      const hueB = getMyzelPresetWitnessHue(b.config.presetId);
      overlaps.push({
        nodeAId: a.id,
        nodeBId: b.id,
        nodeALabel: a.label,
        nodeBLabel: b.label,
        presetA: a.config.presetId,
        presetB: b.config.presetId,
        familyA,
        familyB,
        x: midpointX,
        y: midpointY,
        distance,
        overlap: rawOverlap,
        softness,
        interference,
        sparkle,
        hue: (hueA + hueB) / 2,
      });
    }
  }
  return overlaps.sort((a, b) => b.interference - a.interference).slice(0, 22);
}
