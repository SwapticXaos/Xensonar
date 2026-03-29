import type { MyceliumSnapshot } from "../topology/myceliumSnapshot";
import type { Room3ModField } from "./modField";

export interface Room3BodyControls {
  coupling: number;
  material: number;
  air: number;
  roughness: number;
  resonance: number;
}

export const DEFAULT_ROOM3_BODY_CONTROLS: Room3BodyControls = {
  coupling: 0.72,
  material: 0.58,
  air: 0.34,
  roughness: 0.42,
  resonance: 0.64,
};

export interface Room3PartialGroups {
  fundamental: number;
  formant: number;
  shimmer: number;
  roughness: number;
}

export interface Room3TimbreState {
  materialLabel: string;
  exciterHardness: number;
  exciterNoise: number;
  damping: number;
  inharmonicity: number;
  air: number;
  saturationPre: number;
  saturationPost: number;
  driftCoherence: number;
  bodyMix: number;
  resonanceFocus: number;
  partialGroups: Room3PartialGroups;
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

export const getRoom3MaterialLabel = (material: number, tension: number, brightness: number) => {
  const value = clamp(material * 0.54 + brightness * 0.26 + tension * 0.2, 0, 1);
  if (value < 0.22) return "Membran";
  if (value < 0.42) return "Holz";
  if (value < 0.62) return "Rohr";
  if (value < 0.8) return "Metall";
  return "Glas";
};

export const deriveRoom3TimbreState = (
  snapshot: MyceliumSnapshot,
  modField: Room3ModField,
  controls: Room3BodyControls,
): Room3TimbreState => {
  const tension = clamp(snapshot.constellationTension ?? snapshot.tensionField ?? 0, 0, 1);
  const flux = clamp(snapshot.constellationFlux ?? 0, 0, 1);
  const brightness = clamp(snapshot.constellationBrightness ?? 0.5, 0, 1);
  const material = clamp(controls.material, 0, 1);
  const resonance = clamp(controls.resonance, 0, 1);
  const coherence = clamp(snapshot.coherence ?? 0, 0, 1);
  const density = clamp(modField.density, 0, 1);
  const roughness = clamp(modField.roughness, 0, 1);
  const air = clamp(modField.air, 0, 1);

  const exciterHardness = clamp(0.16 + tension * 0.24 + flux * 0.32 + material * 0.18 + roughness * 0.12, 0, 1);
  const exciterNoise = clamp(0.08 + air * 0.5 + flux * 0.18 + (1 - density) * 0.1, 0, 1);
  const damping = clamp(lerp(0.22, 0.88, 1 - resonance * 0.74 - brightness * 0.1 + density * 0.08), 0.12, 0.96);
  const inharmonicity = clamp(0.02 + tension * 0.22 + roughness * 0.28 + material * 0.16, 0, 0.74);
  const saturationPre = clamp(0.06 + exciterHardness * 0.32 + roughness * 0.24, 0.04, 0.82);
  const saturationPost = clamp(0.04 + material * 0.2 + brightness * 0.16 + roughness * 0.18, 0.03, 0.76);
  const driftCoherence = clamp(1 - (modField.drift * 0.52 + (1 - coherence) * 0.34 + inharmonicity * 0.18), 0.08, 1);
  const bodyMix = clamp(controls.coupling * 0.54 + resonance * 0.22 + flux * 0.14 + tension * 0.1, 0, 1);
  const resonanceFocus = clamp(resonance * 0.58 + brightness * 0.18 + density * 0.14 + coherence * 0.1, 0, 1);

  const partialGroups: Room3PartialGroups = {
    fundamental: clamp(0.52 + density * 0.24 + coherence * 0.14 - air * 0.12, 0.25, 1.2),
    formant: clamp(0.42 + resonanceFocus * 0.42 + brightness * 0.14, 0.18, 1.15),
    shimmer: clamp(0.2 + brightness * 0.46 + air * 0.3 + flux * 0.1, 0.1, 1.25),
    roughness: clamp(0.1 + roughness * 0.58 + inharmonicity * 0.24, 0.06, 1.2),
  };

  return {
    materialLabel: getRoom3MaterialLabel(material, tension, brightness),
    exciterHardness,
    exciterNoise,
    damping,
    inharmonicity,
    air,
    saturationPre,
    saturationPost,
    driftCoherence,
    bodyMix,
    resonanceFocus,
    partialGroups,
  };
};
