import type { DrumKit } from '../domain/instrumentData';
import type { DrumLaneKitOverrides } from './drumKitRoutingTypes';
import { resolveDrumLaneKit } from './drumKitRouting';
import { resolveDrumLaneSettings, type DrumLaneSettingsMap } from './drumLaneSettings';
import type { DrumLaneId } from '../drumPatternMachineTypes';
import type { DrumConfigEntry } from '../drumConfigLibraryTypes';
import { createDrumProgram, forEachDrumProgramEventInWindow } from '../../l3lab/canonicalForge/drumProgram';
import { DEFAULT_DRUM_STYLE, type DrumMachine, type DrumStyle, type DrumVoice } from '../../resonance/drumMachine';
import type { GeneratedPattern, GrooveDescriptorVector } from '../../resonance/rhythmforge/types';
import type { PsyBassPattern, PsyBassStyle } from '../../resonance/psybass/types';

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));


function buildDrumTriggerStyle(args: { laneId: DrumLaneId; drumStyle: DrumStyle; laneSettings?: DrumLaneSettingsMap | null; value?: number }) {
  const laneSettings = resolveDrumLaneSettings({ laneId: args.laneId, laneSettings: args.laneSettings });
  return {
    ...args.drumStyle,
    edge: args.laneId === 'hatClosed' || args.laneId === 'hatOpen' ? Math.max(args.drumStyle.edge, 0.58) : args.drumStyle.edge,
    air: args.laneId === 'hatOpen' || args.laneId === 'clap' ? Math.max(args.drumStyle.air, 0.54) : args.drumStyle.air,
    snap: (args.value ?? 0) >= 0.95 ? Math.max(args.drumStyle.snap, 0.68) : args.drumStyle.snap,
    softness: args.laneId === 'kick' ? Math.min(args.drumStyle.softness, 0.42) : args.drumStyle.softness,
    pan: laneSettings.pan,
    decayScale: laneSettings.decay,
    chokeGroup: laneSettings.chokeGroup,
  };
}

type PlayBassNote = (time: number, freq: number, vol: number, dur: number, accent?: number, extras?: { glideToNext?: boolean; ghost?: boolean }) => void;

export function resolveBassRootHz(params: {
  bassRootMode: 'fixed' | 'cursor' | 'auto';
  bassRootHz: number;
  cursorY: number;
  freqFromY: (y: number) => number;
}) {
  if (params.bassRootMode === 'fixed') return params.bassRootHz;
  let cursorFreq = params.freqFromY(params.cursorY);
  while (cursorFreq > 80) cursorFreq /= 2;
  return cursorFreq;
}

export function readDrumStyle(params: {
  drumEdge?: number;
  drumSoftness?: number;
  drumAir?: number;
  drumSnap?: number;
  grooveSwing?: number;
}): DrumStyle {
  return {
    edge: clamp(params.drumEdge ?? DEFAULT_DRUM_STYLE.edge, 0, 1),
    softness: clamp(params.drumSoftness ?? DEFAULT_DRUM_STYLE.softness, 0, 1),
    air: clamp(params.drumAir ?? DEFAULT_DRUM_STYLE.air, 0, 1),
    snap: clamp(params.drumSnap ?? DEFAULT_DRUM_STYLE.snap, 0, 1),
    swing: clamp(params.grooveSwing ?? DEFAULT_DRUM_STYLE.swing, 0, 1),
    pan: DEFAULT_DRUM_STYLE.pan,
    decayScale: DEFAULT_DRUM_STYLE.decayScale,
    chokeGroup: DEFAULT_DRUM_STYLE.chokeGroup,
  };
}

