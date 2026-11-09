const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export const buildWaveformPeaks = (buffer: AudioBuffer, buckets = 1400) => {
  const channelCount = Math.max(1, buffer.numberOfChannels);
  const frameCount = buffer.length;
  if (!frameCount) return [] as number[];
  const bucketCount = Math.max(64, Math.min(buckets, frameCount));
  const samplesPerBucket = Math.max(1, Math.floor(frameCount / bucketCount));
  const peaks: number[] = [];

  for (let bucket = 0; bucket < bucketCount; bucket += 1) {
    const start = bucket * samplesPerBucket;
    const end = bucket === bucketCount - 1 ? frameCount : Math.min(frameCount, start + samplesPerBucket);
    let peak = 0;
    for (let channel = 0; channel < channelCount; channel += 1) {
      const data = buffer.getChannelData(channel);
      for (let i = start; i < end; i += 1) {
        const abs = Math.abs(data[i] ?? 0);
        if (abs > peak) peak = abs;
      }
    }
    peaks.push(clamp(peak, 0, 1));
  }

  return peaks;
};

export const getBufferRange = (buffer: AudioBuffer, startMs: number, endMs: number) => {
  const durationMs = Math.round(buffer.duration * 1000);
  const startFrame = clamp(Math.floor((startMs / 1000) * buffer.sampleRate), 0, buffer.length);
  const endFrame = clamp(Math.ceil((endMs / 1000) * buffer.sampleRate), 0, buffer.length);
  const from = Math.min(startFrame, endFrame);
  const to = Math.max(startFrame, endFrame);
  const safeTo = Math.max(from + 1, to);
  const leftSource = buffer.getChannelData(0);
  const rightSource = buffer.numberOfChannels > 1 ? buffer.getChannelData(1) : leftSource;
  return {
    left: leftSource.slice(from, safeTo),
    right: rightSource.slice(from, safeTo),
    durationMs: clamp(Math.round(((safeTo - from) / buffer.sampleRate) * 1000), 0, durationMs),
  };
};
