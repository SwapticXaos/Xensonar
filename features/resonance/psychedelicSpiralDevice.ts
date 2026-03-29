export interface PsychedelicSpiralOptions {
  enabled?: boolean;
  drive?: number;       // 0..1
  color?: number;       // 0..1
  motion?: number;      // 0..1
  feedback?: number;    // 0..1
  bloom?: number;       // 0..1
  mix?: number;         // 0..1
  stereoWidth?: number; // 0..1
  outputGain?: number;  // 0..1.5
}

type RequiredOptions = Required<PsychedelicSpiralOptions>;

const DEFAULTS: RequiredOptions = {
  enabled: true,
  drive: 0.42,
  color: 0.55,
  motion: 0.58,
  feedback: 0.34,
  bloom: 0.48,
  mix: 0.42,
  stereoWidth: 0.78,
  outputGain: 0.92,
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

const setSmooth = (param: AudioParam, value: number, ctx: BaseAudioContext, time = 0.03) => {
  const now = ctx.currentTime;
  param.cancelScheduledValues(now);
  param.setTargetAtTime(value, now, time);
};

const createWavefolderCurve = (amount: number, color: number, samples = 4096) => {
  const curve = new Float32Array(samples);
  const drive = lerp(1.5, 10.5, amount);
  const asym = lerp(0.02, 0.22, amount);
  const sparkle = lerp(0.0, 0.12, color);

  for (let i = 0; i < samples; i += 1) {
    const x = (i / (samples - 1)) * 2 - 1;
    const skew = x + asym * (1 - x * x);
    const folded = Math.tanh(skew * drive + 0.45 * amount * Math.pow(skew, 3));
    const rippled = folded + sparkle * Math.sin(folded * Math.PI * (1.4 + amount * 3.8));
    curve[i] = clamp(rippled / (1 + amount * 0.55), -1, 1);
  }

  return curve;
};

const createSoftClipCurve = (samples = 2048) => {
  const curve = new Float32Array(samples);
  for (let i = 0; i < samples; i += 1) {
    const x = (i / (samples - 1)) * 2 - 1;
    curve[i] = Math.tanh(x * 1.35);
  }
  return curve;
};

const createAllpassChain = (ctx: AudioContext, count: number) => {
  const filters = Array.from({ length: count }, () => {
    const f = ctx.createBiquadFilter();
    f.type = "allpass";
    f.Q.value = 0.9;
    return f;
  });

  for (let i = 0; i < filters.length - 1; i += 1) {
    filters[i].connect(filters[i + 1]);
  }

  return {
    input: filters[0],
    output: filters[filters.length - 1],
    filters,
  };
};

export class PsychedelicSpiralDevice {
  readonly context: AudioContext;
  readonly input: GainNode;
  readonly output: GainNode;

  private readonly dryGain: GainNode;
  private readonly wetGain: GainNode;
  private readonly wetInput: GainNode;
  private readonly wetCore: GainNode;

  private readonly preHighpass: BiquadFilterNode;
  private readonly preTilt: BiquadFilterNode;
  private readonly driveGain: GainNode;
  private readonly wavefolder: WaveShaperNode;
  private readonly dcBlock: BiquadFilterNode;

  private readonly leftChain: ReturnType<typeof createAllpassChain>;
  private readonly rightChain: ReturnType<typeof createAllpassChain>;
  private readonly leftDirectGain: GainNode;
  private readonly rightDirectGain: GainNode;

  private readonly leftDelayInput: GainNode;
  private readonly rightDelayInput: GainNode;
  private readonly leftDelay: DelayNode;
  private readonly rightDelay: DelayNode;
  private readonly leftDelayGain: GainNode;
  private readonly rightDelayGain: GainNode;

  private readonly leftFeedbackHP: BiquadFilterNode;
  private readonly rightFeedbackHP: BiquadFilterNode;
  private readonly leftFeedbackLP: BiquadFilterNode;
  private readonly rightFeedbackLP: BiquadFilterNode;
  private readonly leftCrossFeedback: GainNode;
  private readonly rightCrossFeedback: GainNode;
  private readonly leftSelfFeedback: GainNode;
  private readonly rightSelfFeedback: GainNode;

  private readonly leftShimmerHP: BiquadFilterNode;
  private readonly rightShimmerHP: BiquadFilterNode;
  private readonly leftShimmerDelay: DelayNode;
  private readonly rightShimmerDelay: DelayNode;
  private readonly leftShimmerGain: GainNode;
  private readonly rightShimmerGain: GainNode;

  private readonly leftBus: GainNode;
  private readonly rightBus: GainNode;
  private readonly leftToLeft: GainNode;
  private readonly leftToRight: GainNode;
  private readonly rightToLeft: GainNode;
  private readonly rightToRight: GainNode;
  private readonly stereoMerge: ChannelMergerNode;

  private readonly postCompressor: DynamicsCompressorNode;
  private readonly postLowpass: BiquadFilterNode;
  private readonly postPresence: BiquadFilterNode;
  private readonly postClipper: WaveShaperNode;
  private readonly outputTrim: GainNode;

  private readonly lfoSlow: OscillatorNode;
  private readonly lfoFast: OscillatorNode;
  private readonly lfoDrift: OscillatorNode;
  private readonly slowDepths: GainNode[];
  private readonly fastDepths: GainNode[];
  private readonly driftDepths: GainNode[];
  private readonly delayLfoDepthL: GainNode;
  private readonly delayLfoDepthR: GainNode;
  private readonly shimmerLfoDepthL: GainNode;
  private readonly shimmerLfoDepthR: GainNode;

  private options: RequiredOptions;
  private destroyed = false;

  constructor(context: AudioContext, options: PsychedelicSpiralOptions = {}) {
    this.context = context;
    this.options = { ...DEFAULTS, ...options };

    this.input = context.createGain();
    this.output = context.createGain();
    this.dryGain = context.createGain();
    this.wetGain = context.createGain();
    this.wetInput = context.createGain();
    this.wetCore = context.createGain();

    this.preHighpass = context.createBiquadFilter();
    this.preHighpass.type = "highpass";
    this.preTilt = context.createBiquadFilter();
    this.preTilt.type = "highshelf";
    this.driveGain = context.createGain();
    this.wavefolder = context.createWaveShaper();
    this.wavefolder.oversample = "4x";
    this.dcBlock = context.createBiquadFilter();
    this.dcBlock.type = "highpass";

    this.leftChain = createAllpassChain(context, 4);
    this.rightChain = createAllpassChain(context, 4);
    this.leftDirectGain = context.createGain();
    this.rightDirectGain = context.createGain();

    this.leftDelayInput = context.createGain();
    this.rightDelayInput = context.createGain();
    this.leftDelay = context.createDelay(1.5);
    this.rightDelay = context.createDelay(1.5);
    this.leftDelayGain = context.createGain();
    this.rightDelayGain = context.createGain();

    this.leftFeedbackHP = context.createBiquadFilter();
    this.leftFeedbackHP.type = "highpass";
    this.rightFeedbackHP = context.createBiquadFilter();
    this.rightFeedbackHP.type = "highpass";
    this.leftFeedbackLP = context.createBiquadFilter();
    this.leftFeedbackLP.type = "lowpass";
    this.rightFeedbackLP = context.createBiquadFilter();
    this.rightFeedbackLP.type = "lowpass";
    this.leftCrossFeedback = context.createGain();
    this.rightCrossFeedback = context.createGain();
    this.leftSelfFeedback = context.createGain();
    this.rightSelfFeedback = context.createGain();

    this.leftShimmerHP = context.createBiquadFilter();
    this.leftShimmerHP.type = "highpass";
    this.rightShimmerHP = context.createBiquadFilter();
    this.rightShimmerHP.type = "highpass";
    this.leftShimmerDelay = context.createDelay(0.3);
    this.rightShimmerDelay = context.createDelay(0.3);
    this.leftShimmerGain = context.createGain();
    this.rightShimmerGain = context.createGain();

    this.leftBus = context.createGain();
    this.rightBus = context.createGain();
    this.leftToLeft = context.createGain();
    this.leftToRight = context.createGain();
    this.rightToLeft = context.createGain();
    this.rightToRight = context.createGain();
    this.stereoMerge = context.createChannelMerger(2);

    this.postCompressor = context.createDynamicsCompressor();
    this.postLowpass = context.createBiquadFilter();
    this.postLowpass.type = "lowpass";
    this.postPresence = context.createBiquadFilter();
    this.postPresence.type = "peaking";
    this.postClipper = context.createWaveShaper();
    this.postClipper.curve = createSoftClipCurve();
    this.postClipper.oversample = "4x";
    this.outputTrim = context.createGain();

    this.lfoSlow = context.createOscillator();
    this.lfoSlow.type = "sine";
    this.lfoFast = context.createOscillator();
    this.lfoFast.type = "triangle";
    this.lfoDrift = context.createOscillator();
    this.lfoDrift.type = "sine";

    this.slowDepths = Array.from({ length: 8 }, () => context.createGain());
    this.fastDepths = Array.from({ length: 8 }, () => context.createGain());
    this.driftDepths = Array.from({ length: 8 }, () => context.createGain());
    this.delayLfoDepthL = context.createGain();
    this.delayLfoDepthR = context.createGain();
    this.shimmerLfoDepthL = context.createGain();
    this.shimmerLfoDepthR = context.createGain();

    this.buildGraph();
    this.startLfos();
    this.applyAllOptions(true);
  }

  private buildGraph() {
    // Dry path.
    this.input.connect(this.dryGain);
    this.dryGain.connect(this.output);

    // Wet preconditioning and nonlinear core.
    this.input.connect(this.wetInput);
    this.wetInput.connect(this.preHighpass);
    this.preHighpass.connect(this.preTilt);
    this.preTilt.connect(this.driveGain);
    this.driveGain.connect(this.wavefolder);
    this.wavefolder.connect(this.dcBlock);
    this.dcBlock.connect(this.wetCore);

    // Dual phaser body: one mono feed into two differentiated sides.
    this.wetCore.connect(this.leftChain.input);
    this.wetCore.connect(this.rightChain.input);

    this.leftChain.output.connect(this.leftDirectGain);
    this.leftDirectGain.connect(this.leftBus);
    this.rightChain.output.connect(this.rightDirectGain);
    this.rightDirectGain.connect(this.rightBus);

    // Delay branch.
    this.leftChain.output.connect(this.leftDelayInput);
    this.rightChain.output.connect(this.rightDelayInput);
    this.leftDelayInput.connect(this.leftDelay);
    this.rightDelayInput.connect(this.rightDelay);
    this.leftDelay.connect(this.leftDelayGain);
    this.leftDelayGain.connect(this.leftBus);
    this.rightDelay.connect(this.rightDelayGain);
    this.rightDelayGain.connect(this.rightBus);

    // Cross-feedback with band-limiting.
    this.leftDelay.connect(this.leftFeedbackHP);
    this.leftFeedbackHP.connect(this.leftFeedbackLP);
    this.leftFeedbackLP.connect(this.leftCrossFeedback);
    this.leftFeedbackLP.connect(this.leftSelfFeedback);
    this.leftCrossFeedback.connect(this.rightDelayInput);
    this.leftSelfFeedback.connect(this.leftDelayInput);

    this.rightDelay.connect(this.rightFeedbackHP);
    this.rightFeedbackHP.connect(this.rightFeedbackLP);
    this.rightFeedbackLP.connect(this.rightCrossFeedback);
    this.rightFeedbackLP.connect(this.rightSelfFeedback);
    this.rightCrossFeedback.connect(this.leftDelayInput);
    this.rightSelfFeedback.connect(this.rightDelayInput);

    // Sparkly halo branch.
    this.leftChain.output.connect(this.leftShimmerHP);
    this.leftShimmerHP.connect(this.leftShimmerDelay);
    this.leftShimmerDelay.connect(this.leftShimmerGain);
    this.leftShimmerGain.connect(this.leftBus);

    this.rightChain.output.connect(this.rightShimmerHP);
    this.rightShimmerHP.connect(this.rightShimmerDelay);
    this.rightShimmerDelay.connect(this.rightShimmerGain);
    this.rightShimmerGain.connect(this.rightBus);

    // Width matrix.
    this.leftBus.connect(this.leftToLeft);
    this.leftBus.connect(this.leftToRight);
    this.rightBus.connect(this.rightToLeft);
    this.rightBus.connect(this.rightToRight);

    this.leftToLeft.connect(this.stereoMerge, 0, 0);
    this.rightToLeft.connect(this.stereoMerge, 0, 0);
    this.leftToRight.connect(this.stereoMerge, 0, 1);
    this.rightToRight.connect(this.stereoMerge, 0, 1);

    // Wet output finishing.
    this.stereoMerge.connect(this.postCompressor);
    this.postCompressor.connect(this.postLowpass);
    this.postLowpass.connect(this.postPresence);
    this.postPresence.connect(this.postClipper);
    this.postClipper.connect(this.outputTrim);
    this.outputTrim.connect(this.wetGain);
    this.wetGain.connect(this.output);

    // LFO routing: staggered allpass modulation.
    const leftTargets = this.leftChain.filters.map((filter) => filter.frequency);
    const rightTargets = this.rightChain.filters.map((filter) => filter.frequency);
    const allTargets = [...leftTargets, ...rightTargets];

    allTargets.forEach((target, index) => {
      this.lfoSlow.connect(this.slowDepths[index]);
      this.slowDepths[index].connect(target);
      this.lfoFast.connect(this.fastDepths[index]);
      this.fastDepths[index].connect(target);
      this.lfoDrift.connect(this.driftDepths[index]);
      this.driftDepths[index].connect(target);
    });

    this.lfoSlow.connect(this.delayLfoDepthL);
    this.delayLfoDepthL.connect(this.leftDelay.delayTime);
    this.lfoFast.connect(this.delayLfoDepthR);
    this.delayLfoDepthR.connect(this.rightDelay.delayTime);
    this.lfoDrift.connect(this.shimmerLfoDepthL);
    this.shimmerLfoDepthL.connect(this.leftShimmerDelay.delayTime);
    this.lfoSlow.connect(this.shimmerLfoDepthR);
    this.shimmerLfoDepthR.connect(this.rightShimmerDelay.delayTime);
  }

  private startLfos() {
    this.lfoSlow.start();
    this.lfoFast.start();
    this.lfoDrift.start();
  }

  private applyAllOptions(force = false) {
    const ctx = this.context;
    const o = this.options;

    this.wavefolder.curve = createWavefolderCurve(o.drive, o.color);

    const dry = o.enabled ? Math.cos(o.mix * Math.PI * 0.5) : 1;
    const wet = o.enabled ? Math.sin(o.mix * Math.PI * 0.5) : 0;
    setSmooth(this.dryGain.gain, dry, ctx, force ? 0.001 : 0.03);
    setSmooth(this.wetGain.gain, wet, ctx, force ? 0.001 : 0.03);

    setSmooth(this.preHighpass.frequency, lerp(40, 280, o.color * o.drive), ctx);
    setSmooth(this.preTilt.gain, lerp(-3, 9, o.color), ctx);
    setSmooth(this.driveGain.gain, lerp(1.2, 11.5, o.drive), ctx);
    setSmooth(this.dcBlock.frequency, 22, ctx, force ? 0.001 : 0.05);

    const leftBases = [300, 540, 920, 1480].map((value, index) => value * (1 + o.color * 0.9 + index * 0.05));
    const rightBases = [360, 620, 1020, 1640].map((value, index) => value * (1 + o.color * 0.82 + index * 0.04));
    this.leftChain.filters.forEach((filter, index) => {
      setSmooth(filter.frequency, leftBases[index], ctx);
      setSmooth(filter.Q, lerp(0.65, 1.45, o.color), ctx);
    });
    this.rightChain.filters.forEach((filter, index) => {
      setSmooth(filter.frequency, rightBases[index], ctx);
      setSmooth(filter.Q, lerp(0.7, 1.5, o.color), ctx);
    });

    const motion = o.motion;
    this.lfoSlow.frequency.setValueAtTime(lerp(0.05, 0.34, motion), ctx.currentTime);
    this.lfoFast.frequency.setValueAtTime(lerp(0.11, 1.35, motion), ctx.currentTime);
    this.lfoDrift.frequency.setValueAtTime(lerp(0.017, 0.12, motion), ctx.currentTime);

    const modSigns = [1, -1, 0.6, -0.45, -1, 1, -0.58, 0.42];
    this.slowDepths.forEach((gain, index) => {
      const depth = lerp(18, 650, motion) * modSigns[index];
      setSmooth(gain.gain, depth, ctx);
    });
    this.fastDepths.forEach((gain, index) => {
      const depth = lerp(6, 210, motion) * -modSigns[index] * 0.52;
      setSmooth(gain.gain, depth, ctx);
    });
    this.driftDepths.forEach((gain, index) => {
      const depth = lerp(2, 85, motion) * (index % 2 === 0 ? 1 : -1);
      setSmooth(gain.gain, depth, ctx);
    });

    const bloom = o.bloom;
    setSmooth(this.leftDirectGain.gain, lerp(0.95, 0.55, bloom), ctx);
    setSmooth(this.rightDirectGain.gain, lerp(0.95, 0.55, bloom), ctx);
    setSmooth(this.leftDelayInput.gain, lerp(0.22, 0.8, bloom), ctx);
    setSmooth(this.rightDelayInput.gain, lerp(0.22, 0.8, bloom), ctx);
    setSmooth(this.leftDelay.delayTime, lerp(0.09, 0.36, bloom), ctx);
    setSmooth(this.rightDelay.delayTime, lerp(0.12, 0.42, bloom), ctx);
    setSmooth(this.leftDelayGain.gain, lerp(0.18, 0.68, bloom), ctx);
    setSmooth(this.rightDelayGain.gain, lerp(0.18, 0.68, bloom), ctx);

    this.leftFeedbackHP.frequency.value = lerp(220, 580, o.color);
    this.rightFeedbackHP.frequency.value = lerp(220, 580, o.color);
    this.leftFeedbackLP.frequency.value = lerp(2400, 9800, o.color);
    this.rightFeedbackLP.frequency.value = lerp(2400, 9800, o.color);

    const feedback = o.feedback;
    setSmooth(this.leftCrossFeedback.gain, lerp(0.04, 0.58, feedback), ctx);
    setSmooth(this.rightCrossFeedback.gain, lerp(0.04, 0.58, feedback), ctx);
    setSmooth(this.leftSelfFeedback.gain, lerp(0.01, 0.24, feedback), ctx);
    setSmooth(this.rightSelfFeedback.gain, lerp(0.01, 0.24, feedback), ctx);

    this.leftShimmerHP.frequency.value = lerp(1700, 5200, o.color);
    this.rightShimmerHP.frequency.value = lerp(1700, 5200, o.color);
    setSmooth(this.leftShimmerDelay.delayTime, lerp(0.018, 0.09, bloom), ctx);
    setSmooth(this.rightShimmerDelay.delayTime, lerp(0.023, 0.11, bloom), ctx);
    setSmooth(this.leftShimmerGain.gain, lerp(0.02, 0.22, bloom * o.color), ctx);
    setSmooth(this.rightShimmerGain.gain, lerp(0.02, 0.22, bloom * o.color), ctx);

    setSmooth(this.delayLfoDepthL.gain, lerp(0.0008, 0.012, motion * bloom), ctx);
    setSmooth(this.delayLfoDepthR.gain, lerp(-0.001, -0.014, motion * bloom), ctx);
    setSmooth(this.shimmerLfoDepthL.gain, lerp(0.0002, 0.0032, motion * o.color), ctx);
    setSmooth(this.shimmerLfoDepthR.gain, lerp(-0.0003, -0.0042, motion * o.color), ctx);

    const width = clamp(o.stereoWidth, 0, 1);
    const monoBleed = (1 - width) * 0.5;
    setSmooth(this.leftToLeft.gain, 1 - monoBleed, ctx);
    setSmooth(this.rightToRight.gain, 1 - monoBleed, ctx);
    setSmooth(this.leftToRight.gain, monoBleed, ctx);
    setSmooth(this.rightToLeft.gain, monoBleed, ctx);

    this.postCompressor.threshold.value = lerp(-21, -13, o.drive * 0.65 + bloom * 0.35);
    this.postCompressor.knee.value = 18;
    this.postCompressor.ratio.value = lerp(1.8, 3.1, bloom);
    this.postCompressor.attack.value = lerp(0.01, 0.04, bloom);
    this.postCompressor.release.value = lerp(0.12, 0.28, motion);

    this.postLowpass.frequency.value = lerp(3600, 15000, o.color);
    this.postPresence.frequency.value = lerp(1100, 3600, o.color);
    this.postPresence.Q.value = 0.8;
    this.postPresence.gain.value = lerp(0.5, 5.0, o.color * (1 - o.drive * 0.35));

    const autoComp = 1 / lerp(1.0, 1.95, o.drive);
    setSmooth(this.outputTrim.gain, clamp(o.outputGain * autoComp, 0.25, 1.5), ctx);
  }

  setOptions(next: PsychedelicSpiralOptions) {
    if (this.destroyed) return;
    this.options = { ...this.options, ...next };
    this.options.drive = clamp(this.options.drive, 0, 1);
    this.options.color = clamp(this.options.color, 0, 1);
    this.options.motion = clamp(this.options.motion, 0, 1);
    this.options.feedback = clamp(this.options.feedback, 0, 1);
    this.options.bloom = clamp(this.options.bloom, 0, 1);
    this.options.mix = clamp(this.options.mix, 0, 1);
    this.options.stereoWidth = clamp(this.options.stereoWidth, 0, 1);
    this.options.outputGain = clamp(this.options.outputGain, 0, 1.5);
    this.applyAllOptions(false);
  }

  getOptions(): RequiredOptions {
    return { ...this.options };
  }

  connect(destination: AudioNode | AudioParam) {
    // AudioNode.connect is overloaded; preserve the same flexibility here.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (this.output as any).connect(destination as any);
  }

  disconnect() {
    this.output.disconnect();
  }

  destroy() {
    if (this.destroyed) return;
    this.destroyed = true;
    const now = this.context.currentTime;
    try {
      this.lfoSlow.stop(now + 0.01);
      this.lfoFast.stop(now + 0.01);
      this.lfoDrift.stop(now + 0.01);
    } catch {
      // Ignore repeated stop calls.
    }
    this.disconnect();
    this.input.disconnect();
  }
}

export const createPsychedelicSpiralDevice = (context: AudioContext, options: PsychedelicSpiralOptions = {}) =>
  new PsychedelicSpiralDevice(context, options);
