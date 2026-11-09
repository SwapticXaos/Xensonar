import { clamp } from "../rooms/resonanceRuntimeMath";

export const DIRTY_ROOT_FOLLOW_CRAZY_FLUTTER_LABEL = "Crazy Flutter" as const;

export type DirtyRootFollowWalzeMode = "flowing" | "grainy";

export type DirtyRootFollowWalzeFireArgs = {
  buffer: AudioBuffer;
  bufferId: string;
  loopStartSec: number;
  loopEndSec: number;
  targetGain: number;
  /** Beat-/bar-locked source transport rate. Keeps the loop phase tied to the Root-Follow bar. */
  transportRate: number;
  /** Pitch/Root-Follow elastic rate from the legacy renderer. Used directly in grainy mode, softened in flowing mode. */
  pitchRate: number;
  /** AudioContext time copied from the legacy renderer window. The walze may start here, not at an arbitrary now. */
  startAtSec: number;
  /** Current source phase that the old slice renderer would have sampled at startAtSec. */
  sourceOffsetSec: number;
  /** Local source window around sourceOffset for the dirty granular jaw. Flowing keeps the full material loop. */
  sourceWindowSec: number;
  mode: DirtyRootFollowWalzeMode;
  grainFrequencyHz?: number;
  lfoModulationDepth?: number;
};

type DirtyRootFollowCylinder = {
  source: AudioBufferSourceNode | null;
  vca: GainNode;
  panner: StereoPannerNode;
  lfo: OscillatorNode;
  lfoGain: GainNode;
  inUse: boolean;
  currentBufferId: string | null;
  currentLoopStartSec: number | null;
  currentLoopEndSec: number | null;
  currentSourceOffsetSec: number | null;
  currentMode: DirtyRootFollowWalzeMode | null;
  lastUsedAtSec: number;
};

function sanitizeLoopWindow(args: {
  buffer: AudioBuffer;
  loopStartSec: number;
  loopEndSec: number;
  sourceOffsetSec: number;
  sourceWindowSec: number;
  mode: DirtyRootFollowWalzeMode;
}) {
  const bufferDuration = Math.max(0.024, args.buffer.duration || 0.024);
  const safeLoopStart = clamp(args.loopStartSec, 0, Math.max(0, bufferDuration - 0.024));
  const safeLoopEnd = Math.max(
    safeLoopStart + 0.024,
    Math.min(args.loopEndSec, bufferDuration),
  );
  const safeSourceOffset = clamp(args.sourceOffsetSec, safeLoopStart, Math.max(safeLoopStart, safeLoopEnd - 0.002));
  if (args.mode === "flowing") {
    return {
      loopStartSec: safeLoopStart,
      loopEndSec: safeLoopEnd,
      sourceOffsetSec: safeSourceOffset,
      recenterThresholdSec: Math.max(0.12, (safeLoopEnd - safeLoopStart) * 0.18),
    };
  }

  const localWindow = clamp(args.sourceWindowSec, 0.038, Math.max(0.04, Math.min(0.34, safeLoopEnd - safeLoopStart)));
  const half = localWindow * 0.5;
  const start = clamp(safeSourceOffset - half, safeLoopStart, Math.max(safeLoopStart, safeLoopEnd - localWindow));
  const end = Math.max(start + 0.024, Math.min(safeLoopEnd, start + localWindow));
  return {
    loopStartSec: start,
    loopEndSec: end,
    sourceOffsetSec: clamp(safeSourceOffset, start, Math.max(start, end - 0.002)),
    recenterThresholdSec: Math.max(0.022, Math.min(0.12, localWindow * 0.42)),
  };
}

