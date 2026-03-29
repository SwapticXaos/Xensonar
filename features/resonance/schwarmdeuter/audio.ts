import { MATERIAL_PROFILES } from "./materials";
import { SwarmAnalyser } from "./analysis";
import {
  DEFAULT_SCHWARMDEUTER_PARAMS,
  type SchwarmdeuterOptions,
  type SchwarmdeuterParams,
  type SwarmState,
  type ParticleFrameInput,
} from "./types";

const clamp01 = (value: number) => Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
const smoothstep = (value: number) => {
  const x = clamp01(value);
  return x * x * (3 - 2 * x);
};

const createSoftClipCurve = (amount: number, samples = 2048) => {
  const curve = new Float32Array(samples);
  const drive = Math.max(0.01, amount);
  for (let i = 0; i < samples; i += 1) {
    const x = (i / (samples - 1)) * 2 - 1;
    curve[i] = Math.tanh(x * drive);
  }
  return curve;
};

const ramp = (param: AudioParam, value: number, atTime: number, timeConstant = 0.03) => {
  param.cancelScheduledValues(atTime);
  param.setTargetAtTime(value, atTime, timeConstant);
};

class SchwarmdeuterEngine {
  readonly input: GainNode;
  readonly output: GainNode;

  private readonly dry: GainNode;
  private readonly wet: GainNode;
  private readonly makeup: GainNode;

  private readonly harzIn: GainNode;
  private readonly harzOut: GainNode;
  private readonly harzFilters: BiquadFilterNode[];
  private readonly harzGains: GainNode[];

  private readonly rissIn: GainNode;
  private readonly rissHighpass: BiquadFilterNode;
  private readonly rissDrive: GainNode;
  private readonly rissShaper: WaveShaperNode;
  private readonly rissLowpass: BiquadFilterNode;
  private readonly rissGain: GainNode;

  private readonly braidIn: GainNode;
  private readonly braidDelayL: DelayNode;
  private readonly braidDelayR: DelayNode;
  private readonly braidFeedbackL: GainNode;
  private readonly braidFeedbackR: GainNode;
  private readonly braidToneL: BiquadFilterNode;
  private readonly braidToneR: BiquadFilterNode;
  private readonly braidMerger: ChannelMergerNode;
  private readonly braidGain: GainNode;

  private readonly underIn: GainNode;
  private readonly underLowpass: BiquadFilterNode;
  private readonly underGain: GainNode;

