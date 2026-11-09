import type { WaveOvertoneWaveform, WaveSoundPreset } from '../domain/instrumentData';
import type { Room3ExciterProfile } from '../../resonance/modalBody';
import type { ActiveWaveOvertone } from '../rooms/resonanceRuntimeMath';
import { buildWaveStarterPresetToneSpecs } from './waveStarterPresetTonePlan';
import { resolveWaveStarterBodyExciterPlan } from './waveStarterBodyExciterPlan';
import { resolveWaveStarterOvertonePlaybackPlan, type WaveStarterOvertoneMode } from './waveStarterOvertonePlaybackPlan';
import { resolveWaveStarterSwellReinforcementPlan } from './waveStarterSwellReinforcementPlan';

export type WaveStarterHarmonicToneRequest = {
  toneFreq: number;
  delay: number;
  duration: number;
  waveform: OscillatorType;
  gain: number;
  resonance: number;
  cutoffHz: number;
  prominence: number;
};

export type WaveStarterHarmonicPlaybackCallbacks = {
  playGradientTone: (tone: WaveStarterHarmonicToneRequest) => boolean;
  triggerBodyExciter: (
    profile: Room3ExciterProfile,
    freq: number,
    gain: number,
    options: { voiceBudget: number; bodyScale: number },
  ) => void;
  enqueueOvertoneArp: (baseFreq: number, volume: number, activeMix: ActiveWaveOvertone[], isSector: boolean) => void;
};

export type PlayWaveStarterHarmonicPlaybackPlansArgs = {
  preset: WaveSoundPreset;
  freq: number;
  volume: number;
  runtimeVolume: number;
  isSector: boolean;
  transientBodyScale: number;
  gradientAmount: number;
  swellBlend: number;
  overtonesEnabled: boolean;
  overtoneAmounts: Partial<Record<string, number>>;
  overtoneWaveform: WaveOvertoneWaveform;
  overtoneMode: WaveStarterOvertoneMode;
  overtoneGlobalLevel: number;
  callbacks: WaveStarterHarmonicPlaybackCallbacks;
};

export function playWaveStarterHarmonicPlaybackPlans({
  preset,
  freq,
  volume,
  runtimeVolume,
  isSector,
  transientBodyScale,
  gradientAmount,
  swellBlend,
  overtonesEnabled,
  overtoneAmounts,
  overtoneWaveform,
  overtoneMode,
  overtoneGlobalLevel,
  callbacks,
}: PlayWaveStarterHarmonicPlaybackPlansArgs): void {
  let startedToneCount = 0;
  const playTone = (tone: WaveStarterHarmonicToneRequest) => {
    if (callbacks.playGradientTone(tone)) startedToneCount += 1;
  };

  for (const tone of buildWaveStarterPresetToneSpecs(preset, { isSector })) {
    playTone({
      toneFreq: freq * tone.freqMul,
      delay: tone.delay,
      duration: tone.duration,
      waveform: tone.waveform,
      gain: volume * tone.gainMul,
      resonance: tone.resonance,
      cutoffHz: tone.cutoffHz,
      prominence: tone.prominence,
    });
  }

  const overtonePlan = resolveWaveStarterOvertonePlaybackPlan({
    baseFreq: freq,
    baseVolume: volume,
    isSector,
    enabled: overtonesEnabled,
    overtoneAmounts,
    waveform: overtoneWaveform,
    mode: overtoneMode,
    globalLevel: overtoneGlobalLevel,
  });
  for (const tone of overtonePlan.directTones) {
    playTone({
      toneFreq: tone.toneFreq,
      delay: tone.delay,
      duration: tone.duration,
      waveform: tone.waveform,
      gain: tone.gain,
      resonance: tone.resonance,
      cutoffHz: tone.cutoffHz,
      prominence: tone.prominence,
    });
  }
  if (overtonePlan.enqueueArp) {
    if (startedToneCount > 0) callbacks.enqueueOvertoneArp(freq, volume, overtonePlan.activeMix, isSector);
  }

  const swellReinforcement = resolveWaveStarterSwellReinforcementPlan({
    baseFreq: freq,
    runtimeVolume,
    isSector,
    preset,
    swellBlend,
  });
  if (swellReinforcement) {
    playTone(swellReinforcement);
  }

  // A resonating body follows an admitted excitation. This preserves the played
  // pitch/attack and makes body colour the first layer to thin under pressure.
  if (startedToneCount > 0) {
    const bodyExciterPlan = resolveWaveStarterBodyExciterPlan({
      preset,
      freq,
      volume,
      isSector,
      transientBodyScale,
      gradientAmount,
    });
    callbacks.triggerBodyExciter(bodyExciterPlan.profile, bodyExciterPlan.freq, bodyExciterPlan.gain, {
      voiceBudget: bodyExciterPlan.voiceBudget,
      bodyScale: bodyExciterPlan.bodyScale,
    });
  }
}
