export type RootFollowSampleBufferShadowChannel = {
  channelIndex: number;
  frameCount: number;
  peak: number;
  rms: number;
  checksum: number;
  data: Float32Array;
};

export type RootFollowSampleBufferWorkletShadowTransfer = {
  version: 1;
  lane: 'root-follow-material-buffer-shadow';
  entryId: string;
  audioNowSec: number;
  sampleRate: number;
  numberOfChannels: number;
  sourceFrameCount: number;
  durationSec: number;
  loopStartSec: number;
  loopEndSec: number;
  transferStartFrame: number;
  transferFrameCount: number;
  transferDurationSec: number;
  transferByteLength: number;
  transferSignature: string;
  transferKind: 'bounded-shadow-window';
  channels: RootFollowSampleBufferShadowChannel[];
  preservesLegacyMaterialPath: true;
  activeAudioPath: false;
  hasSampleBufferTransfer: true;
  transfersFullSourceBuffer: false;
};

const clampNumber = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, Number.isFinite(value) ? value : min));

function summarizeChannelData(data: Float32Array) {
  let peak = 0;
  let sumSquares = 0;
  let checksumAcc = 0;
  const stride = Math.max(1, Math.floor(data.length / 512));
  for (let index = 0; index < data.length; index += 1) {
    const value = Number.isFinite(data[index]) ? data[index] : 0;
    const abs = Math.abs(value);
    if (abs > peak) peak = abs;
    sumSquares += value * value;
    if (index % stride === 0) checksumAcc = (checksumAcc + Math.round((value + 1) * 1000003) + index) % 2147483647;
  }
  const rms = data.length > 0 ? Math.sqrt(sumSquares / data.length) : 0;
  return {
    peak: Math.round(peak * 1000000) / 1000000,
    rms: Math.round(rms * 1000000) / 1000000,
    checksum: checksumAcc,
  };
}

function copyChannelWindow(buffer: AudioBuffer, channelIndex: number, startFrame: number, frameCount: number) {
  const target = new Float32Array(frameCount);
  if (typeof buffer.copyFromChannel === 'function') {
    buffer.copyFromChannel(target, channelIndex, startFrame);
    return target;
  }
  const source = buffer.getChannelData(channelIndex);
  target.set(source.subarray(startFrame, Math.min(source.length, startFrame + frameCount)));
  return target;
}

export function createRootFollowSampleBufferWorkletShadowTransfer(args: {
  entryId: string;
  audioNowSec: number;
  buffer: AudioBuffer;
  loopStartSec: number;
  loopEndSec: number;
  maxTransferFrames?: number;
  maxChannels?: number;
}): RootFollowSampleBufferWorkletShadowTransfer {
  const sampleRate = Math.max(1, Math.round(args.buffer.sampleRate || 44100));
  const sourceFrameCount = Math.max(0, args.buffer.length || 0);
  const durationSec = Math.max(0, args.buffer.duration || sourceFrameCount / sampleRate);
  const loopStartSec = clampNumber(args.loopStartSec, 0, Math.max(0, durationSec - 0.001));
  const loopEndSec = clampNumber(args.loopEndSec, loopStartSec + 0.001, Math.max(loopStartSec + 0.001, durationSec));
  const maxTransferFrames = Math.max(512, Math.min(32768, Math.round(args.maxTransferFrames ?? 8192)));
  const transferStartFrame = Math.max(0, Math.min(sourceFrameCount, Math.floor(loopStartSec * sampleRate)));
  const remainingFrames = Math.max(0, sourceFrameCount - transferStartFrame);
  const loopFrames = Math.max(1, Math.floor((loopEndSec - loopStartSec) * sampleRate));
  const transferFrameCount = Math.max(1, Math.min(maxTransferFrames, remainingFrames || maxTransferFrames, loopFrames || maxTransferFrames));
  const channelCount = Math.max(0, args.buffer.numberOfChannels || 0);
  const maxChannels = Math.max(1, Math.min(2, Math.round(args.maxChannels ?? 2)));
  const channels: RootFollowSampleBufferShadowChannel[] = [];
  for (let channelIndex = 0; channelIndex < Math.min(channelCount, maxChannels); channelIndex += 1) {
    const data = copyChannelWindow(args.buffer, channelIndex, transferStartFrame, transferFrameCount);
    const stats = summarizeChannelData(data);
    channels.push({
      channelIndex,
      frameCount: data.length,
      data,
      ...stats,
    });
  }
  const transferByteLength = channels.reduce((sum, channel) => sum + channel.data.byteLength, 0);
  const checksum = channels.reduce((sum, channel) => (sum + channel.checksum + channel.channelIndex) % 2147483647, 0);
  const transferSignature = [
    args.entryId,
    sampleRate,
    channelCount,
    sourceFrameCount,
    Math.round(loopStartSec * 1000),
    Math.round(loopEndSec * 1000),
    transferStartFrame,
    transferFrameCount,
    checksum,
  ].join(':');

  return {
    version: 1,
    lane: 'root-follow-material-buffer-shadow',
    entryId: args.entryId,
    audioNowSec: args.audioNowSec,
    sampleRate,
    numberOfChannels: channelCount,
    sourceFrameCount,
    durationSec,
    loopStartSec,
    loopEndSec,
    transferStartFrame,
    transferFrameCount,
    transferDurationSec: transferFrameCount / sampleRate,
    transferByteLength,
    transferSignature,
    transferKind: 'bounded-shadow-window',
    channels,
    preservesLegacyMaterialPath: true,
    activeAudioPath: false,
    hasSampleBufferTransfer: true,
    transfersFullSourceBuffer: false,
  };
}

export function summarizeRootFollowSampleBufferWorkletShadowTransfer(
  transfer: RootFollowSampleBufferWorkletShadowTransfer,
) {
  return {
    version: 1 as const,
    lane: transfer.lane,
    entryId: transfer.entryId,
    sampleRate: transfer.sampleRate,
    numberOfChannels: transfer.numberOfChannels,
    sourceFrameCount: transfer.sourceFrameCount,
    durationSec: Math.round(transfer.durationSec * 10000) / 10000,
    loopStartSec: Math.round(transfer.loopStartSec * 10000) / 10000,
    loopEndSec: Math.round(transfer.loopEndSec * 10000) / 10000,
    transferStartFrame: transfer.transferStartFrame,
    transferFrameCount: transfer.transferFrameCount,
    transferDurationSec: Math.round(transfer.transferDurationSec * 10000) / 10000,
    transferByteLength: transfer.transferByteLength,
    transferSignature: transfer.transferSignature,
    channelSummaries: transfer.channels.map((channel) => ({
      channelIndex: channel.channelIndex,
      frameCount: channel.frameCount,
      peak: channel.peak,
      rms: channel.rms,
      checksum: channel.checksum,
    })),
    preservesLegacyMaterialPath: transfer.preservesLegacyMaterialPath,
    activeAudioPath: transfer.activeAudioPath,
    hasSampleBufferTransfer: transfer.hasSampleBufferTransfer,
    transfersFullSourceBuffer: transfer.transfersFullSourceBuffer,
  };
}

export function getRootFollowSampleBufferShadowTransferList(
  transfer: RootFollowSampleBufferWorkletShadowTransfer,
): Transferable[] {
  return transfer.channels.map((channel) => channel.data.buffer);
}