  constructor(private readonly ctx: AudioContext) {
    this.input = ctx.createGain();
    this.output = ctx.createGain();
    this.dry = ctx.createGain();
    this.wet = ctx.createGain();
    this.makeup = ctx.createGain();

    this.input.connect(this.dry);
    this.dry.connect(this.output);
    this.wet.connect(this.makeup);
    this.makeup.connect(this.output);

    this.harzIn = ctx.createGain();
    this.harzOut = ctx.createGain();
    this.harzFilters = [];
    this.harzGains = [];
    this.input.connect(this.harzIn);
    for (let i = 0; i < 4; i += 1) {
      const filter = ctx.createBiquadFilter();
      filter.type = "bandpass";
      filter.frequency.value = 220 * (i + 1);
      filter.Q.value = 10;
      const gain = ctx.createGain();
      gain.gain.value = 0;
      this.harzIn.connect(filter);
      filter.connect(gain);
      gain.connect(this.harzOut);
      this.harzFilters.push(filter);
      this.harzGains.push(gain);
    }
    this.harzOut.connect(this.wet);

    this.rissIn = ctx.createGain();
    this.rissHighpass = ctx.createBiquadFilter();
    this.rissHighpass.type = "highpass";
    this.rissDrive = ctx.createGain();
    this.rissShaper = ctx.createWaveShaper();
    this.rissShaper.curve = createSoftClipCurve(2.1);
    this.rissShaper.oversample = "4x";
    this.rissLowpass = ctx.createBiquadFilter();
    this.rissLowpass.type = "lowpass";
    this.rissGain = ctx.createGain();
    this.rissGain.gain.value = 0;
    this.input.connect(this.rissIn);
    this.rissIn.connect(this.rissHighpass);
    this.rissHighpass.connect(this.rissDrive);
    this.rissDrive.connect(this.rissShaper);
    this.rissShaper.connect(this.rissLowpass);
    this.rissLowpass.connect(this.rissGain);
    this.rissGain.connect(this.wet);

    this.braidIn = ctx.createGain();
    this.braidDelayL = ctx.createDelay(1.5);
    this.braidDelayR = ctx.createDelay(1.5);
    this.braidFeedbackL = ctx.createGain();
    this.braidFeedbackR = ctx.createGain();
    this.braidToneL = ctx.createBiquadFilter();
    this.braidToneR = ctx.createBiquadFilter();
    this.braidToneL.type = "lowpass";
    this.braidToneR.type = "lowpass";
    this.braidMerger = ctx.createChannelMerger(2);
    this.braidGain = ctx.createGain();
    this.braidGain.gain.value = 0;

    this.input.connect(this.braidIn);
    this.braidIn.connect(this.braidDelayL);
    this.braidIn.connect(this.braidDelayR);
    this.braidDelayL.connect(this.braidToneL);
    this.braidDelayR.connect(this.braidToneR);
    this.braidToneL.connect(this.braidFeedbackL);
    this.braidToneR.connect(this.braidFeedbackR);
    this.braidFeedbackL.connect(this.braidDelayR);
    this.braidFeedbackR.connect(this.braidDelayL);
    this.braidDelayL.connect(this.braidMerger, 0, 0);
    this.braidDelayR.connect(this.braidMerger, 0, 1);
    this.braidMerger.connect(this.braidGain);
    this.braidGain.connect(this.wet);

    this.underIn = ctx.createGain();
    this.underLowpass = ctx.createBiquadFilter();
    this.underLowpass.type = "lowpass";
    this.underGain = ctx.createGain();
    this.underGain.gain.value = 0;
    this.input.connect(this.underIn);
    this.underIn.connect(this.underLowpass);
    this.underLowpass.connect(this.underGain);
    this.underGain.connect(this.wet);

    this.makeup.gain.value = 0.92;
    this.dry.gain.value = 0.9;
    this.wet.gain.value = 0.5;
    this.rissHighpass.frequency.value = 900;
    this.rissLowpass.frequency.value = 5400;
    this.rissDrive.gain.value = 1.5;
    this.braidDelayL.delayTime.value = 0.11;
    this.braidDelayR.delayTime.value = 0.16;
    this.braidFeedbackL.gain.value = 0.22;
    this.braidFeedbackR.gain.value = 0.18;
    this.braidToneL.frequency.value = 2400;
    this.braidToneR.frequency.value = 2800;
    this.underLowpass.frequency.value = 480;
  }

  apply(state: SwarmState, params: SchwarmdeuterParams) {
    const material = MATERIAL_PROFILES[params.material];
    const atTime = this.ctx.currentTime;
    const amount = params.bypass ? 0 : clamp01(params.amount);
    const interpretive = clamp01(params.interpretiveBias);
    const directness = 1 - interpretive;
    const descriptors = state.descriptors;
    const centroidHz = clamp(state.raw.spectralCentroidHz * material.brightness, 90, 3800);
    const weave = clamp01(params.weave);

    ramp(this.dry.gain, params.bypass ? 1 : 1 - amount * 0.34, atTime, 0.04);
    ramp(this.wet.gain, amount * 0.92, atTime, 0.04);
    ramp(this.makeup.gain, params.bypass ? 1 : 0.88 + amount * 0.18, atTime, 0.04);

    const harzVoice = amount * (descriptors.cohesion * 0.42 + descriptors.crystallization * 0.58) * (0.42 + interpretive * 0.58);
    const bandMultipliers = [1, 1.5, 2.05, 2.8];
    bandMultipliers.forEach((multiplier, index) => {
      const detune = 1 + (index - 1.5) * 0.04 * material.resonanceSpread;
      ramp(this.harzFilters[index].frequency, clamp(centroidHz * multiplier * detune, 80, 8000), atTime, 0.035);
      ramp(this.harzFilters[index].Q, material.resonanceQ + descriptors.crystallization * 9 - descriptors.turbulence * 3, atTime, 0.05);
      const harmonicFocus = index === 0 ? 0.9 : index === 1 ? 1 : 0.72 - index * 0.08;
      ramp(this.harzGains[index].gain, harzVoice * harmonicFocus * (0.4 + descriptors.pressure * 0.35), atTime, 0.05);
    });

    const fractureWeight = smoothstep(descriptors.fracture);
    const rissAmount = amount * (fractureWeight * 0.74 + descriptors.pressure * 0.18) * (0.25 + interpretive * 0.75);
    ramp(this.rissHighpass.frequency, 180 + fractureWeight * 3200 + descriptors.pressure * 700, atTime, 0.025);
    ramp(this.rissLowpass.frequency, 2200 + (1 - descriptors.fracture) * 3200 + descriptors.turbulence * 1800, atTime, 0.05);
    ramp(this.rissDrive.gain, 1 + rissAmount * 7 * material.shimmerDrive, atTime, 0.03);
    ramp(this.rissGain.gain, rissAmount, atTime, 0.03);

    const braidBase = amount * (descriptors.orbitality * 0.38 + descriptors.turbulence * 0.22 + descriptors.recurrence * 0.16) * (0.45 + weave * 0.55);
    const widthSkew = (descriptors.orbitality - 0.5) * material.stereoSpread;
    ramp(this.braidDelayL.delayTime, clamp(0.04 + descriptors.orbitality * 0.12 + directness * 0.02 - widthSkew * 0.02, 0.01, 0.45), atTime, 0.04);
    ramp(this.braidDelayR.delayTime, clamp(0.055 + descriptors.turbulence * 0.14 + interpretive * 0.03 + widthSkew * 0.02, 0.01, 0.45), atTime, 0.04);
    ramp(this.braidFeedbackL.gain, clamp(material.feedback * (0.5 + descriptors.recurrence * 0.45 + weave * 0.25), 0, 0.82), atTime, 0.05);
    ramp(this.braidFeedbackR.gain, clamp(material.feedback * (0.46 + descriptors.orbitality * 0.5 + weave * 0.22), 0, 0.82), atTime, 0.05);
    ramp(this.braidToneL.frequency, 1200 + centroidHz * 0.7 + descriptors.crystallization * 1400, atTime, 0.05);
    ramp(this.braidToneR.frequency, 1000 + centroidHz * 0.9 + descriptors.turbulence * 1600, atTime, 0.05);
    ramp(this.braidGain.gain, braidBase, atTime, 0.05);

    const underAmount = amount * material.undercurrent * (descriptors.recurrence * 0.48 + descriptors.cohesion * 0.18 + descriptors.pressure * 0.18) * (0.3 + interpretive * 0.7);
    ramp(this.underLowpass.frequency, 120 + descriptors.cohesion * 580 + descriptors.recurrence * 220, atTime, 0.08);
    ramp(this.underGain.gain, underAmount, atTime, 0.08);
  }

