import {
  type WaveTimbreGradientState,
} from "../rooms/resonanceRuntimeMath";
import { getWaveStarterDriveCurve } from "./waveStarterDriveCurveCache";
import type { WaveStarterGradientToneRenderPlan } from "./waveStarterGradientToneShape";

export type WaveStarterGradientToneGraphArgs = {
  ctx: AudioContext;
  toneFreq: number;
  waveform: OscillatorType;
  shapedCutoff: number;
  shapedResonance: number;
  waveGradient: WaveTimbreGradientState;
  renderPlan: WaveStarterGradientToneRenderPlan;
  mainOutput: AudioNode;
  auxTargets: Array<AudioNode | null | undefined>;
};

export type WaveStarterGradientToneGraph = {
  osc: OscillatorNode;
  finalOut: GainNode;
  dryFilter: BiquadFilterNode;
  nodesToDisconnect: AudioNode[];
};

export function createWaveStarterGradientToneGraph(args: WaveStarterGradientToneGraphArgs): WaveStarterGradientToneGraph {
  const {
    ctx,
    toneFreq,
    waveform,
    shapedCutoff,
    shapedResonance,
    waveGradient,
    renderPlan,
    mainOutput,
    auxTargets,
  } = args;
  const {
    actualDur,
    corePeakAt,
    colorDelay,
    colorPeakAt,
    dryDuckAt,
    jawariStart,
    jawariEnd,
    jawariPeak,
    vowel1Start,
    vowel1End,
    vowel1Peak,
    vowel2Start,
    vowel2End,
    vowel2Peak,
    shineHpStart,
    shineHpEnd,
    coreLevel,
    colorLevel,
  } = renderPlan;
  const now = renderPlan.startAt;

  const osc = ctx.createOscillator();
  const dryFilter = ctx.createBiquadFilter();
  const dryMaster = ctx.createGain();
  const colorExciterInput = ctx.createGain();
  const colorExciter = ctx.createWaveShaper();
  const jawariShaper = ctx.createWaveShaper();
  const jawariBand = ctx.createBiquadFilter();
  const jawariGainNode = ctx.createGain();
  const vowel1 = ctx.createBiquadFilter();
  const vowel1GainNode = ctx.createGain();
  const vowel2 = ctx.createBiquadFilter();
  const vowel2GainNode = ctx.createGain();
  const shineHighpass = ctx.createBiquadFilter();
  const shineGainNode = ctx.createGain();
  const colorBus = ctx.createGain();
  const colorMaster = ctx.createGain();
  const sum = ctx.createGain();
  const finalOut = ctx.createGain();

  // Classic/OFF hot path: this graph is reached only when the Entrophon wave voice
  // is inactive. Keep the 90.61/6.8.7 semantics literal and allocation-free here.
  osc.type = waveform;
  osc.frequency.setValueAtTime(toneFreq, now);

  dryFilter.type = "lowpass";
  dryFilter.frequency.setValueAtTime(shapedCutoff, now);
  dryFilter.frequency.exponentialRampToValueAtTime(Math.max(280, shapedCutoff * (0.88 + waveGradient.shine * 0.05)), now + actualDur);
  dryFilter.Q.setValueAtTime(shapedResonance, now);
  dryMaster.gain.setValueAtTime(0.0001, now);
  dryMaster.gain.linearRampToValueAtTime(coreLevel, corePeakAt);
  dryMaster.gain.exponentialRampToValueAtTime(Math.max(0.0001, coreLevel * waveGradient.dryLateMul), dryDuckAt);
  dryMaster.gain.exponentialRampToValueAtTime(0.0001, now + actualDur);

  colorExciterInput.gain.setValueAtTime(waveGradient.exciterPreGain, now);
  colorExciter.curve = getWaveStarterDriveCurve(waveGradient.exciterDrive);
  jawariShaper.curve = getWaveStarterDriveCurve(waveGradient.jawariDrive);
  jawariBand.type = "bandpass";
  jawariBand.frequency.setValueAtTime(jawariStart, now);
  jawariBand.frequency.exponentialRampToValueAtTime(jawariPeak, colorPeakAt);
  jawariBand.frequency.exponentialRampToValueAtTime(jawariEnd, now + actualDur);
  jawariBand.Q.setValueAtTime(waveGradient.jawariQ, now);
  jawariGainNode.gain.setValueAtTime(waveGradient.jawariGain, now);

  vowel1.type = "bandpass";
  vowel1.frequency.setValueAtTime(vowel1Start, now);
  vowel1.frequency.exponentialRampToValueAtTime(vowel1Peak, colorPeakAt);
  vowel1.frequency.exponentialRampToValueAtTime(vowel1End, now + actualDur);
  vowel1.Q.setValueAtTime(waveGradient.vowel1Q, now);
  vowel1GainNode.gain.setValueAtTime(waveGradient.vowel1Gain, now);

  vowel2.type = "bandpass";
  vowel2.frequency.setValueAtTime(vowel2Start, now);
  vowel2.frequency.exponentialRampToValueAtTime(vowel2Peak, colorPeakAt);
  vowel2.frequency.exponentialRampToValueAtTime(vowel2End, now + actualDur);
  vowel2.Q.setValueAtTime(waveGradient.vowel2Q, now);
  vowel2GainNode.gain.setValueAtTime(waveGradient.vowel2Gain, now);

  shineHighpass.type = "highpass";
  shineHighpass.frequency.setValueAtTime(shineHpStart, now);
  shineHighpass.frequency.exponentialRampToValueAtTime(shineHpEnd, now + actualDur);
  shineGainNode.gain.setValueAtTime(waveGradient.shineGain, now);

  colorBus.gain.setValueAtTime(1, now);
  colorMaster.gain.setValueAtTime(0.0001, now);
  colorMaster.gain.setValueAtTime(0.0001, now + colorDelay);
  colorMaster.gain.linearRampToValueAtTime(colorLevel, colorPeakAt);
  colorMaster.gain.exponentialRampToValueAtTime(Math.max(0.0001, colorLevel * 0.46), now + Math.min(actualDur * 0.52, 0.19));
  colorMaster.gain.exponentialRampToValueAtTime(0.0001, now + actualDur);

  finalOut.gain.setValueAtTime(0.92, now);

  osc.connect(dryFilter);
  dryFilter.connect(dryMaster);
  dryMaster.connect(sum);

  osc.connect(colorExciterInput);
  colorExciterInput.connect(colorExciter);

  colorExciter.connect(jawariShaper);
  jawariShaper.connect(jawariBand);
  jawariBand.connect(jawariGainNode);
  jawariGainNode.connect(colorBus);

  colorExciter.connect(vowel1);
  vowel1.connect(vowel1GainNode);
  vowel1GainNode.connect(colorBus);

  colorExciter.connect(vowel2);
  vowel2.connect(vowel2GainNode);
  vowel2GainNode.connect(colorBus);

  colorExciter.connect(shineHighpass);
  shineHighpass.connect(shineGainNode);
  shineGainNode.connect(colorBus);

  colorBus.connect(colorMaster);
  colorMaster.connect(sum);

  sum.connect(finalOut);
  finalOut.connect(mainOutput);
  auxTargets.forEach((target) => {
    if (target && target !== mainOutput) finalOut.connect(target);
  });

  return {
    osc,
    finalOut,
    dryFilter,
    nodesToDisconnect: [
      osc,
      dryFilter,
      dryMaster,
      colorExciterInput,
      colorExciter,
      jawariShaper,
      jawariBand,
      jawariGainNode,
      vowel1,
      vowel1GainNode,
      vowel2,
      vowel2GainNode,
      shineHighpass,
      shineGainNode,
      colorBus,
      colorMaster,
      sum,
      finalOut,
    ],
  };
}

export function disconnectWaveStarterGradientToneGraph(graph: WaveStarterGradientToneGraph): void {
  graph.nodesToDisconnect.forEach((node) => {
    try { node.disconnect(); } catch {}
  });
}
