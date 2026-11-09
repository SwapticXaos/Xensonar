export type WeightedMonoAudioBuffer = {
  buffer: AudioBuffer;
  gain: number;
};

/** Normalize channel 0 in place. This intentionally preserves the historical
 * AudioEngine semantics: silent buffers are returned untouched and values are
 * not clipped when peakTarget itself is above 1. */
export function normalizeMonoAudioBufferInPlace(
  buffer: AudioBuffer,
  peakTarget = 0.9,
): AudioBuffer {
  const output = buffer.getChannelData(0);
  let maxAmp = 0;
  for (let i = 0; i < output.length; i += 1) {
    maxAmp = Math.max(maxAmp, Math.abs(output[i]));
  }
  if (maxAmp > 0.0001) {
    const gain = peakTarget / maxAmp;
    for (let i = 0; i < output.length; i += 1) output[i] *= gain;
  }
  return buffer;
}

/** Linear endpoint-preserving mono resampling to an exact sample count. */
export function resampleMonoAudioBufferToLength(
  ctx: Pick<BaseAudioContext, 'createBuffer'>,
  source: AudioBuffer,
  targetLength: number,
): AudioBuffer {
  const safeTargetLength = Math.max(1, targetLength);
  if (source.length === safeTargetLength) return source;

  const buffer = ctx.createBuffer(1, safeTargetLength, source.sampleRate);
  const out = buffer.getChannelData(0);
  const inp = source.getChannelData(0);
  const maxIndex = Math.max(0, inp.length - 1);

  for (let i = 0; i < safeTargetLength; i += 1) {
    const pos = safeTargetLength <= 1
      ? 0
      : (i / Math.max(1, safeTargetLength - 1)) * maxIndex;
    const i0 = Math.floor(pos);
    const i1 = Math.min(maxIndex, i0 + 1);
    const t = pos - i0;
    const a = inp[i0] ?? 0;
    const b = inp[i1] ?? 0;
    out[i] = a + (b - a) * t;
  }

  return buffer;
}

/** Mix positive-gain mono buffers into one buffer and normalize the result.
 * The output rate and historical empty-result behavior are preserved. */
export function mixMonoAudioBuffersWeighted(
  ctx: Pick<BaseAudioContext, 'createBuffer' | 'sampleRate'>,
  buffers: readonly WeightedMonoAudioBuffer[],
  peakTarget = 0.92,
): AudioBuffer {
  const valid = buffers.filter((entry) => entry.gain > 0 && entry.buffer.length > 0);
  if (!valid.length) return ctx.createBuffer(1, 1, ctx.sampleRate);

  const sampleRate = valid[0]!.buffer.sampleRate;
  const length = valid.reduce((max, entry) => Math.max(max, entry.buffer.length), 1);
  const outBuffer = ctx.createBuffer(1, length, sampleRate);
  const out = outBuffer.getChannelData(0);

  for (const entry of valid) {
    const data = entry.buffer.getChannelData(0);
    const gain = entry.gain;
    for (let i = 0; i < Math.min(length, data.length); i += 1) {
      out[i] += data[i]! * gain;
    }
  }

  return normalizeMonoAudioBufferInPlace(outBuffer, peakTarget);
}
