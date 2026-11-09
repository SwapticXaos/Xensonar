import type { ParticlePreset } from '../domain/instrumentData';
import { clamp } from '../rooms/resonanceRuntimeMath';

export type ParticleTonePlanAxes = {
  brightness: number;
  attackHardness: number;
};

export type ParticleScheduledTonePlan = {
  freq: number;
  offset: number;
  dur: number;
  type: OscillatorType;
  volume: number;
  q: number;
  cutoff: number;
  prominence: number;
};

export type ParticleSynthTonePlan = {
  sitarBias: number;
  psyBias: number;
  introTones: ParticleScheduledTonePlan[];
  mainTones: ParticleScheduledTonePlan[];
  noiseAccentVolumeScale: number | null;
};

type ResolveParticleSynthTonePlanArgs = {
  preset: ParticlePreset;
  freq: number;
  offset: number;
  volume: number;
  axes: ParticleTonePlanAxes;
  sampleRoute: boolean;
  random?: () => number;
};

function tone(
  freq: number,
  offset: number,
  dur: number,
  type: OscillatorType,
  volume: number,
  q: number,
  cutoff: number,
  prominence: number,
): ParticleScheduledTonePlan {
  return { freq, offset, dur, type, volume, q, cutoff, prominence };
}

export function resolveParticleSynthTonePlan({
  preset,
  freq,
  offset,
  volume,
  axes,
  sampleRoute,
  random = Math.random,
}: ResolveParticleSynthTonePlanArgs): ParticleSynthTonePlan {
  const { brightness, attackHardness } = axes;
  const sitarBias = clamp(brightness, 0, 1);
  const psyBias = clamp(attackHardness, 0, 1);
  const brightnessCutoff = 700 + sitarBias * 4200 + psyBias * 900;
  const resonance = 1.2 + sitarBias * 2.8 + psyBias * 4.8;
  const sustainGain = 0.88 + sitarBias * 0.2 + (1 - psyBias) * 0.08;
  const transientGain = 0.9 + psyBias * 0.28 + sitarBias * 0.06;
  const sitarBuzzType: OscillatorType = sitarBias > 0.62 ? 'sawtooth' : 'square';
  const sitarBuzzFreq = freq * (1.85 + sitarBias * 1.35 + psyBias * 0.18);
  const sitarBuzzDur = 0.045 + sitarBias * 0.11 - psyBias * 0.015;
  const sitarBuzzCutoff = clamp(1700 + sitarBias * 1500 + psyBias * 260, 900, 5200);
  const psyShineType: OscillatorType = psyBias > 0.7 ? 'square' : 'triangle';
  const psyShineFreq = freq * (3.6 + psyBias * 3.2 + sitarBias * 0.32);
  const psyShineDur = 0.018 + psyBias * 0.04;
  const psyShineCutoff = clamp(3600 + psyBias * 3000 + sitarBias * 600, 2200, 9000);
  const introTones: ParticleScheduledTonePlan[] = [];
  let noiseAccentVolumeScale: number | null = null;

  if (sampleRoute) {
    if (sitarBias > 0.08) {
      introTones.push(tone(
        sitarBuzzFreq,
        offset + 0.002,
        Math.max(0.025, sitarBuzzDur),
        sitarBuzzType,
        volume * (0.04 + sitarBias * 0.1),
        2.2 + sitarBias * 3.2,
        sitarBuzzCutoff,
        0.12,
      ));
    }
    if (psyBias > 0.1) {
      introTones.push(tone(
        psyShineFreq,
        offset,
        psyShineDur,
        psyShineType,
        volume * (0.03 + psyBias * 0.08),
        1.1 + psyBias * 1.8,
        psyShineCutoff,
        0.1,
      ));
      noiseAccentVolumeScale = 0.72;
    }
    return { sitarBias, psyBias, introTones, mainTones: [], noiseAccentVolumeScale };
  }

  if (sitarBias > 0.08) {
    introTones.push(tone(
      sitarBuzzFreq,
      offset + 0.002,
      Math.max(0.025, sitarBuzzDur),
      sitarBuzzType,
      volume * (0.08 + sitarBias * 0.18),
      2.4 + sitarBias * 4.4,
      sitarBuzzCutoff,
      0.18,
    ));
  }
  if (psyBias > 0.1) {
    introTones.push(tone(
      psyShineFreq,
      offset,
      psyShineDur,
      psyShineType,
      volume * (0.04 + psyBias * 0.12),
      1.1 + psyBias * 2.1,
      psyShineCutoff,
      0.12,
    ));
    noiseAccentVolumeScale = 1;
  }

  const mainTones: ParticleScheduledTonePlan[] = [];
  if (preset === 'glass_ping') {
    mainTones.push(
      tone(freq, offset, 0.3 + sitarBias * 0.26 - psyBias * 0.1 + random() * 0.12, sitarBias > 0.52 ? 'square' : 'triangle', volume * sustainGain, 1.8 + sitarBias * 1.6 + psyBias * 2.2, brightnessCutoff + 900, 1),
      tone(freq * (2 + sitarBias * 0.44 + psyBias * 0.08), offset + 0.018, 0.14 + sitarBias * 0.18 - psyBias * 0.03, sitarBias > 0.62 ? 'sawtooth' : 'sine', volume * (0.16 + sitarBias * 0.24 + psyBias * 0.08), 1.3 + sitarBias * 1.6 + psyBias * 1.1, brightnessCutoff + 1900, 0.44),
    );
  } else if (preset === 'marimba') {
    mainTones.push(
      tone(freq, offset, 0.18 + brightness * 0.08 - attackHardness * 0.05 + random() * 0.08, 'sine', volume * (0.88 + brightness * 0.2 + attackHardness * 0.16), 1.1 + attackHardness * 2.4, 900 + brightness * 2600, 1),
      tone(freq * (3.2 + brightness * 1.2), offset, 0.06 + brightness * 0.05 - attackHardness * 0.02, 'triangle', volume * (0.14 + brightness * 0.22 + attackHardness * 0.06), 1 + attackHardness * 0.8, brightnessCutoff + 1500, 0.28),
    );
  } else if (preset === 'soft_pluck') {
    mainTones.push(tone(freq, offset, 0.42 + sitarBias * 0.24 - psyBias * 0.12 + random() * 0.1, sitarBias > 0.46 ? 'square' : 'triangle', volume * (0.66 + sitarBias * 0.2 + psyBias * 0.1), 2.1 + sitarBias * 1.8 + psyBias * 2.6, 620 + sitarBias * 2600 + psyBias * 600, 1));
  } else if (preset === 'fm_bell') {
    mainTones.push(
      tone(freq, offset, 0.62 + brightness * 0.34 - attackHardness * 0.12, 'sine', volume * sustainGain, 1.2 + attackHardness * 2.2, 1400 + brightness * 2000, 1),
      tone(freq * (1.38 + brightness * 0.16), offset, 0.34 + brightness * 0.18 - attackHardness * 0.06, 'triangle', volume * (0.26 + brightness * 0.18 + attackHardness * 0.14), 1.1 + attackHardness * 1.1, 1800 + brightness * 2100, 0.48),
      tone(freq * (2.25 + brightness * 0.75), offset, 0.14 + brightness * 0.14 - attackHardness * 0.04, 'triangle', volume * (0.1 + brightness * 0.1 + attackHardness * 0.06), 1, brightnessCutoff + 1800, 0.22),
    );
  } else if (preset === 'pizzicato') {
    mainTones.push(
      tone(freq, offset, 0.1 + sitarBias * 0.06 - psyBias * 0.03, sitarBias > 0.44 ? 'square' : 'triangle', volume * transientGain, resonance + sitarBias * 1.8, 1500 + sitarBias * 1800 + psyBias * 800, 1),
      tone(freq * (1.02 + sitarBias * 0.12), offset + 0.008, 0.055 + sitarBias * 0.05 - psyBias * 0.015, sitarBias > 0.72 ? 'sawtooth' : 'triangle', volume * (0.12 + sitarBias * 0.18 + psyBias * 0.1), 1.8 + sitarBias * 2.6 + psyBias * 1.8, 1200 + sitarBias * 1600 + psyBias * 500, 0.36),
    );
  } else if (preset === 'steel_pan') {
    mainTones.push(
      tone(freq, offset, 0.38 + brightness * 0.24 - attackHardness * 0.08, 'sine', volume * (0.74 + brightness * 0.24 + attackHardness * 0.12), 1.1 + attackHardness * 2.4, 1100 + brightness * 2200, 1),
      tone(freq * (1.1 + brightness * 0.16), offset + 0.02, 0.24 + brightness * 0.16 - attackHardness * 0.04, 'sine', volume * (0.2 + brightness * 0.18 + attackHardness * 0.08), 1, 1600 + brightness * 2100, 0.52),
      tone(freq * (2.05 + brightness * 0.85), offset + 0.05, 0.12 + brightness * 0.14 - attackHardness * 0.03, 'triangle', volume * (0.08 + brightness * 0.12 + attackHardness * 0.06), 1, brightnessCutoff + 1650, 0.24),
    );
  } else if (preset === 'crystal_bowl') {
    mainTones.push(
      tone(freq, offset, 1.1 + brightness * 0.7 - attackHardness * 0.12, 'sine', volume * (0.84 + brightness * 0.18), 1 + attackHardness * 0.9, 700 + brightness * 1100, 1),
      tone(freq + (1.1 + brightness * 2.2), offset + 0.08, 0.95 + brightness * 0.66 - attackHardness * 0.08, 'sine', volume * (0.26 + brightness * 0.18 + attackHardness * 0.08), 1, 840 + brightness * 1150, 0.42),
    );
  } else if (preset === 'velvet_bloom') {
    mainTones.push(
      tone(freq, offset, 0.92 + brightness * 0.62 - attackHardness * 0.16, 'triangle', volume * (0.7 + brightness * 0.16 + (1 - attackHardness) * 0.1), 1 + attackHardness * 1.4, 800 + brightness * 1650, 1),
      tone(freq * (1.45 + brightness * 0.14), offset + 0.05, 0.72 + brightness * 0.42 - attackHardness * 0.12, 'sine', volume * (0.2 + brightness * 0.14 + (1 - attackHardness) * 0.06), 1, 1120 + brightness * 1700, 0.48),
      tone(freq * (2 + brightness * 0.28), offset + 0.1, 0.42 + brightness * 0.3 - attackHardness * 0.08, 'sine', volume * (0.1 + brightness * 0.09), 1, 1520 + brightness * 1500, 0.22),
    );
  } else if (preset === 'shimmer_pad') {
    mainTones.push(
      tone(freq, offset, 1.28 + brightness * 0.92 - attackHardness * 0.16, 'sine', volume * (0.66 + brightness * 0.2 + (1 - attackHardness) * 0.08), 1 + attackHardness * 0.9, 720 + brightness * 1450, 1),
      tone(freq * (2.01 + brightness * 0.16), offset + 0.06, 0.92 + brightness * 0.68 - attackHardness * 0.1, 'triangle', volume * (0.18 + brightness * 0.16), 1, 1040 + brightness * 1900, 0.38),
      tone(freq * (3.02 + brightness * 0.24), offset + 0.12, 0.62 + brightness * 0.5 - attackHardness * 0.08, 'sine', volume * (0.1 + brightness * 0.08), 1, 1450 + brightness * 2050, 0.18),
    );
  } else if (preset === 'dust_chime') {
    mainTones.push(
      tone(freq, offset, 0.12 + brightness * 0.1 - attackHardness * 0.04, 'sine', volume * (0.46 + brightness * 0.22 + attackHardness * 0.1), 3 + attackHardness * 2.6, 2400 + brightness * 2800, 1),
      tone(freq * (2.62 + brightness * 0.38), offset + 0.008, 0.08 + brightness * 0.07 - attackHardness * 0.02, 'triangle', volume * (0.08 + brightness * 0.12 + attackHardness * 0.06), 2 + attackHardness * 0.8, 4100 + brightness * 2200, 0.26),
      tone(freq * (3.92 + brightness * 0.48), offset + 0.016, 0.06 + brightness * 0.05 - attackHardness * 0.02, 'sine', volume * (0.04 + brightness * 0.08), 1.6, 5200, 0.14),
    );
  } else if (preset === 'rubber_click') {
    mainTones.push(
      tone(freq * (0.84 + brightness * 0.1), offset, 0.07 + brightness * 0.02 - attackHardness * 0.025, 'triangle', volume * (0.74 + attackHardness * 0.14), 1.1 + attackHardness * 1.6, 820 + brightness * 1040, 1),
      tone(freq * 0.52, offset + 0.004, 0.04 + brightness * 0.02 - attackHardness * 0.015, 'sine', volume * (0.12 + brightness * 0.1), 1, 500 + brightness * 460, 0.24),
    );
  } else if (preset === 'reed_pop') {
    mainTones.push(
      tone(freq, offset, 0.11 + sitarBias * 0.06 - psyBias * 0.025, sitarBias > 0.38 ? 'square' : 'triangle', volume * (0.54 + sitarBias * 0.16 + psyBias * 0.1), 2 + sitarBias * 2.8 + psyBias * 2.2, 1200 + sitarBias * 1700 + psyBias * 600, 1),
      tone(freq * (1.46 + sitarBias * 0.22), offset + 0.008, 0.095 + sitarBias * 0.04 - psyBias * 0.015, sitarBias > 0.62 ? 'sawtooth' : 'triangle', volume * (0.1 + sitarBias * 0.1 + psyBias * 0.05), 2.6 + sitarBias * 1.4 + psyBias * 0.8, 1850 + sitarBias * 1700 + psyBias * 900, 0.28),
    );
  } else if (preset === 'granular_spark') {
    mainTones.push(
      tone(freq, offset, 0.075 + sitarBias * 0.035 - psyBias * 0.02, sitarBias > 0.54 ? 'square' : 'triangle', volume * (0.34 + sitarBias * 0.14 + psyBias * 0.06), 3.2 + sitarBias * 1.4 + psyBias * 2.1, 2400 + sitarBias * 1800 + psyBias * 1200, 1),
      tone(freq * (2.22 + sitarBias * 0.42), offset + 0.003, 0.055 + sitarBias * 0.04 - psyBias * 0.015, sitarBias > 0.68 ? 'sawtooth' : 'sine', volume * (0.08 + sitarBias * 0.1), 2.4 + sitarBias * 1 + psyBias * 0.9, 3900 + sitarBias * 1300 + psyBias * 1400, 0.22),
      tone(freq * (3.36 + sitarBias * 0.3 + psyBias * 0.6), offset + 0.01, 0.04 + sitarBias * 0.025 + psyBias * 0.015, psyBias > 0.6 ? 'square' : 'sine', volume * (0.05 + sitarBias * 0.04 + psyBias * 0.05), 1.8 + psyBias * 1.1, 5000 + sitarBias * 700 + psyBias * 1800, 0.12),
    );
  } else if (preset === 'kalimba') {
    mainTones.push(
      tone(freq, offset, 0.18 + brightness * 0.08 - attackHardness * 0.04, 'triangle', volume * (0.72 + brightness * 0.18 + attackHardness * 0.08), 1.8 + attackHardness * 1.6, 1800 + brightness * 1200, 1),
      tone(freq * (2.04 + brightness * 0.16), offset + 0.012, 0.12 + brightness * 0.06 - attackHardness * 0.03, 'sine', volume * (0.16 + brightness * 0.12), 1.2, 3000 + brightness * 1000, 0.28),
    );
  } else if (preset === 'gong') {
    mainTones.push(
      tone(freq, offset, 0.56 + brightness * 0.22 - attackHardness * 0.06, 'sine', volume * (0.68 + brightness * 0.18), 1.4 + attackHardness * 1.2, 1200 + brightness * 800, 1),
      tone(freq * (1.5 + brightness * 0.08), offset + 0.02, 0.42 + brightness * 0.18 - attackHardness * 0.05, 'triangle', volume * (0.2 + brightness * 0.12), 1.1, 1800 + brightness * 900, 0.36),
      tone(freq * (2.46 + brightness * 0.22), offset + 0.06, 0.28 + brightness * 0.14 - attackHardness * 0.04, 'sine', volume * (0.1 + brightness * 0.08), 1, 2400 + brightness * 700, 0.18),
    );
  } else if (preset === 'chime') {
    mainTones.push(
      tone(freq, offset, 0.22 + brightness * 0.08 - attackHardness * 0.03, 'sine', volume * (0.54 + brightness * 0.18 + attackHardness * 0.08), 3.2 + attackHardness * 1.8, 2800 + brightness * 1600, 1),
      tone(freq * (2.5 + brightness * 0.2), offset + 0.008, 0.12 + brightness * 0.06 - attackHardness * 0.02, 'triangle', volume * (0.14 + brightness * 0.12), 2.0, 4200 + brightness * 1300, 0.26),
      tone(freq * (3.78 + brightness * 0.26), offset + 0.016, 0.09 + brightness * 0.05 - attackHardness * 0.02, 'sine', volume * (0.08 + brightness * 0.08), 1.4, 5200, 0.14),
    );
  } else if (preset === 'tine') {
    mainTones.push(
      tone(freq, offset, 0.14 + brightness * 0.05 - attackHardness * 0.03, 'triangle', volume * (0.62 + brightness * 0.14 + attackHardness * 0.08), 2.4 + attackHardness * 1.6, 2200 + brightness * 1200, 1),
      tone(freq * (2.08 + brightness * 0.16), offset + 0.005, 0.1 + brightness * 0.04 - attackHardness * 0.02, 'sine', volume * (0.12 + brightness * 0.1), 1.6, 3400 + brightness * 900, 0.22),
    );
  } else if (preset === 'reed_tap') {
    mainTones.push(
      tone(freq, offset, 0.095 + sitarBias * 0.04 - psyBias * 0.02, sitarBias > 0.4 ? 'square' : 'triangle', volume * (0.5 + sitarBias * 0.12 + psyBias * 0.06), 2.4 + sitarBias * 1.8 + psyBias * 1.2, 1200 + sitarBias * 1200 + psyBias * 500, 1),
      tone(freq * (1.42 + sitarBias * 0.14), offset + 0.008, 0.08 + sitarBias * 0.04 - psyBias * 0.015, 'triangle', volume * (0.08 + sitarBias * 0.08), 2.2, 1800 + sitarBias * 1200 + psyBias * 500, 0.2),
    );
  } else if (preset === 'blip') {
    mainTones.push(
      tone(freq, offset, 0.07 + brightness * 0.02 - attackHardness * 0.015, 'sine', volume * (0.42 + brightness * 0.12 + attackHardness * 0.08), 4.0 + attackHardness * 1.6, 3600 + brightness * 1600, 1),
      tone(freq * (2.22 + brightness * 0.2), offset + 0.004, 0.05 + brightness * 0.02 - attackHardness * 0.012, 'triangle', volume * (0.1 + brightness * 0.08), 2.4, 5000, 0.2),
    );
  } else if (preset === 'shimmer') {
    mainTones.push(
      tone(freq, offset, 0.36 + brightness * 0.14 - attackHardness * 0.05, 'sine', volume * (0.56 + brightness * 0.18), 2.0 + attackHardness * 1.2, 2000 + brightness * 1500, 1),
      tone(freq * (2.02 + brightness * 0.12), offset + 0.04, 0.28 + brightness * 0.12 - attackHardness * 0.04, 'triangle', volume * (0.16 + brightness * 0.1), 1.2, 3200 + brightness * 1300, 0.28),
      tone(freq * (3.04 + brightness * 0.16), offset + 0.09, 0.18 + brightness * 0.08 - attackHardness * 0.03, 'sine', volume * (0.08 + brightness * 0.06), 1.0, 4400 + brightness * 1100, 0.14),
    );
  } else if (preset === 'dust') {
    mainTones.push(
      tone(freq, offset, 0.1 + brightness * 0.04 - attackHardness * 0.02, 'triangle', volume * (0.36 + brightness * 0.12 + attackHardness * 0.06), 3.8 + attackHardness * 1.8, 3200 + brightness * 1800, 1),
      tone(freq * (2.8 + brightness * 0.24), offset + 0.006, 0.07 + brightness * 0.03 - attackHardness * 0.015, 'sine', volume * (0.08 + brightness * 0.08), 2.1, 5200, 0.18),
    );
  } else if (preset === 'woodblock') {
    mainTones.push(
      tone(freq, offset, 0.05 + brightness * 0.03 - attackHardness * 0.018, 'triangle', volume * (0.58 + brightness * 0.22 + attackHardness * 0.1), 1 + attackHardness * 2.4, 850 + brightness * 1900, 1),
      tone(freq * (0.48 + brightness * 0.1), offset, 0.04 + brightness * 0.02 - attackHardness * 0.015, 'triangle', volume * (0.26 + brightness * 0.16), 1, 520 + brightness * 980, 0.28),
    );
  }

  return { sitarBias, psyBias, introTones, mainTones, noiseAccentVolumeScale };
}
