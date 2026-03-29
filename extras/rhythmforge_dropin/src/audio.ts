import type { BassStep, DrumStep, GeneratedPattern, RhythmForgeParams } from "./types";

const clamp01 = (value: number) => Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

function createSoftClipCurve(amount: number, points = 1024) {
  const curve = new Float32Array(points);
  const drive = Math.max(0.1, amount);
  for (let i = 0; i < points; i += 1) {
    const x = (i / (points - 1)) * 2 - 1;
    curve[i] = Math.tanh(x * drive);
  }
  return curve;
}

function createNoiseBuffer(ctx: AudioContext, seconds = 1) {
  const length = Math.max(1, Math.floor(ctx.sampleRate * seconds));
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i += 1) {
    data[i] = Math.random() * 2 - 1;
  }
  return buffer;
}

export class RhythmForgeAudioEngine {
  readonly output: GainNode;
  readonly input: GainNode;

  private readonly master: GainNode;
  private readonly driveIn: GainNode;
  private readonly driveShaper: WaveShaperNode;
  private readonly driveOut: GainNode;
  private readonly bassBus: GainNode;
  private readonly drumBus: GainNode;
  private readonly sidechainGain: GainNode;
  private readonly noiseBuffer: AudioBuffer;
  private disposed = false;

  constructor(private readonly ctx: AudioContext) {
    this.input = ctx.createGain();
    this.output = ctx.createGain();
    this.master = ctx.createGain();
    this.driveIn = ctx.createGain();
    this.driveShaper = ctx.createWaveShaper();
    this.driveOut = ctx.createGain();
    this.bassBus = ctx.createGain();
    this.drumBus = ctx.createGain();
    this.sidechainGain = ctx.createGain();
    this.noiseBuffer = createNoiseBuffer(ctx, 1.25);

    this.driveShaper.curve = createSoftClipCurve(1.5);
    this.driveShaper.oversample = "4x";

    this.bassBus.connect(this.sidechainGain);
    this.drumBus.connect(this.sidechainGain);
    this.sidechainGain.connect(this.driveIn);
    this.driveIn.connect(this.driveShaper);
    this.driveShaper.connect(this.driveOut);
    this.driveOut.connect(this.master);
    this.master.connect(this.output);

    this.sidechainGain.gain.value = 1;
    this.driveIn.gain.value = 1;
    this.driveOut.gain.value = 0.92;
    this.master.gain.value = 0.86;
  }

  setParams(params: RhythmForgeParams) {
    const t = this.ctx.currentTime;
    this.master.gain.cancelScheduledValues(t);
    this.master.gain.linearRampToValueAtTime(params.outputGain, t + 0.04);
    this.driveIn.gain.cancelScheduledValues(t);
    this.driveIn.gain.linearRampToValueAtTime(1 + params.drive * 2.2, t + 0.04);
    this.driveOut.gain.cancelScheduledValues(t);
    this.driveOut.gain.linearRampToValueAtTime(0.92 - params.drive * 0.08, t + 0.04);
  }

  schedulePattern(pattern: GeneratedPattern, params: RhythmForgeParams, barStartTime: number) {
    const stepDuration = 60 / params.tempo / 4;
    for (let i = 0; i < pattern.bass.length; i += 1) {
      const swingOffset = i % 2 === 1 ? stepDuration * pattern.swing : 0;
      const human = ((Math.sin((pattern.barIndex + 1) * 17 + i * 11) + 1) * 0.5 - 0.5) * params.humanize;
      const stepTime = barStartTime + i * stepDuration + swingOffset + human;

      if (params.drumsAmount > 0) {
        if (pattern.kick[i]?.active) this.triggerKick(stepTime, pattern.kick[i], params);
        if (pattern.snare[i]?.active) this.triggerSnare(stepTime, pattern.snare[i], params);
        if (pattern.hat[i]?.active) this.triggerHat(stepTime, pattern.hat[i], params);
      }
      if (params.bassAmount > 0 && pattern.bass[i]?.active) {
        this.triggerBass(stepTime, i, pattern, params);
      }
    }
  }

