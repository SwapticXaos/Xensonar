import { audioEngine } from '../spectralForge/audio/AudioEngine';
import type { AudioSourceAsset } from '../spectralForge/audio/AudioImporter';
import { SpectralData } from '../spectralForge/audio/SpectralData';
import type { CanonicalSourceView } from './analysis';
import { hasPlayableSource } from './spectralWorkspaceUtils';

export type SynthMode = 'additive' | 'ifft' | 'granular' | 'glyph';
export type TransferMode = 'forge-render' | 'source-direct';

export type DestructiveAudioProfile = {
  gains: Float32Array;
  rangeStartSec: number;
  rangeDurationSec: number;
};

export type WarpAudioProfile = {
  timeOffsetsSec: Float32Array;
  pitchSemitones: Float32Array;
  rangeStartSec: number;
  rangeDurationSec: number;
};

export type WaveformMix = {
  sine: number;
  sawtooth: number;
  square: number;
  triangle: number;
};

function clamp01(v: number) {
  return Math.max(0, Math.min(1, v));
}

export function buildDestructiveColumnGainProfile(current: SpectralData, baselineSnapshot: Float32Array | null): Float32Array | null {
  if (!baselineSnapshot || baselineSnapshot.length < current.data.length) return null;
  const baseline = baselineSnapshot.subarray(0, current.data.length);
  const gains = new Float32Array(current.width);
  let hasDeficit = false;
  for (let x = 0; x < current.width; x += 1) {
    let baseSum = 0;
    let retainedSum = 0;
    for (let y = 0; y < current.height; y += 1) {
      const idx = y * current.width + x;
      const base = Math.max(0, baseline[idx] ?? 0);
      if (base <= 0.0005) continue;
      const retained = Math.max(0, Math.min(base, current.data[idx] ?? 0));
      baseSum += base;
      retainedSum += retained;
    }
    let gain = baseSum > 0.0005 ? clamp01(retainedSum / baseSum) : 1;
    if (gain > 0.992) gain = 1;
    else gain = Math.pow(gain, 1.2);
    gains[x] = gain;
    if (gain < 0.999) hasDeficit = true;
  }
  if (!hasDeficit) return null;
  const smoothed = new Float32Array(current.width);
  const kernel = [1, 2, 3, 2, 1];
  const radius = 2;
  for (let x = 0; x < current.width; x += 1) {
    let weighted = 0;
    let weightSum = 0;
    let localMin = gains[x] ?? 1;
    for (let offset = -radius; offset <= radius; offset += 1) {
      const idx = x + offset;
      if (idx < 0 || idx >= current.width) continue;
      const weight = kernel[offset + radius] ?? 1;
      const sample = gains[idx] ?? 1;
      weighted += sample * weight;
      weightSum += weight;
      localMin = Math.min(localMin, sample);
    }
    const avg = weightSum > 0 ? weighted / weightSum : gains[x] ?? 1;
    smoothed[x] = Math.max(0, Math.min(1, Math.min(avg, localMin + 0.08)));
  }
  return smoothed;
}

function applyDestructiveProfileToBuffer(
  buffer: AudioBuffer,
  selectionStartSec: number,
  selectionDurationSec: number,
  profile: DestructiveAudioProfile | null,
) {
  if (!profile || profile.gains.length === 0 || selectionDurationSec <= 0.0001 || profile.rangeDurationSec <= 0.0001) return;
  const frameCount = Math.max(1, buffer.length);
  const sampleRate = buffer.sampleRate || 44100;
  const lastIndex = Math.max(0, profile.gains.length - 1);
  if (lastIndex <= 0) return;
  for (let channel = 0; channel < buffer.numberOfChannels; channel += 1) {
    const data = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i += 1) {
      const absoluteTime = selectionStartSec + i / sampleRate;
      const relative = (absoluteTime - profile.rangeStartSec) / profile.rangeDurationSec;
      if (relative <= 0) {
        data[i] *= profile.gains[0] ?? 1;
        continue;
      }
      if (relative >= 1) {
        data[i] *= profile.gains[lastIndex] ?? 1;
        continue;
      }
      const column = relative * lastIndex;
      const idx0 = Math.max(0, Math.min(lastIndex, Math.floor(column)));
      const idx1 = Math.max(0, Math.min(lastIndex, idx0 + 1));
      const frac = column - idx0;
      const gain0 = profile.gains[idx0] ?? 1;
      const gain1 = profile.gains[idx1] ?? gain0;
      data[i] *= gain0 + (gain1 - gain0) * frac;
    }
  }
}

