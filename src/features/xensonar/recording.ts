import { STEM_DESCRIPTORS } from "./constants";
import { encodeWavBlob, getSupportedRecordingMimeType } from "./helpers";
import type {
  StemArmState,
  StemDescriptor,
  StemExportFile,
  StemKey,
  StemRecorderStatus,
} from "./types";

export const createDefaultStemArmState = (): StemArmState => ({
  master: false,
  particles: true,
  waves: true,
  drone: false,
  fx: false,
});

export const getArmedStemKeys = (armed: StemArmState): StemKey[] =>
  STEM_DESCRIPTORS.filter((stem) => armed[stem.key]).map((stem) => stem.key);

export const describeArmedStems = (armed: StemArmState): StemDescriptor[] =>
  STEM_DESCRIPTORS.filter((stem) => armed[stem.key]);

export const canRecordInBrowser = () => typeof MediaRecorder !== "undefined" && getSupportedRecordingMimeType().length > 0;

export const getInitialStemRecorderStatus = (): StemRecorderStatus =>
  typeof window === "undefined" ? "idle" : canRecordInBrowser() ? "idle" : "unsupported";

export const createStemBusMap = (ctx: AudioContext, destination: AudioNode) => {
  const master = ctx.createGain();
  const drone = ctx.createGain();
  const particles = ctx.createGain();
  const fx = ctx.createGain();

  master.gain.value = 1;
  drone.gain.value = 1;
  particles.gain.value = 1;
  fx.gain.value = 1;

  master.connect(destination);
  drone.connect(master);
  particles.connect(master);
  fx.connect(master);

  return { master, drone, particles, fx };
};

export const createStemFilename = (baseName: string, stemKey: StemKey) => {
  const safeBase = (baseName || "xensonar-stem")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-_]+/g, "-")
    .replace(/^-+|-+$/g, "") || "xensonar-stem";
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  return `${safeBase}-${stemKey}-${stamp}.wav`;
};

export const triggerBlobDownload = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.rel = "noopener";
  anchor.style.position = "fixed";
  anchor.style.left = "-9999px";
  document.body.appendChild(anchor);
  anchor.click();
  window.setTimeout(() => {
    anchor.remove();
    URL.revokeObjectURL(url);
  }, 1200);
};

const normalizeChannelData = (buffer: AudioBuffer) => {
  const left = buffer.getChannelData(0);
  const right = buffer.numberOfChannels > 1 ? buffer.getChannelData(1) : buffer.getChannelData(0);
  return { left, right, sampleRate: buffer.sampleRate };
};

export const exportAudioBufferToWav = (buffer: AudioBuffer) => {
  const { left, right, sampleRate } = normalizeChannelData(buffer);
  return encodeWavBlob(left, right, sampleRate);
};

export const buildStemExportFile = (key: StemKey, label: string, blob: Blob, baseName: string): StemExportFile => ({
  key,
  label,
  filename: createStemFilename(baseName, key),
  sizeBytes: blob.size,
});