function shouldRecenterCylinder(
  cylinder: DirtyRootFollowCylinder,
  next: {
    bufferId: string;
    mode: DirtyRootFollowWalzeMode;
    sourceOffsetSec: number;
    loopStartSec: number;
    loopEndSec: number;
    recenterThresholdSec: number;
  },
) {
  if (!cylinder.source) return true;
  if (cylinder.currentBufferId !== next.bufferId) return true;
  if (cylinder.currentMode !== next.mode) return true;
  if (cylinder.currentSourceOffsetSec === null) return true;
  if (cylinder.currentLoopStartSec === null || cylinder.currentLoopEndSec === null) return true;
  if (Math.abs(cylinder.currentLoopStartSec - next.loopStartSec) > next.recenterThresholdSec) return true;
  if (Math.abs(cylinder.currentLoopEndSec - next.loopEndSec) > next.recenterThresholdSec) return true;
  if (next.mode === "flowing") {
    // Flowing is the beat-locked tape motor: once the band is laid on the
    // transport phase, sourceOffset drift is produced by native playbackRate.
    // Re-centering flowing on every poll reintroduces the old entry crackle.
    return false;
  }
  return Math.abs(cylinder.currentSourceOffsetSec - next.sourceOffsetSec) > next.recenterThresholdSec;
}

export class DirtyRootFollowWalze {
  private readonly ctx: AudioContext;
  private readonly outputBus: GainNode;
  private readonly elasticInput: GainNode;
  private readonly compressor: DynamicsCompressorNode;
  private readonly cylinders: DirtyRootFollowCylinder[] = [];
  public disposed = false;

  constructor(ctx: AudioContext, targetBus: AudioNode) {
    this.ctx = ctx;

    this.outputBus = ctx.createGain();
    this.outputBus.gain.value = 0.72;

    this.elasticInput = ctx.createGain();
    this.elasticInput.gain.value = 0.0001;
    this.elasticInput.connect(this.outputBus);

    this.compressor = ctx.createDynamicsCompressor();
    this.compressor.threshold.value = -14;
    this.compressor.knee.value = 6;
    this.compressor.ratio.value = 6;
    this.compressor.attack.value = 0.004;
    this.compressor.release.value = 0.09;

    this.outputBus.connect(this.compressor);
    this.compressor.connect(targetBus);

    for (let i = 0; i < 4; i += 1) {
      const vca = ctx.createGain();
      const panner = ctx.createStereoPanner();
      const lfo = ctx.createOscillator();
      const lfoGain = ctx.createGain();

      vca.gain.value = 0.0001;
      panner.pan.value = (i % 2 === 0 ? -0.12 : 0.12) * (1 + i * 0.15);

      lfo.type = "sine";
      lfo.frequency.value = 16;
      lfoGain.gain.value = 0;

      lfo.connect(lfoGain);
      lfoGain.connect(vca.gain);
      vca.connect(panner);
      panner.connect(this.outputBus);
      lfo.start();

      this.cylinders.push({
        source: null,
        vca,
        panner,
        lfo,
        lfoGain,
        inUse: false,
        currentBufferId: null,
        currentLoopStartSec: null,
        currentLoopEndSec: null,
        currentSourceOffsetSec: null,
        currentMode: null,
        lastUsedAtSec: 0,
      });
    }
  }

