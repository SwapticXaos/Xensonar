import { notifyMelodicSampleLibraryStatus, notifyMelodicSampleLibraryUpdated } from '../melodicSamples/melodicSampleLibraryEvents';
import { ensureLocalFieldState, sanitizeLocalFieldState, type LocalFieldModuleState } from './localField';

export type SavedMelodicSampleMeta = {
  id: string;
  name: string;
  baseHz: number | null;
  baseHzSource?: 'estimated' | 'manual' | null;
  durationSec: number;
  createdAt: number;
  sizeBytes: number;
  tempoPitchLinked: boolean;
  playbackDurationSec: number | null;
  volumeEnvelope?: LocalFieldModuleState | null;
  pitchEnvelope?: LocalFieldModuleState | null;
  origin?: 'browserLocal' | 'importedPackage' | 'merged';
  sourcePackageId?: string | null;
  syncState?: 'localOnly' | 'imported' | 'modifiedSinceImport' | 'exported';
  contentHash?: string | null;
};

type StoredMelodicSampleRecord = SavedMelodicSampleMeta & {
  blob: Blob;
};

type LegacyStoredMelodicSampleRecord = Omit<StoredMelodicSampleRecord, 'playbackDurationSec' | 'baseHzSource' | 'volumeEnvelope' | 'pitchEnvelope'> & {
  playbackDurationSec?: number | null;
  baseHzSource?: 'estimated' | 'manual' | null;
  volumeEnvelope?: LocalFieldModuleState | null;
  pitchEnvelope?: LocalFieldModuleState | null;
};

const DB_NAME = 'xensonar-melodic-samples';
const STORE_NAME = 'samples';
const DB_VERSION = 3;

let dbPromise: Promise<IDBDatabase> | null = null;
const bufferCache = new Map<string, AudioBuffer>();

function openDb(): Promise<IDBDatabase> {
  if (typeof window === 'undefined' || !('indexedDB' in window)) {
    return Promise.reject(new Error('IndexedDB not available'));
  }
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const request = window.indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (event) => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
      const transaction = request.transaction;
      if (transaction) {
        const store = transaction.objectStore(STORE_NAME);
        if (event.oldVersion < 3) {
          const cursorRequest = store.openCursor();
          cursorRequest.onsuccess = () => {
            const cursor = cursorRequest.result;
            if (!cursor) return;
            const value = cursor.value as LegacyStoredMelodicSampleRecord;
            if (typeof value.tempoPitchLinked !== 'boolean') value.tempoPitchLinked = true;
            if (!('playbackDurationSec' in value)) value.playbackDurationSec = null;
            if (!('baseHzSource' in value)) value.baseHzSource = value.baseHz != null ? 'estimated' : null;
            if (!('volumeEnvelope' in value)) value.volumeEnvelope = null;
            if (!('pitchEnvelope' in value)) value.pitchEnvelope = null;
            cursor.update(value);
            cursor.continue();
          };
        }
      }
    };
    request.onblocked = () => {
      notifyMelodicSampleLibraryStatus({
        kind: 'upgrade_blocked',
        message: 'Sample-Datenbank wartet auf Upgrade: Bitte ältere Xensonar-Tabs schließen und kurz erneut versuchen.',
      });
    };
    request.onsuccess = () => {
      const db = request.result;
      db.onversionchange = () => {
        try { db.close(); } catch {}
        dbPromise = null;
      };
      resolve(db);
    };
    request.onerror = () => {
      dbPromise = null;
      reject(request.error ?? new Error('IndexedDB open failed'));
    };
  });
  return dbPromise;
}

function transactionStore(mode: IDBTransactionMode) {
  return openDb().then((db) => db.transaction(STORE_NAME, mode).objectStore(STORE_NAME));
}