export function scheduleRhythmForgeDrumStep(args: {
  drumMachine: DrumMachine;
  pattern: GeneratedPattern;
  step: number;
  time: number;
  drumLevel: number;
  kit: DrumKit;
  drumStyle: DrumStyle;
  laneKitOverrides?: DrumLaneKitOverrides;
}) {
  const { drumMachine, pattern, step, time, drumLevel, kit, drumStyle, laneKitOverrides } = args;
  const softSwing = (pattern.swing - 0.5) * 0.032;
  const push = step % 2 === 1 ? softSwing : -softSwing * 0.3;
  const scheduledTime = Math.max(0, time + push);
  const dStepKick = pattern.kick[step];
  const dStepSnare = pattern.snare[step];
  const dStepHat = pattern.hat[step];
  if (dStepKick?.active) drumMachine.trigger('kick', scheduledTime, drumLevel * (0.72 + (dStepKick.accent ?? 0.6) * 0.55), resolveDrumLaneKit({ laneId: 'kick', globalKit: kit, overrides: laneKitOverrides }), drumStyle);
  if (dStepSnare?.active) {
    const snareVoice = (dStepSnare.accent ?? 0.6) > 0.78 ? 'snare' : 'clap';
    const snareLaneId = snareVoice === 'snare' ? 'snare' : 'clap';
    drumMachine.trigger(snareVoice, scheduledTime, drumLevel * (0.42 + (dStepSnare.accent ?? 0.6) * 0.5), resolveDrumLaneKit({ laneId: snareLaneId, globalKit: kit, overrides: laneKitOverrides }), drumStyle);
  }
  if (dStepHat?.active) {
    const hatVoice = (dStepHat.accent ?? 0.4) > 0.62 && step % 4 === 3 ? 'hat_open' : 'hat_closed';
    drumMachine.trigger(hatVoice, scheduledTime, drumLevel * (0.2 + (dStepHat.accent ?? 0.4) * 0.34), resolveDrumLaneKit({ laneId: hatVoice === 'hat_open' ? 'hatOpen' : 'hatClosed', globalKit: kit, overrides: laneKitOverrides }), drumStyle);
  }
}

export function scheduleExportedDrumConfigStep(args: {
  drumMachine: DrumMachine;
  entry: DrumConfigEntry | null;
  stepIndex: number;
  time: number;
  stepDurationSec: number;
  drumLevel: number;
  drumStyle: DrumStyle;
  runtimeGlobalKit: DrumKit;
  laneKitOverrides?: DrumLaneKitOverrides;
  laneSettings?: DrumLaneSettingsMap;
}) {
  const { drumMachine, entry, stepIndex, time, stepDurationSec, drumLevel, drumStyle, runtimeGlobalKit, laneKitOverrides, laneSettings } = args;
  if (!entry) return;
  const bars = Math.max(1, entry.bars || 1);
  const totalGridSteps = Math.max(1, bars * 16);
  const localGridStep = ((stepIndex % totalGridSteps) + totalGridSteps) % totalGridSteps;
  const windowStartRatio = localGridStep / totalGridSteps;
  const windowEndRatio = (localGridStep + 1) / totalGridSteps;
  const patternStartTime = time - localGridStep * stepDurationSec;
  const patternDurationSec = stepDurationSec * totalGridSteps;
  const program = createDrumProgram({
    presetSource: entry.presetSource,
    globalKit: entry.drumKit,
    bars,
    segmentsPerBar: entry.segmentsPerBar,
    segmentMarkers: entry.segmentMarkers,
    stepCount: entry.stepCount,
    laneOrder: (entry.laneOrder?.length ? entry.laneOrder : ['kick', 'snare', 'hatClosed', 'hatOpen', 'clap', 'perc']) as DrumLaneId[],
    laneSteps: entry.laneSteps as any,
    laneKitOverrides: entry.laneKitOverrides,
    laneSettings: entry.laneSettings ?? laneSettings,
    stepPrograms: entry.stepPrograms,
  });
  forEachDrumProgramEventInWindow(program, { windowStartRatio, windowEndRatio }, (event) => {
    const baseGain = drumLevel * event.laneSettings.level * (event.value >= 0.95 ? 1 : event.value >= 0.8 ? 0.84 : 0.62);
    const scheduledTime = patternStartTime + event.startRatio * patternDurationSec;
    const voice = event.laneId === 'hatClosed' ? 'hat_closed' : event.laneId === 'hatOpen' ? 'hat_open' : event.laneId;
    const layers = event.layers.length ? event.layers : [{ id: 'primary', active: true, levelScale: 1, decayScale: 1, panOffset: 0, gradient: 0 }];
    layers.forEach((layer) => {
      if (!layer.active) return;
      const style = buildDrumTriggerStyle({ laneId: event.laneId, drumStyle, laneSettings: program.laneSettings, value: event.value });
      drumMachine.trigger(
        voice as DrumVoice,
        scheduledTime,
        baseGain * layer.levelScale,
        resolveDrumLaneKit({ laneId: event.laneId, globalKit: runtimeGlobalKit, overrides: laneKitOverrides }),
        {
          ...style,
          pan: Math.max(-1, Math.min(1, style.pan + layer.panOffset)),
          decayScale: style.decayScale * layer.decayScale,
          snap: Math.max(0, Math.min(1, style.snap + layer.gradient * 0.08)),
          air: Math.max(0, Math.min(1, style.air + Math.max(0, layer.gradient) * 0.06)),
          edge: Math.max(0, Math.min(1, style.edge + Math.max(0, -layer.gradient) * 0.06)),
        },
      );
    });
  });
}