  public feuern(args: DirtyRootFollowWalzeFireArgs): void {
    if (this.disposed) return;
    const now = this.ctx.currentTime;
    const safeGain = clamp(args.targetGain, 0, 0.22);
    const transportRate = clamp(args.transportRate, 0.125, 8);
    const pitchRate = clamp(args.pitchRate, 0.125, 8);
    const mode = args.mode;
    const window = sanitizeLoopWindow({
      buffer: args.buffer,
      loopStartSec: args.loopStartSec,
      loopEndSec: args.loopEndSec,
      sourceOffsetSec: args.sourceOffsetSec,
      sourceWindowSec: args.sourceWindowSec,
      mode,
    });
    const playbackRate = mode === "grainy"
      ? pitchRate
      : transportRate;

    let cylinder = this.cylinders.find((candidate) => candidate.currentBufferId === args.bufferId && candidate.currentMode === mode);
    if (!cylinder) {
      cylinder =
        this.cylinders.find((candidate) => !candidate.inUse) ??
        this.cylinders.reduce((oldest, candidate) =>
          candidate.lastUsedAtSec < oldest.lastUsedAtSec ? candidate : oldest,
        );
    }

    if (shouldRecenterCylinder(cylinder, {
      bufferId: args.bufferId,
      mode,
      sourceOffsetSec: window.sourceOffsetSec,
      loopStartSec: window.loopStartSec,
      loopEndSec: window.loopEndSec,
      recenterThresholdSec: window.recenterThresholdSec,
    })) {
      this.replaceBand(cylinder, {
        buffer: args.buffer,
        bufferId: args.bufferId,
        loopStartSec: window.loopStartSec,
        loopEndSec: window.loopEndSec,
        sourceOffsetSec: window.sourceOffsetSec,
        playbackRate,
        mode,
        startAtSec: args.startAtSec,
      });
    } else if (cylinder.source) {
      cylinder.source.loopStart = window.loopStartSec;
      cylinder.source.loopEnd = window.loopEndSec;
      cylinder.currentLoopStartSec = window.loopStartSec;
      cylinder.currentLoopEndSec = window.loopEndSec;
      cylinder.currentSourceOffsetSec = window.sourceOffsetSec;
    }

    cylinder.inUse = true;
    cylinder.lastUsedAtSec = now;

    if (cylinder.source) {
      cylinder.source.playbackRate.cancelScheduledValues(now);
      cylinder.source.playbackRate.setTargetAtTime(playbackRate, now, mode === "grainy" ? 0.018 : 0.045);
    }

    const grainy = mode === "grainy" && !!args.grainFrequencyHz && args.grainFrequencyHz > 0;
    const modulationDepth = clamp(args.lfoModulationDepth ?? 0.85, 0, 1);

    cylinder.vca.gain.cancelScheduledValues(now);
    cylinder.lfoGain.gain.cancelScheduledValues(now);
    cylinder.lfo.frequency.cancelScheduledValues(now);

    if (grainy) {
      const base = Math.max(0.0001, safeGain * (1 - modulationDepth * 0.5));
      const depth = safeGain * modulationDepth * 0.5;
      cylinder.vca.gain.setTargetAtTime(base, now, 0.022);
      cylinder.lfo.frequency.setTargetAtTime(clamp(args.grainFrequencyHz ?? 18, 0.5, 80), now, 0.02);
      cylinder.lfoGain.gain.setTargetAtTime(depth, now, 0.02);
    } else {
      cylinder.vca.gain.setTargetAtTime(Math.max(0.0001, safeGain), now, 0.055);
      cylinder.lfoGain.gain.setTargetAtTime(0, now, 0.055);
    }
  }

  public drosselnWalzeBedOnly(): void {
    if (this.disposed) return;
    const now = this.ctx.currentTime;
    for (const cylinder of this.cylinders) {
      cylinder.vca.gain.cancelScheduledValues(now);
      cylinder.lfoGain.gain.cancelScheduledValues(now);
      cylinder.vca.gain.setTargetAtTime(0.0001, now, 0.06);
      cylinder.lfoGain.gain.setTargetAtTime(0, now, 0.06);
      cylinder.inUse = false;
      cylinder.lastUsedAtSec = now;
    }
  }

  public getElasticDestination(): GainNode {
    return this.elasticInput;
  }

  public setElasticGain(targetGain: number, timeConstant = 0.035): void {
    if (this.disposed) return;
    const now = this.ctx.currentTime;
    this.elasticInput.gain.cancelScheduledValues(now);
    this.elasticInput.gain.setTargetAtTime(clamp(targetGain, 0, 0.22), now, Math.max(0.008, timeConstant));
  }

  public drosseln(): void {
    if (this.disposed) return;
    const now = this.ctx.currentTime;
    this.elasticInput.gain.cancelScheduledValues(now);
    this.elasticInput.gain.setTargetAtTime(0.0001, now, 0.08);
    for (const cylinder of this.cylinders) {
      cylinder.vca.gain.cancelScheduledValues(now);
      cylinder.lfoGain.gain.cancelScheduledValues(now);
      cylinder.vca.gain.setTargetAtTime(0.0001, now, 0.08);
      cylinder.lfoGain.gain.setTargetAtTime(0, now, 0.08);
      cylinder.inUse = false;
      cylinder.lastUsedAtSec = now;
    }
  }

