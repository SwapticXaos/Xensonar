export function configureMasterChain(ctx: AudioContext, clipper: WaveShaperNode, limiter: DynamicsCompressorNode, out: GainNode) {
  clipper.curve = createSoftClipCurve(1.45);
  clipper.oversample = '4x';
  limiter.threshold.setValueAtTime(-10, ctx.currentTime);
  limiter.knee.setValueAtTime(6, ctx.currentTime);
  limiter.ratio.setValueAtTime(18, ctx.currentTime);
  limiter.attack.setValueAtTime(0.003, ctx.currentTime);
  limiter.release.setValueAtTime(0.16, ctx.currentTime);
  out.gain.value = 0.92;
}

export function resolveActiveDroneOvertoneMix<T extends string>(args: {
  dronePreset: T;
  droneJIOvertonesByPreset?: Partial<Record<T, Record<string, number>>>;
  droneJIOvertones: Record<string, number>;
}) {
  return args.droneJIOvertonesByPreset?.[args.dronePreset] ?? args.droneJIOvertones;
}

function createSoftClipCurve(amount: number) {
  const samples = 2048;
  const curve = new Float32Array(samples);
  for (let i = 0; i < samples; i += 1) {
    const x = (i / (samples - 1)) * 2 - 1;
    curve[i] = Math.tanh(x * amount);
  }
  return curve;
}
