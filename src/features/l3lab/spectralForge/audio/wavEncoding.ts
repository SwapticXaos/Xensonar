export function encodeMonoFloat32ToWavBlob(samples: Float32Array, sampleRate: number): Blob {
  return encodeChannelsFloat32ToWavBlob([samples], sampleRate);
}

export function encodeChannelsFloat32ToWavBlob(channels: readonly Float32Array[], sampleRate: number): Blob {
  if (!channels.length || !Number.isFinite(sampleRate) || sampleRate <= 0) throw new Error('Invalid audio channels or sample rate');
  const count = channels.length;
  const length = Math.min(...channels.map(c => c.length));
  const buffer = new ArrayBuffer(44 + length * 2 * count);
  const view = new DataView(buffer);

  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  };

  writeString(0, "RIFF");
  view.setUint32(4, 36 + length * 2 * count, true);
  writeString(8, "WAVE");
  writeString(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, count, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2 * count, true);
  view.setUint16(32, 2 * count, true);
  view.setUint16(34, 16, true);
  writeString(36, "data");
  view.setUint32(40, length * 2 * count, true);

  for (let i = 0; i < length; i++) {
    for (let channel = 0; channel < count; channel++) {
      const value = channels[channel][i];
      const s = Number.isFinite(value) ? Math.max(-1, Math.min(1, value)) : 0;
      view.setInt16(44 + (i * count + channel) * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    }
  }

  return new Blob([buffer], { type: "audio/wav" });
}