  public dispose(): void {
    if (this.disposed) return;
    this.drosseln();
    this.disposed = true;
    for (const cylinder of this.cylinders) {
      try { cylinder.source?.stop(this.ctx.currentTime + 0.03); } catch {}
      try { cylinder.source?.disconnect(); } catch {}
      try { cylinder.lfo.stop(this.ctx.currentTime + 0.03); } catch {}
      try { cylinder.lfo.disconnect(); } catch {}
      try { cylinder.lfoGain.disconnect(); } catch {}
      try { cylinder.vca.disconnect(); } catch {}
      try { cylinder.panner.disconnect(); } catch {}
      cylinder.source = null;
      cylinder.currentBufferId = null;
      cylinder.currentLoopStartSec = null;
      cylinder.currentLoopEndSec = null;
      cylinder.currentSourceOffsetSec = null;
      cylinder.currentMode = null;
      cylinder.inUse = false;
    }
    try { this.elasticInput.disconnect(); } catch {}
    try { this.outputBus.disconnect(); } catch {}
    try { this.compressor.disconnect(); } catch {}
  }

  private replaceBand(
    cylinder: DirtyRootFollowCylinder,
    args: {
      buffer: AudioBuffer;
      bufferId: string;
      loopStartSec: number;
      loopEndSec: number;
      sourceOffsetSec: number;
      playbackRate: number;
      mode: DirtyRootFollowWalzeMode;
      startAtSec: number;
    },
  ): void {
    const now = this.ctx.currentTime;
    if (cylinder.source) {
      const oldSource = cylinder.source;
      try { oldSource.stop(now + 0.055); } catch {}
      oldSource.onended = () => {
        try { oldSource.disconnect(); } catch {}
      };
    }

    const source = this.ctx.createBufferSource();
    source.buffer = args.buffer;
    source.loop = true;
    source.loopStart = args.loopStartSec;
    source.loopEnd = args.loopEndSec;
    source.playbackRate.value = args.playbackRate;
    source.connect(cylinder.vca);
    const startAtSec = Math.max(now + 0.008, args.startAtSec);
    source.start(startAtSec, args.sourceOffsetSec);

    cylinder.source = source;
    cylinder.currentBufferId = args.bufferId;
    cylinder.currentLoopStartSec = args.loopStartSec;
    cylinder.currentLoopEndSec = args.loopEndSec;
    cylinder.currentSourceOffsetSec = args.sourceOffsetSec;
    cylinder.currentMode = args.mode;
  }
}

const dirtyRootFollowWalzen = new Map<AudioContext, DirtyRootFollowWalze>();
const dirtyRootFollowWalzeSet = new Set<DirtyRootFollowWalze>();

export function getDirtyRootFollowWalze(ctx: AudioContext, targetBus: AudioNode): DirtyRootFollowWalze {
  const existing = dirtyRootFollowWalzen.get(ctx);
  if (existing && !existing.disposed) return existing;
  if (existing?.disposed) {
    dirtyRootFollowWalzen.delete(ctx);
    dirtyRootFollowWalzeSet.delete(existing);
  }
  const next = new DirtyRootFollowWalze(ctx, targetBus);
  dirtyRootFollowWalzen.set(ctx, next);
  dirtyRootFollowWalzeSet.add(next);
  return next;
}

export function peekDirtyRootFollowWalze(ctx: AudioContext): DirtyRootFollowWalze | null {
  return dirtyRootFollowWalzen.get(ctx) ?? null;
}

export function drosselAllDirtyRootFollowWalzen(): void {
  for (const walze of dirtyRootFollowWalzeSet) walze.drosseln();
}

export function disposeAllDirtyRootFollowWalzen(): void {
  for (const walze of dirtyRootFollowWalzeSet) walze.dispose();
  dirtyRootFollowWalzeSet.clear();
  dirtyRootFollowWalzen.clear();
}
