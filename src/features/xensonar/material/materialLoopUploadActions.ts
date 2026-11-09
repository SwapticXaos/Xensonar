import { registerMaterialExport, type MaterialEntry } from '../../l3lab/materialLibrary';

export type DirectLoopUploadTarget = 'material' | 'root-follow';

function sanitizeUploadName(fileName: string) {
  return fileName.replace(/\.[^.]+$/, '').trim() || 'Loop Upload';
}

function clampBars(value: number) {
  return Number.isFinite(value) ? Math.max(1, Math.min(64, Math.round(value))) : 1;
}

function inferGuideSegments(bars: number) {
  return Math.max(1, Math.min(16, Math.round(bars) || 1));
}

async function decodeAudioDurationSec(file: File): Promise<number> {
  const AudioContextCtor = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextCtor) throw new Error('AudioContext nicht verfügbar.');
  const ctx = new AudioContextCtor();
  try {
    const data = await file.arrayBuffer();
    const decoded = await ctx.decodeAudioData(data.slice(0));
    return Math.max(0.05, decoded.duration);
  } finally {
    try { await ctx.close(); } catch {}
  }
}

export async function registerUploadedAudioLoop(args: {
  file: File;
  bars: number;
  target: DirectLoopUploadTarget;
  rootHz?: number | null;
}): Promise<MaterialEntry> {
  const bars = clampBars(args.bars);
  const durationSec = await decodeAudioDurationSec(args.file);
  const intendedLoopDurationSec = durationSec;
  const rootFollowPreferred = args.target === 'root-follow';
  const name = sanitizeUploadName(args.file.name);
  return registerMaterialExport({
    name,
    role: 'loop',
    bpm: 108,
    bars,
    guideSegments: inferGuideSegments(bars),
    guideMarkers: [0.25, 0.5, 0.75],
    loopStartSec: 0,
    loopEndSec: durationSec,
    rootHz: Number.isFinite(args.rootHz ?? NaN) ? args.rootHz ?? null : null,
    sourceVersion: 'xensonar-direct-loop-upload-v1',
    renderMode: rootFollowPreferred ? 'direct-root-follow-loop-upload' : 'direct-material-loop-upload',
    durationSec,
    intendedLoopDurationSec,
    workspaceOrigin: 'haupttraum-direct-upload',
    routeSummary: rootFollowPreferred
      ? 'Direkter Loop-Upload aus dem Root-Follow-Verwalten: Audiodatei bleibt Loop-Material und wird in die live steuerbare Root-Follow-Bank gelegt.'
      : 'Direkter Loop-Upload aus dem Materialspur-Verwalten: Audiodatei wird ohne SpectralForge-Umweg als stabiler Materialspur-Loop gespeichert.',
    stabilizeBy: 'Takte wurden beim Upload manuell gesetzt; Xensonar interpretiert die Audiodauer gegen diese Taktzahl.',
    rootFollowPreferred,
  }, args.file);
}