function smoothColumnProfile(values: Float32Array) {
  if (!values.length) return values;
  const kernel = [1, 2, 3, 2, 1];
  const radius = 2;
  const out = new Float32Array(values.length);
  for (let x = 0; x < values.length; x += 1) {
    let weighted = 0;
    let weightSum = 0;
    for (let offset = -radius; offset <= radius; offset += 1) {
      const idx = x + offset;
      if (idx < 0 || idx >= values.length) continue;
      const weight = kernel[offset + radius] ?? 1;
      weighted += (values[idx] ?? 0) * weight;
      weightSum += weight;
    }
    out[x] = weightSum > 0 ? weighted / weightSum : values[x] ?? 0;
  }
  return out;
}

export function buildWarpAudioProfile(
  timeOffsetsCols: Float32Array | null,
  pitchSemitones: Float32Array | null,
  rangeStartSec: number,
  rangeDurationSec: number,
) {
  if (!timeOffsetsCols || !pitchSemitones || !timeOffsetsCols.length || timeOffsetsCols.length !== pitchSemitones.length || rangeDurationSec <= 0.0001) return null;
  const smoothedTimeCols = smoothColumnProfile(timeOffsetsCols);
  const smoothedPitch = smoothColumnProfile(pitchSemitones);
  const denom = Math.max(1, smoothedTimeCols.length - 1);
  const timeOffsetsSec = new Float32Array(smoothedTimeCols.length);
  const pitch = new Float32Array(smoothedPitch.length);
  let hasWarp = false;
  for (let i = 0; i < smoothedTimeCols.length; i += 1) {
    const sec = (smoothedTimeCols[i] / denom) * rangeDurationSec;
    const clampedPitch = Math.max(-12, Math.min(12, smoothedPitch[i] ?? 0));
    timeOffsetsSec[i] = Math.abs(sec) < 0.0006 ? 0 : sec;
    pitch[i] = Math.abs(clampedPitch) < 0.08 ? 0 : clampedPitch;
    if (Math.abs(timeOffsetsSec[i]) > 0.0006 || Math.abs(pitch[i]) > 0.08) hasWarp = true;
  }
  if (!hasWarp) return null;
  return {
    timeOffsetsSec,
    pitchSemitones: pitch,
    rangeStartSec,
    rangeDurationSec,
  } satisfies WarpAudioProfile;
}

function interpolateProfileValue(values: Float32Array, relative: number) {
  if (!values.length) return 0;
  const lastIndex = Math.max(0, values.length - 1);
  if (lastIndex <= 0) return values[0] ?? 0;
  if (relative <= 0) return values[0] ?? 0;
  if (relative >= 1) return values[lastIndex] ?? 0;
  const column = relative * lastIndex;
  const idx0 = Math.max(0, Math.min(lastIndex, Math.floor(column)));
  const idx1 = Math.max(0, Math.min(lastIndex, idx0 + 1));
  const frac = column - idx0;
  const a = values[idx0] ?? 0;
  const b = values[idx1] ?? a;
  return a + (b - a) * frac;
}

function sampleLinear(data: Float32Array, index: number) {
  if (index <= 0) return data[0] ?? 0;
  const lastIndex = Math.max(0, data.length - 1);
  if (index >= lastIndex) return data[lastIndex] ?? 0;
  const idx0 = Math.floor(index);
  const idx1 = Math.min(lastIndex, idx0 + 1);
  const frac = index - idx0;
  const a = data[idx0] ?? 0;
  const b = data[idx1] ?? a;
  return a + (b - a) * frac;
}