export function scheduleRhythmForgeBassStep(args: {
  pattern: GeneratedPattern;
  step: number;
  time: number;
  bassLevel: number;
  quantizeBpm: number;
  rootHz: number;
  playBassNote: PlayBassNote;
}) {
  const { pattern, step, time, bassLevel, quantizeBpm, rootHz, playBassNote } = args;
  const softSwing = (pattern.swing - 0.5) * 0.032;
  const push = step % 2 === 1 ? softSwing : -softSwing * 0.3;
  const scheduledTime = Math.max(0, time + push);
  const bStep = pattern.bass[step];
  if (bStep?.active) {
    const baseDur = (60 / Math.max(40, quantizeBpm) / 4) * (0.66 + pattern.noteLength);
    const dur = bStep.tie ? baseDur * 1.55 : baseDur;
    const freq = rootHz * bStep.ratio * Math.pow(2, bStep.octave);
    playBassNote(scheduledTime, freq, bassLevel, dur, bStep.accent ?? 0.7, { glideToNext: bStep.glideToNext, ghost: (bStep.accent ?? 0.7) < 0.45 });
  }
}

function readPsyBassStyleMorph(style: PsyBassStyle) {
  return ({ classicOffbeat: 0.04, rolling: 0.36, gallop: 0.62, tripletGhost: 0.72, darkForest: 0.9 } as Record<PsyBassStyle, number>)[style];
}

export function buildPsyBassPatternRequest(args: {
  style: PsyBassStyle;
  rootHz: number;
  barIndex: number;
  seed: number;
  swing: number;
  bassGrit: number;
  pressure: number;
  descriptors: GrooveDescriptorVector;
}) {
  return {
    barIndex: args.barIndex,
    seed: args.seed,
    rootHz: args.rootHz,
    stepCount: 16 as const,
    baseSwing: 0.02 + args.swing * 0.08,
    styleMorph: readPsyBassStyleMorph(args.style),
    density: clamp(0.68 + args.bassGrit * 0.16 + args.pressure * 0.1, 0, 1),
    descriptors: args.descriptors,
  };
}

export function schedulePsyBassStep(args: {
  pattern: PsyBassPattern;
  step: number;
  time: number;
  bassLevel: number;
  quantizeBpm: number;
  playBassNote: PlayBassNote;
}) {
  const { pattern, step, time, bassLevel, quantizeBpm, playBassNote } = args;
  const softSwing = pattern.swing * 0.028;
  const push = step % 2 === 1 ? softSwing : -softSwing * 0.18;
  const scheduledTime = Math.max(0, time + push);
  const bStep = pattern.steps[step % pattern.steps.length];
  if (!bStep?.active) return;
  const freq = pattern.rootHz * Math.pow(2, (bStep.semitone + bStep.octave * 12) / 12);
  const stepBase = 60 / Math.max(40, quantizeBpm) / 4;
  const dur = stepBase * clamp(0.22 + bStep.length * 1.25, 0.12, 1.7);
  playBassNote(scheduledTime, freq, bassLevel * (bStep.ghost ? 0.64 : 1), dur, bStep.accent, { glideToNext: bStep.glideToNext, ghost: bStep.ghost });
}