  dispose() {
    this.input.disconnect();
    this.output.disconnect();
    this.dry.disconnect();
    this.wet.disconnect();
    this.makeup.disconnect();
    this.harzIn.disconnect();
    this.harzOut.disconnect();
    this.harzFilters.forEach((node) => node.disconnect());
    this.harzGains.forEach((node) => node.disconnect());
    this.rissIn.disconnect();
    this.rissHighpass.disconnect();
    this.rissDrive.disconnect();
    this.rissShaper.disconnect();
    this.rissLowpass.disconnect();
    this.rissGain.disconnect();
    this.braidIn.disconnect();
    this.braidDelayL.disconnect();
    this.braidDelayR.disconnect();
    this.braidFeedbackL.disconnect();
    this.braidFeedbackR.disconnect();
    this.braidToneL.disconnect();
    this.braidToneR.disconnect();
    this.braidMerger.disconnect();
    this.braidGain.disconnect();
    this.underIn.disconnect();
    this.underLowpass.disconnect();
    this.underGain.disconnect();
  }
}

export class Schwarmdeuter {
  readonly input: GainNode;
  readonly output: GainNode;
  private readonly analyser = new SwarmAnalyser();
  private readonly engine: SchwarmdeuterEngine;
  private params: SchwarmdeuterParams;
  private lastState: SwarmState | null = null;

  constructor(ctx: AudioContext, options: SchwarmdeuterOptions = {}) {
    this.params = { ...DEFAULT_SCHWARMDEUTER_PARAMS, ...(options.params ?? {}) };
    this.engine = new SchwarmdeuterEngine(ctx);
    this.input = this.engine.input;
    this.output = this.engine.output;
  }

  setParams(next: Partial<SchwarmdeuterParams>) {
    this.params = { ...this.params, ...next };
    if (this.lastState) {
      this.engine.apply(this.lastState, this.params);
    }
  }

  getParams() {
    return { ...this.params };
  }

  connect(destination: AudioNode) {
    this.output.connect(destination);
    return this;
  }

  connectInput(source: AudioNode) {
    source.connect(this.input);
    return this;
  }

  update(frame: ParticleFrameInput) {
    const state = this.analyser.update(frame, this.params);
    this.lastState = state;
    this.engine.apply(state, this.params);
    return state;
  }

  dispose() {
    this.engine.dispose();
  }
}