function applyWarpProfileToBuffer(
  buffer: AudioBuffer,
  selectionStartSec: number,
  selectionDurationSec: number,
  profile: WarpAudioProfile | null,
) {
  if (!profile || profile.timeOffsetsSec.length === 0 || selectionDurationSec <= 0.0001 || profile.rangeDurationSec <= 0.0001) return;
  const frameCount = Math.max(1, buffer.length);
  const sampleRate = buffer.sampleRate || 44100;
  const grainSize = Math.max(256, Math.min(2048, Math.floor(sampleRate * 0.03)));
  const half = Math.max(32, Math.floor(grainSize * 0.5));
  const hop = Math.max(64, Math.floor(grainSize * 0.25));
  const window = new Float32Array(half * 2);
  for (let i = 0; i < window.length; i += 1) {
    window[i] = 0.5 - 0.5 * Math.cos((Math.PI * 2 * i) / Math.max(1, window.length - 1));
  }
  for (let channel = 0; channel < buffer.numberOfChannels; channel += 1) {
    const source = buffer.getChannelData(channel).slice();
    const out = new Float32Array(frameCount);
    const norm = new Float32Array(frameCount);
    for (let center = 0; center < frameCount; center += hop) {
      const absoluteTime = selectionStartSec + center / sampleRate;
      const relative = (absoluteTime - profile.rangeStartSec) / profile.rangeDurationSec;
      const timeOffsetSec = interpolateProfileValue(profile.timeOffsetsSec, relative);
      const pitchSemitones = interpolateProfileValue(profile.pitchSemitones, relative);
      const sourceCenter = center + timeOffsetSec * sampleRate;
      const rate = Math.max(0.5, Math.min(2, Math.pow(2, pitchSemitones / 12)));
      for (let j = -half; j < half; j += 1) {
        const outIndex = center + j;
        if (outIndex < 0 || outIndex >= frameCount) continue;
        const sourceIndex = sourceCenter + j * rate;
        const sample = sampleLinear(source, sourceIndex);
        const w = window[j + half] ?? 0;
        out[outIndex] += sample * w;
        norm[outIndex] += w;
      }
    }
    let maxAmp = 0;
    const dest = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i += 1) {
      dest[i] = norm[i] > 1e-4 ? out[i] / norm[i] : source[i] ?? 0;
      maxAmp = Math.max(maxAmp, Math.abs(dest[i]));
    }
    if (maxAmp > 0.98) {
      const gain = 0.98 / maxAmp;
      for (let i = 0; i < frameCount; i += 1) dest[i] *= gain;
    }
  }
}

export async function buildAuditionMixedLoopBuffer(
  ctx: AudioContext,
  source: AudioSourceAsset,
  startSec: number,
  durationSec: number,
  overlay: { audioEngine: typeof audioEngine; spectralData: SpectralData; synthMode: SynthMode; waveformMix: WaveformMix; amount: number } | null,
  destructiveProfile: DestructiveAudioProfile | null = null,
  warpProfile: WarpAudioProfile | null = null,
  crossfadeMs = 24,
) {
  const base = buildLoopPreviewBuffer(ctx, source, startSec, durationSec, crossfadeMs, destructiveProfile, warpProfile);
  if (!overlay || overlay.amount <= 0.0001) return base;
  const rendered = await overlay.audioEngine.renderToBuffer(overlay.spectralData, overlay.synthMode, overlay.waveformMix);
  const out = ctx.createBuffer(1, base.length, base.sampleRate);
  const baseData = base.getChannelData(0);
  const renderData = rendered.getChannelData(0);
  const mixed = out.getChannelData(0);
  const wet = Math.max(0, Math.min(0.45, overlay.amount));
  const dryGain = Math.sqrt(1 - wet);
  const wetGain = Math.sqrt(wet) * 0.78;
  for (let i = 0; i < mixed.length; i += 1) {
    const renderIndex = Math.min(renderData.length - 1, Math.floor((i / Math.max(1, mixed.length - 1)) * Math.max(0, renderData.length - 1)));
    mixed[i] = baseData[i] * dryGain + renderData[renderIndex] * wetGain;
  }
  let maxAmp = 0;
  for (let i = 0; i < mixed.length; i += 1) maxAmp = Math.max(maxAmp, Math.abs(mixed[i]));
  if (maxAmp > 0.98) {
    const gain = 0.98 / maxAmp;
    for (let i = 0; i < mixed.length; i += 1) mixed[i] *= gain;
  }
  return out;
}