function mixToMono(buffer: AudioBuffer) {
  const length = Math.min(buffer.length, Math.floor(buffer.sampleRate * 1.5));
  const mono = new Float32Array(length);
  const channels = Math.max(1, buffer.numberOfChannels);
  for (let channel = 0; channel < channels; channel += 1) {
    const data = buffer.getChannelData(channel);
    for (let index = 0; index < length; index += 1) mono[index] += data[index] / channels;
  }
  return mono;
}

function estimateFromAutocorrelation(signal: Float32Array, sampleRate: number) {
  const size = signal.length;
  if (size < 32) return null;
  let rms = 0;
  for (let i = 0; i < size; i += 1) rms += signal[i] * signal[i];
  rms = Math.sqrt(rms / size);
  if (rms < 0.01) return null;

  let start = 0;
  let end = size - 1;
  while (start < size && Math.abs(signal[start]) < 0.02) start += 1;
  while (end > start && Math.abs(signal[end]) < 0.02) end -= 1;
  const clipped = signal.slice(start, end + 1);
  if (clipped.length < 32) return null;

  const minLag = Math.max(8, Math.floor(sampleRate / 1200));
  const maxLag = Math.min(clipped.length - 1, Math.ceil(sampleRate / 40));
  let bestLag = -1;
  let best = -Infinity;
  for (let lag = minLag; lag <= maxLag; lag += 1) {
    let corr = 0;
    for (let i = 0; i < clipped.length - lag; i += 1) corr += clipped[i] * clipped[i + lag];
    if (corr > best) {
      best = corr;
      bestLag = lag;
    }
  }
  if (bestLag <= 0) return null;
  const freq = sampleRate / bestLag;
  if (!Number.isFinite(freq) || freq < 30 || freq > 4000) return null;
  return freq;
}

function estimateFromSpectrum(buffer: AudioBuffer) {
  const mono = mixToMono(buffer);
  const n = 1 << Math.min(15, Math.max(11, Math.floor(Math.log2(mono.length))));
  const windowed = mono.slice(0, n);
  if (windowed.length < 1024) return null;
  let bestIndex = -1;
  let bestMag = 0;
  const nyquist = buffer.sampleRate / 2;
  const binHz = nyquist / (windowed.length / 2);
  for (let i = 1; i < windowed.length / 2; i += 1) {
    const hz = i * binHz;
    if (hz < 30 || hz > 4000) continue;
    let re = 0;
    let im = 0;
    for (let j = 0; j < windowed.length; j += 1) {
      const phase = (2 * Math.PI * i * j) / windowed.length;
      re += windowed[j] * Math.cos(phase);
      im -= windowed[j] * Math.sin(phase);
    }
    const mag = re * re + im * im;
    if (mag > bestMag) {
      bestMag = mag;
      bestIndex = i;
    }
  }
  return bestIndex > 0 ? bestIndex * binHz : null;
}



export function describeMelodicSamplePitchAnchor(sample: Pick<SavedMelodicSampleMeta, 'baseHz' | 'baseHzSource'>) {
  if (sample.baseHz == null) return 'geschätzte Pitchbasis noch unklar';
  return sample.baseHzSource === 'manual'
    ? `gesetzter Pitchanker ${sample.baseHz.toFixed(1)} Hz`
    : `geschätzte Pitchbasis ${sample.baseHz.toFixed(1)} Hz`;
}

function normalizeEnvelopeField(field: LocalFieldModuleState | null | undefined, target: 'dynamic-fade' | 'pitch-elastic') {
  if (!field) return null;
  const next = ensureLocalFieldState(field);
  next.interpreterKind = target;
  return sanitizeLocalFieldState(next);
}

function toSavedMelodicSampleMeta(record: StoredMelodicSampleRecord): SavedMelodicSampleMeta {
  return {
    id: record.id,
    name: record.name,
    baseHz: record.baseHz,
    baseHzSource: record.baseHzSource ?? (record.baseHz != null ? 'estimated' : null),
    durationSec: record.durationSec,
    createdAt: record.createdAt,
    sizeBytes: record.sizeBytes,
    tempoPitchLinked: record.tempoPitchLinked,
    playbackDurationSec: record.playbackDurationSec,
    volumeEnvelope: normalizeEnvelopeField(record.volumeEnvelope ?? null, 'dynamic-fade'),
    pitchEnvelope: normalizeEnvelopeField(record.pitchEnvelope ?? null, 'pitch-elastic'),
    origin: record.origin ?? 'browserLocal',
    sourcePackageId: record.sourcePackageId ?? null,
    syncState: record.syncState ?? 'localOnly',
    contentHash: record.contentHash ?? null,
  };
}