  private triggerKick(time: number, step: DrumStep, params: RhythmForgeParams) {
    const osc = this.ctx.createOscillator();
    const clickOsc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const clickGain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 180;
    filter.Q.value = 1.2;

    const accent = clamp01(step.accent ?? 0.8);
    const amount = params.drumsAmount;
    const startFreq = 92 + accent * 28;
    const endFreq = 34 + accent * 4;

    osc.type = "sine";
    osc.frequency.setValueAtTime(startFreq, time);
    osc.frequency.exponentialRampToValueAtTime(endFreq, time + 0.16);

    clickOsc.type = "triangle";
    clickOsc.frequency.setValueAtTime(880, time);
    clickOsc.frequency.exponentialRampToValueAtTime(120, time + 0.02);

    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.exponentialRampToValueAtTime(0.88 * amount * (0.65 + accent * 0.45), time + 0.002);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.22);

    clickGain.gain.setValueAtTime(0.0001, time);
    clickGain.gain.exponentialRampToValueAtTime(0.14 * amount * (0.5 + accent), time + 0.001);
    clickGain.gain.exponentialRampToValueAtTime(0.0001, time + 0.03);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.drumBus);

    clickOsc.connect(clickGain);
    clickGain.connect(this.drumBus);

    this.duckBass(time, 0.82 - accent * 0.18, 0.12);

    osc.start(time);
    clickOsc.start(time);
    osc.stop(time + 0.24);
    clickOsc.stop(time + 0.04);
  }

  private triggerSnare(time: number, step: DrumStep, params: RhythmForgeParams) {
    const noise = this.ctx.createBufferSource();
    noise.buffer = this.noiseBuffer;
    const noiseFilter = this.ctx.createBiquadFilter();
    noiseFilter.type = "bandpass";
    const toneOsc = this.ctx.createOscillator();
    const toneGain = this.ctx.createGain();
    const noiseGain = this.ctx.createGain();
    const sum = this.ctx.createGain();

    const accent = clamp01(step.accent ?? 0.7);
    const amount = params.drumsAmount;

    noiseFilter.frequency.value = 1800 + accent * 900;
    noiseFilter.Q.value = 0.85 + accent * 0.5;
    noiseGain.gain.setValueAtTime(0.0001, time);
    noiseGain.gain.exponentialRampToValueAtTime(0.32 * amount * (0.45 + accent * 0.55), time + 0.001);
    noiseGain.gain.exponentialRampToValueAtTime(0.0001, time + 0.16);

    toneOsc.type = "triangle";
    toneOsc.frequency.setValueAtTime(210 + accent * 40, time);
    toneOsc.frequency.exponentialRampToValueAtTime(140, time + 0.08);
    toneGain.gain.setValueAtTime(0.0001, time);
    toneGain.gain.exponentialRampToValueAtTime(0.16 * amount * (0.5 + accent * 0.5), time + 0.002);
    toneGain.gain.exponentialRampToValueAtTime(0.0001, time + 0.11);

    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(sum);
    toneOsc.connect(toneGain);
    toneGain.connect(sum);
    sum.connect(this.drumBus);

    noise.start(time);
    toneOsc.start(time);
    noise.stop(time + 0.18);
    toneOsc.stop(time + 0.14);
  }

  private triggerHat(time: number, step: DrumStep, params: RhythmForgeParams) {
    const noise = this.ctx.createBufferSource();
    noise.buffer = this.noiseBuffer;
    const hp = this.ctx.createBiquadFilter();
    const bp = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();
    const accent = clamp01(step.accent ?? 0.45);
    const amount = params.drumsAmount;

    hp.type = "highpass";
    hp.frequency.value = Math.max(2500, params.hatBrightness * (0.74 + accent * 0.18));
    bp.type = "bandpass";
    bp.frequency.value = hp.frequency.value * 1.2;
    bp.Q.value = 0.65;

    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.exponentialRampToValueAtTime(0.12 * amount * (0.4 + accent * 0.8), time + 0.001);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.05 + accent * 0.02);

    noise.connect(hp);
    hp.connect(bp);
    bp.connect(gain);
    gain.connect(this.drumBus);

    noise.start(time);
    noise.stop(time + 0.07);
  }

  private triggerBass(time: number, stepIndex: number, pattern: GeneratedPattern, params: RhythmForgeParams) {
    const step = pattern.bass[stepIndex];
    if (!step?.active) return;

    const noteSeconds = (60 / params.tempo / 4) * pattern.noteLength;
    const nextStep = pattern.bass[(stepIndex + 1) % pattern.bass.length];
    const accent = clamp01(step.accent ?? 0.7);
    const amount = params.bassAmount;
    const root = pattern.rootHz;
    const freq = clamp(root * step.ratio * Math.pow(2, step.octave), 24, 440);

    const oscA = this.ctx.createOscillator();
    const oscB = this.ctx.createOscillator();
    const sub = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const vca = this.ctx.createGain();
    const mix = this.ctx.createGain();

    oscA.type = "sawtooth";
    oscB.type = "triangle";
    sub.type = "sine";
    oscA.frequency.setValueAtTime(freq, time);
    oscB.frequency.setValueAtTime(freq * 0.998, time);
    sub.frequency.setValueAtTime(freq * 0.5, time);

    if (step.glideToNext && nextStep?.active) {
      const nextFreq = clamp(root * nextStep.ratio * Math.pow(2, nextStep.octave), 24, 440);
      oscA.frequency.exponentialRampToValueAtTime(nextFreq, time + noteSeconds * 0.94);
      oscB.frequency.exponentialRampToValueAtTime(nextFreq * 0.998, time + noteSeconds * 0.94);
      sub.frequency.exponentialRampToValueAtTime(nextFreq * 0.5, time + noteSeconds * 0.94);
    }

    mix.gain.value = 0.44 + amount * 0.25;
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(clamp(params.bassCutoff * (0.72 + accent * 0.7), 120, 3400), time);
    filter.Q.setValueAtTime(0.6 + accent * 0.8, time);
    filter.frequency.exponentialRampToValueAtTime(clamp(params.bassCutoff * (0.54 + accent * 0.28), 90, 3000), time + noteSeconds * 0.82);

    vca.gain.setValueAtTime(0.0001, time);
    vca.gain.exponentialRampToValueAtTime(0.42 * amount * (0.62 + accent * 0.62), time + 0.007);
    const releaseTime = step.tie ? noteSeconds * 1.25 : noteSeconds;
    vca.gain.exponentialRampToValueAtTime(0.0001, time + Math.max(0.04, releaseTime));

    oscA.connect(mix);
    oscB.connect(mix);
    sub.connect(mix);
    mix.connect(filter);
    filter.connect(vca);
    vca.connect(this.bassBus);

    oscA.start(time);
    oscB.start(time);
    sub.start(time);
    const stopAt = time + Math.max(0.08, releaseTime + 0.02);
    oscA.stop(stopAt);
    oscB.stop(stopAt);
    sub.stop(stopAt);
  }

  private duckBass(time: number, floor: number, recoverySeconds: number) {
    const g = this.sidechainGain.gain;
    g.cancelScheduledValues(time);
    g.setValueAtTime(g.value || 1, time);
    g.linearRampToValueAtTime(clamp(floor, 0.55, 1), time + 0.004);
    g.linearRampToValueAtTime(1, time + recoverySeconds);
  }

  connect(destination: AudioNode) {
    this.output.connect(destination);
  }

  disconnect() {
    this.output.disconnect();
  }

  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this.input.disconnect();
    this.output.disconnect();
    this.master.disconnect();
    this.driveIn.disconnect();
    this.driveShaper.disconnect();
    this.driveOut.disconnect();
    this.bassBus.disconnect();
    this.drumBus.disconnect();
    this.sidechainGain.disconnect();
  }
}