export async function buildAuditionSelectionBuffer(
  ctx: AudioContext,
  source: AudioSourceAsset,
  startSec: number,
  durationSec: number,
  overlay: { audioEngine: typeof audioEngine; spectralData: SpectralData; synthMode: SynthMode; waveformMix: WaveformMix; amount: number } | null,
  destructiveProfile: DestructiveAudioProfile | null = null,
  warpProfile: WarpAudioProfile | null = null,
) {
  const base = buildDirectSourceSelectionBuffer(ctx, source, startSec, durationSec, destructiveProfile, warpProfile);
  if (!overlay || overlay.amount <= 0.0001) return base;
  const rendered = await overlay.audioEngine.renderToBuffer(overlay.spectralData, overlay.synthMode, overlay.waveformMix);
  const out = ctx.createBuffer(base.numberOfChannels, base.length, base.sampleRate);
  const wet = Math.max(0, Math.min(0.45, overlay.amount));
  const dryGain = Math.sqrt(1 - wet);
  const wetGain = Math.sqrt(wet) * 0.78;
  let maxAmp = 0;
  for (let channel = 0; channel < out.numberOfChannels; channel += 1) {
    const baseData = base.getChannelData(channel);
    const renderData = rendered.getChannelData(Math.min(channel, rendered.numberOfChannels - 1));
    const mixed = out.getChannelData(channel);
    for (let i = 0; i < mixed.length; i += 1) {
      const renderIndex = Math.min(renderData.length - 1, Math.floor((i / Math.max(1, mixed.length - 1)) * Math.max(0, renderData.length - 1)));
      mixed[i] = baseData[i] * dryGain + renderData[renderIndex] * wetGain;
      maxAmp = Math.max(maxAmp, Math.abs(mixed[i]));
    }
  }
  if (maxAmp > 0.98) {
    const gain = 0.98 / maxAmp;
    for (let channel = 0; channel < out.numberOfChannels; channel += 1) {
      const mixed = out.getChannelData(channel);
      for (let i = 0; i < mixed.length; i += 1) mixed[i] *= gain;
    }
  }
  return out;
}

export function buildSelectionLoopSeamScore(source: AudioSourceAsset, startSec: number, durationSec: number) {
  const startSample = Math.max(0, Math.floor(startSec * source.sampleRate));
  const sampleCount = Math.max(1, Math.floor(durationSec * source.sampleRate));
  const endSample = Math.min(source.monoSamples.length, startSample + sampleCount);
  const actualCount = Math.max(1, endSample - startSample);
  const edgeSamples = Math.max(32, Math.min(Math.floor(source.sampleRate * 0.03), Math.max(32, Math.floor(actualCount * 0.12))));
  let diffSum = 0;
  let energySum = 0;
  let count = 0;
  for (let i = 0; i < edgeSamples && startSample + i < endSample && endSample - edgeSamples + i >= startSample; i += 1) {
    const a = source.monoSamples[startSample + i] ?? 0;
    const b = source.monoSamples[endSample - edgeSamples + i] ?? 0;
    const diff = a - b;
    diffSum += diff * diff;
    energySum += (a * a + b * b) * 0.5;
    count += 1;
  }
  if (count === 0) return 0;
  const rmsDiff = Math.sqrt(diffSum / count);
  const rmsEnergy = Math.sqrt(Math.max(1e-8, energySum / count));
  return clamp01(1 - rmsDiff / Math.max(0.02, rmsEnergy * 1.15));
}

export function buildLoopPreviewBuffer(
  ctx: AudioContext,
  source: AudioSourceAsset,
  startSec: number,
  durationSec: number,
  crossfadeMs = 24,
  destructiveProfile: DestructiveAudioProfile | null = null,
  warpProfile: WarpAudioProfile | null = null,
) {
  const sampleRate = source.sampleRate;
  const startSample = Math.max(0, Math.floor(startSec * sampleRate));
  const requestedSamples = Math.max(1, Math.floor(durationSec * sampleRate));
  const endSample = Math.min(source.monoSamples.length, startSample + requestedSamples);
  const frameCount = Math.max(1, endSample - startSample);
  const channelCount = source.channelCount >= 2 ? 2 : 1;
  const buffer = ctx.createBuffer(channelCount, frameCount, sampleRate);
  const fadeSamples = Math.max(16, Math.min(Math.floor(frameCount * 0.12), Math.floor(sampleRate * (crossfadeMs / 1000))));

  const copyChannel = (dest: Float32Array, src: Float32Array) => {
    for (let i = 0; i < frameCount; i += 1) dest[i] = src[startSample + i] ?? 0;
    if (fadeSamples * 2 >= frameCount) return;
    for (let i = 0; i < fadeSamples; i += 1) {
      const t = fadeSamples <= 1 ? 1 : i / (fadeSamples - 1);
      const startIdx = i;
      const endIdx = frameCount - fadeSamples + i;
      const a = dest[startIdx] ?? 0;
      const b = dest[endIdx] ?? 0;
      const mixStart = a * (1 - t) + b * t;
      const mixEnd = b * (1 - t) + a * t;
      dest[startIdx] = mixStart;
      dest[endIdx] = mixEnd;
    }
  };

  copyChannel(buffer.getChannelData(0), source.leftSamples.length > 0 ? source.leftSamples : source.monoSamples);
  if (channelCount > 1) {
    copyChannel(buffer.getChannelData(1), source.rightSamples.length > 0 ? source.rightSamples : source.leftSamples);
  }
  applyDestructiveProfileToBuffer(buffer, startSec, durationSec, destructiveProfile);
  applyWarpProfileToBuffer(buffer, startSec, durationSec, warpProfile);
  return buffer;
}