function createSampleId() {
  return `sample-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

async function persistMelodicSampleRecord(record: StoredMelodicSampleRecord) {
  const store = await transactionStore('readwrite');
  await new Promise<void>((resolve, reject) => {
    const request = store.put(record);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error ?? new Error('Failed to save melodic sample'));
  });
}

async function saveMelodicSampleBlob(blob: Blob, options: { name: string; createdAt?: number; sizeBytes?: number } ): Promise<SavedMelodicSampleMeta> {
  const analysis = await estimateSampleBaseHz(blob);
  const createdAt = options.createdAt ?? Date.now();
  const record: StoredMelodicSampleRecord = {
    id: createSampleId(),
    name: options.name,
    baseHz: analysis.baseHz,
    baseHzSource: analysis.baseHz != null ? 'estimated' : null,
    durationSec: analysis.durationSec,
    createdAt,
    sizeBytes: options.sizeBytes ?? blob.size,
    tempoPitchLinked: true,
    playbackDurationSec: null,
    volumeEnvelope: null,
    pitchEnvelope: null,
    origin: 'browserLocal',
    sourcePackageId: null,
    syncState: 'localOnly',
    contentHash: null,
    blob,
  };
  await persistMelodicSampleRecord(record);
  notifyMelodicSampleLibraryUpdated({ reason: 'save', sampleId: record.id, name: record.name });
  return toSavedMelodicSampleMeta(record);
}

async function decodeFileToBuffer(file: Blob): Promise<AudioBuffer> {
  const AudioCtx = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioCtx) throw new Error('AudioContext not available');
  const ctx = new AudioCtx();
  try {
    const arrayBuffer = await file.arrayBuffer();
    return await ctx.decodeAudioData(arrayBuffer.slice(0));
  } finally {
    void ctx.close().catch(() => undefined);
  }
}

export async function estimateSampleBaseHz(file: Blob) {
  const buffer = await decodeFileToBuffer(file);
  const mono = mixToMono(buffer);
  const auto = estimateFromAutocorrelation(mono, buffer.sampleRate);
  const spectral = auto ? null : estimateFromSpectrum(buffer);
  return {
    baseHz: auto ?? spectral ?? null,
    durationSec: buffer.duration,
  };
}

export async function listSavedMelodicSamples(): Promise<SavedMelodicSampleMeta[]> {
  try {
    const store = await transactionStore('readonly');
    return await new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => {
        const rows = (request.result as StoredMelodicSampleRecord[])
          .map((row) => toSavedMelodicSampleMeta(row))
          .sort((a, b) => a.name.localeCompare(b.name));
        resolve(rows);
      };
      request.onerror = () => reject(request.error ?? new Error('Failed to list melodic samples'));
    });
  } catch {
    return [];
  }
}

export async function saveUploadedMelodicSamples(files: File[]): Promise<SavedMelodicSampleMeta[]> {
  const metas: SavedMelodicSampleMeta[] = [];
  for (const file of files) metas.push(await saveMelodicSampleBlob(file, { name: file.name, sizeBytes: file.size }));
  return metas;
}

export async function saveGeneratedMelodicSample(name: string, blob: Blob): Promise<SavedMelodicSampleMeta> {
  return saveMelodicSampleBlob(blob, { name });
}


export async function saveImportedMelodicSampleBlob(blob: Blob, options: {
  name: string;
  createdAt?: number;
  sizeBytes?: number;
  durationSec: number;
  baseHz?: number | null;
  baseHzSource?: 'estimated' | 'manual' | null;
  volumeEnvelope?: LocalFieldModuleState | null;
  pitchEnvelope?: LocalFieldModuleState | null;
  sourcePackageId?: string | null;
  contentHash?: string | null;
  tempoPitchLinked?: boolean;
  playbackDurationSec?: number | null;
  replaceSampleId?: string | null;
}): Promise<SavedMelodicSampleMeta> {
  const record: StoredMelodicSampleRecord = {
    id: options.replaceSampleId ?? createSampleId(),
    name: options.name,
    baseHz: Object.prototype.hasOwnProperty.call(options, 'baseHz') ? options.baseHz ?? null : null,
    baseHzSource: Object.prototype.hasOwnProperty.call(options, 'baseHzSource') ? options.baseHzSource ?? null : ((Object.prototype.hasOwnProperty.call(options, 'baseHz') && options.baseHz != null) ? 'estimated' : null),
    durationSec: options.durationSec,
    createdAt: options.createdAt ?? Date.now(),
    sizeBytes: options.sizeBytes ?? blob.size,
    tempoPitchLinked: options.tempoPitchLinked ?? true,
    playbackDurationSec: options.playbackDurationSec ?? null,
    volumeEnvelope: normalizeEnvelopeField(options.volumeEnvelope ?? null, 'dynamic-fade'),
    pitchEnvelope: normalizeEnvelopeField(options.pitchEnvelope ?? null, 'pitch-elastic'),
    origin: 'importedPackage',
    sourcePackageId: options.sourcePackageId ?? null,
    syncState: 'imported',
    contentHash: options.contentHash ?? null,
    blob,
  };
  await persistMelodicSampleRecord(record);
  notifyMelodicSampleLibraryUpdated({ reason: 'save', sampleId: record.id, name: record.name });
  return toSavedMelodicSampleMeta(record);
}

export async function deleteSavedMelodicSample(sampleId: string) {
  try {
    const store = await transactionStore('readwrite');
    await new Promise<void>((resolve, reject) => {
      const request = store.delete(sampleId);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error ?? new Error('Failed to delete melodic sample'));
    });
    bufferCache.delete(sampleId);
    notifyMelodicSampleLibraryUpdated({ reason: 'delete', sampleId });
  } catch {
    // ignore
  }
}

export async function getSavedMelodicSampleBlob(sampleId: string): Promise<Blob | null> {
  try {
    const store = await transactionStore('readonly');
    return await new Promise((resolve, reject) => {
      const request = store.get(sampleId);
      request.onsuccess = () => {
        const row = request.result as StoredMelodicSampleRecord | undefined;
        resolve(row?.blob ?? null);
      };
      request.onerror = () => reject(request.error ?? new Error('Failed to load melodic sample blob'));
    });
  } catch {
    return null;
  }
}



export async function updateSavedMelodicSampleMeta(sampleId: string, updates: {
  name?: string;
  baseHz?: number | null;
  baseHzSource?: 'estimated' | 'manual' | null;
  tempoPitchLinked?: boolean;
  playbackDurationSec?: number | null;
  volumeEnvelope?: LocalFieldModuleState | null;
  pitchEnvelope?: LocalFieldModuleState | null;
}) {
  try {
    const store = await transactionStore('readwrite');
    const existing = await new Promise<StoredMelodicSampleRecord | null>((resolve, reject) => {
      const request = store.get(sampleId);
      request.onsuccess = () => resolve((request.result as StoredMelodicSampleRecord | undefined) ?? null);
      request.onerror = () => reject(request.error ?? new Error('Failed to load melodic sample for update'));
    });
    if (!existing) return null;
    const next: StoredMelodicSampleRecord = {
      ...existing,
      name: Object.prototype.hasOwnProperty.call(updates, 'name') ? (updates.name?.trim() || existing.name) : existing.name,
      baseHz: Object.prototype.hasOwnProperty.call(updates, 'baseHz') ? updates.baseHz ?? null : existing.baseHz,
      baseHzSource: Object.prototype.hasOwnProperty.call(updates, 'baseHzSource')
        ? updates.baseHzSource ?? null
        : (Object.prototype.hasOwnProperty.call(updates, 'baseHz') ? ((updates.baseHz ?? null) != null ? 'manual' : null) : (existing.baseHzSource ?? (existing.baseHz != null ? 'estimated' : null))),
      tempoPitchLinked: typeof updates.tempoPitchLinked === 'boolean' ? updates.tempoPitchLinked : (existing.tempoPitchLinked ?? true),
      playbackDurationSec: Object.prototype.hasOwnProperty.call(updates, 'playbackDurationSec') ? (updates.playbackDurationSec ?? null) : (existing.playbackDurationSec ?? null),
      volumeEnvelope: Object.prototype.hasOwnProperty.call(updates, 'volumeEnvelope') ? normalizeEnvelopeField(updates.volumeEnvelope ?? null, 'dynamic-fade') : normalizeEnvelopeField(existing.volumeEnvelope ?? null, 'dynamic-fade'),
      pitchEnvelope: Object.prototype.hasOwnProperty.call(updates, 'pitchEnvelope') ? normalizeEnvelopeField(updates.pitchEnvelope ?? null, 'pitch-elastic') : normalizeEnvelopeField(existing.pitchEnvelope ?? null, 'pitch-elastic'),
      syncState: existing.origin === 'importedPackage' ? 'modifiedSinceImport' : (existing.syncState ?? 'localOnly'),
    };
    await persistMelodicSampleRecord(next);
    notifyMelodicSampleLibraryUpdated({ reason: 'update', sampleId: next.id, name: next.name });
    return toSavedMelodicSampleMeta(next);
  } catch {
    return null;
  }
}

export async function loadMelodicSampleBuffer(sampleId: string, ctx: BaseAudioContext): Promise<{ buffer: AudioBuffer; baseHz: number | null; baseHzSource: 'estimated' | 'manual' | null; tempoPitchLinked: boolean; playbackDurationSec: number | null; volumeEnvelope: LocalFieldModuleState | null; pitchEnvelope: LocalFieldModuleState | null } | null> {
  const cachedBuffer = bufferCache.get(sampleId);
  if (cachedBuffer) {
    const metas = await listSavedMelodicSamples();
    const meta = metas.find((entry) => entry.id === sampleId);
    return {
      buffer: cachedBuffer,
      baseHz: meta?.baseHz ?? null,
      baseHzSource: meta?.baseHzSource ?? (meta?.baseHz != null ? 'estimated' : null),
      tempoPitchLinked: meta?.tempoPitchLinked ?? true,
      playbackDurationSec: meta?.playbackDurationSec ?? null,
      volumeEnvelope: normalizeEnvelopeField(meta?.volumeEnvelope ?? null, 'dynamic-fade'),
      pitchEnvelope: normalizeEnvelopeField(meta?.pitchEnvelope ?? null, 'pitch-elastic'),
    };
  }
  const blob = await getSavedMelodicSampleBlob(sampleId);
  if (!blob) return null;
  const arrayBuffer = await blob.arrayBuffer();
  const buffer = await ctx.decodeAudioData(arrayBuffer.slice(0));
  bufferCache.set(sampleId, buffer);
  const metas = await listSavedMelodicSamples();
  const meta = metas.find((entry) => entry.id === sampleId);
  return {
    buffer,
    baseHz: meta?.baseHz ?? null,
    baseHzSource: meta?.baseHzSource ?? (meta?.baseHz != null ? 'estimated' : null),
    tempoPitchLinked: meta?.tempoPitchLinked ?? true,
    playbackDurationSec: meta?.playbackDurationSec ?? null,
    volumeEnvelope: normalizeEnvelopeField(meta?.volumeEnvelope ?? null, 'dynamic-fade'),
    pitchEnvelope: normalizeEnvelopeField(meta?.pitchEnvelope ?? null, 'pitch-elastic'),
  };
}
