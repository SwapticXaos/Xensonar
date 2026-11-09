import type { AudioSourceAsset } from '../spectralForge/audio/AudioImporter';
import type { TimeRange } from './types';

const MIN_LOOP_DURATION_SEC = 0.05;
const LOOP_END_EPSILON_SEC = 0.001;

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

const getAssetDurationSec = (source: AudioSourceAsset) => {
  if (source.sampleRate <= 0) return 0;
  return source.monoSamples.length / source.sampleRate;
};

const normalizeRange = (range: TimeRange, durationSec: number): TimeRange => {
  const safeDuration = Math.max(MIN_LOOP_DURATION_SEC, Math.min(Math.max(MIN_LOOP_DURATION_SEC, durationSec), range.durationSec));
  const safeStart = clamp(range.startSec, 0, Math.max(0, durationSec - safeDuration));
  return {
    startSec: safeStart,
    durationSec: Math.min(safeDuration, Math.max(MIN_LOOP_DURATION_SEC, durationSec - safeStart)),
  };
};

const rangeEnd = (range: TimeRange) => range.startSec + range.durationSec;

class LoopPreviewEngine {
  private ctx: AudioContext | null = null;
  private sourceNode: AudioBufferSourceNode | null = null;
  private gainNode: GainNode | null = null;
  private playing = false;
  private playbackStartedAtCtxSec = 0;
  private playbackLoopStartSec = 0;
  private playbackLoopDurationSec = 0;
  private playbackInitialAbsoluteSec = 0;
  private assetDurationSec = 0;

  private getContext() {
    if (!this.ctx) this.ctx = new AudioContext({ sampleRate: 44100 });
    return this.ctx;
  }

  isPlaying() {
    return this.playing;
  }

  getPlaybackPositionSec() {
    if (!this.playing || !this.ctx || this.playbackLoopDurationSec <= 0) return null;
    const elapsed = Math.max(0, this.ctx.currentTime - this.playbackStartedAtCtxSec);
    const loopStart = this.playbackLoopStartSec;
    const loopDuration = this.playbackLoopDurationSec;
    const relativeStart = clamp(this.playbackInitialAbsoluteSec - loopStart, 0, Math.max(0, loopDuration - LOOP_END_EPSILON_SEC));
    return loopStart + ((relativeStart + elapsed) % loopDuration);
  }

  getPlaybackOffsetSec() {
    const position = this.getPlaybackPositionSec();
    if (position == null || this.playbackLoopDurationSec <= 0) return null;
    return clamp(position - this.playbackLoopStartSec, 0, Math.max(0, this.playbackLoopDurationSec - LOOP_END_EPSILON_SEC));
  }

  async playLoop(source: AudioSourceAsset, range: TimeRange, offsetSec = 0) {
    this.stop();
    const ctx = this.getContext();
    if (ctx.state === 'suspended') await ctx.resume();

    const durationSec = getAssetDurationSec(source);
    const safeRange = normalizeRange(range, durationSec);
    const safeEndSec = Math.min(durationSec, rangeEnd(safeRange));
    const safeOffsetSec = clamp(offsetSec, 0, Math.max(0, safeRange.durationSec - LOOP_END_EPSILON_SEC));
    const startOffsetSec = clamp(safeRange.startSec + safeOffsetSec, 0, Math.max(0, durationSec - LOOP_END_EPSILON_SEC));

    const buffer = ctx.createBuffer(1, Math.max(1, source.monoSamples.length), source.sampleRate);
    buffer.copyToChannel(Float32Array.from(source.monoSamples), 0, 0);

    const node = ctx.createBufferSource();
    node.buffer = buffer;
    node.loop = true;
    node.loopStart = safeRange.startSec;
    node.loopEnd = safeEndSec;
    const gain = ctx.createGain();
    gain.gain.value = 0.9;
    node.connect(gain);
    gain.connect(ctx.destination);
    node.start(0, startOffsetSec);
    this.sourceNode = node;
    this.gainNode = gain;
    this.playing = true;
    this.assetDurationSec = durationSec;
    this.playbackStartedAtCtxSec = ctx.currentTime;
    this.playbackLoopStartSec = safeRange.startSec;
    this.playbackLoopDurationSec = safeRange.durationSec;
    this.playbackInitialAbsoluteSec = startOffsetSec;
    node.onended = () => {
      if (this.sourceNode === node) {
        this.sourceNode = null;
        this.gainNode = null;
        this.playing = false;
        this.playbackStartedAtCtxSec = 0;
        this.playbackLoopStartSec = 0;
        this.playbackLoopDurationSec = 0;
        this.playbackInitialAbsoluteSec = 0;
        this.assetDurationSec = 0;
      }
    };
  }

  updateLoopRangeLive(range: TimeRange) {
    if (!this.playing || !this.ctx || !this.sourceNode || this.assetDurationSec <= 0) return false;
    const currentPositionSec = this.getPlaybackPositionSec() ?? range.startSec;
    const safeRange = normalizeRange(range, this.assetDurationSec);
    const safeEndSec = Math.min(this.assetDurationSec, rangeEnd(safeRange));
    this.sourceNode.loopStart = safeRange.startSec;
    this.sourceNode.loopEnd = safeEndSec;

    const relativeToNewStart = currentPositionSec - safeRange.startSec;
    const nextInitialAbsoluteSec = relativeToNewStart >= 0 && relativeToNewStart < safeRange.durationSec
      ? currentPositionSec
      : safeRange.startSec + (((relativeToNewStart % safeRange.durationSec) + safeRange.durationSec) % safeRange.durationSec);

    this.playbackStartedAtCtxSec = this.ctx.currentTime;
    this.playbackLoopStartSec = safeRange.startSec;
    this.playbackLoopDurationSec = safeRange.durationSec;
    this.playbackInitialAbsoluteSec = clamp(nextInitialAbsoluteSec, safeRange.startSec, Math.max(safeRange.startSec, safeEndSec - LOOP_END_EPSILON_SEC));
    return true;
  }

  stop() {
    if (this.sourceNode) {
      try {
        this.sourceNode.stop();
      } catch {}
      try {
        this.sourceNode.disconnect();
      } catch {}
    }
    if (this.gainNode) {
      try {
        this.gainNode.disconnect();
      } catch {}
    }
    this.sourceNode = null;
    this.gainNode = null;
    this.playing = false;
    this.playbackStartedAtCtxSec = 0;
    this.playbackLoopStartSec = 0;
    this.playbackLoopDurationSec = 0;
    this.playbackInitialAbsoluteSec = 0;
    this.assetDurationSec = 0;
  }
}

export const loopPreviewEngine = new LoopPreviewEngine();