export function buildDirectSourceSelectionBuffer(
  ctx: AudioContext,
  source: AudioSourceAsset,
  startSec: number,
  durationSec: number,
  destructiveProfile: DestructiveAudioProfile | null = null,
  warpProfile: WarpAudioProfile | null = null,
) {
  const sampleRate = source.sampleRate;
  const startSample = Math.max(0, Math.floor(startSec * sampleRate));
  const requestedSamples = Math.max(1, Math.floor(durationSec * sampleRate));
  const endSample = Math.min(source.monoSamples.length, startSample + requestedSamples);
  const frameCount = Math.max(1, endSample - startSample);
  const channelCount = source.channelCount >= 2 ? 2 : 1;
  const buffer = ctx.createBuffer(channelCount, frameCount, sampleRate);

  const copyChannel = (dest: Float32Array, src: Float32Array) => {
    for (let i = 0; i < frameCount; i += 1) dest[i] = src[startSample + i] ?? 0;
  };

  copyChannel(buffer.getChannelData(0), source.leftSamples.length > 0 ? source.leftSamples : source.monoSamples);
  if (channelCount > 1) {
    copyChannel(buffer.getChannelData(1), source.rightSamples.length > 0 ? source.rightSamples : source.leftSamples);
  }
  applyDestructiveProfileToBuffer(buffer, startSec, durationSec, destructiveProfile);
  applyWarpProfileToBuffer(buffer, startSec, durationSec, warpProfile);
  return buffer;
}

export function encodeAudioBufferToWav(buffer: AudioBuffer) {
  const channels = Math.max(1, buffer.numberOfChannels || 1);
  const frameCount = Math.max(1, buffer.length || 1);
  const sampleRate = buffer.sampleRate || 44100;
  const bytesPerSample = 2;
  const blockAlign = channels * bytesPerSample;
  const dataSize = frameCount * blockAlign;
  const wav = new ArrayBuffer(44 + dataSize);
  const view = new DataView(wav);
  const writeAscii = (offset: number, value: string) => {
    for (let i = 0; i < value.length; i += 1) view.setUint8(offset + i, value.charCodeAt(i));
  };
  writeAscii(0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeAscii(8, 'WAVE');
  writeAscii(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, channels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, 16, true);
  writeAscii(36, 'data');
  view.setUint32(40, dataSize, true);
  let offset = 44;
  const channelData = Array.from({ length: channels }, (_, channel) => buffer.getChannelData(channel));
  for (let i = 0; i < frameCount; i += 1) {
    for (let channel = 0; channel < channels; channel += 1) {
      const sample = Math.max(-1, Math.min(1, channelData[channel]?.[i] ?? 0));
      view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
      offset += 2;
    }
  }
  return new Blob([wav], { type: 'audio/wav' });
}

export async function buildTransferBlob(args: {
  transferMode: TransferMode;
  spectralData: SpectralData;
  synthMode: SynthMode;
  waveformMix: WaveformMix;
  rawSourceAsset: AudioSourceAsset | null;
  selectionStartSec: number;
  selectionDurationSec: number;
  sourceView: CanonicalSourceView;
  activeWorkspace: string;
  destructiveProfile?: DestructiveAudioProfile | null;
  warpProfile?: WarpAudioProfile | null;
}) {
  if (args.transferMode === 'source-direct' && args.rawSourceAsset && hasPlayableSource(args.rawSourceAsset)) {
    const ctx = new AudioContext({ sampleRate: args.rawSourceAsset.sampleRate });
    try {
      const buffer = buildDirectSourceSelectionBuffer(ctx, args.rawSourceAsset, args.selectionStartSec, args.selectionDurationSec, args.destructiveProfile ?? null, args.warpProfile ?? null);
      return {
        blob: encodeAudioBufferToWav(buffer),
        sourceVersion: 'source-direct-v1',
        renderMode: `source-direct:${args.sourceView}:${args.activeWorkspace}`,
      };
    } finally {
      void ctx.close().catch(() => {});
    }
  }

  const blob = await audioEngine.exportWAV(args.spectralData, args.synthMode, args.waveformMix);
  return {
    blob,
    sourceVersion: 'forge2-a',
    renderMode: `${args.synthMode}:${args.sourceView}:${args.activeWorkspace}`,
  };
}
