export type BrowserImplantDiagnosticEvent = {
  seq: number;
  iso: string;
  perfMs: number;
  area: string;
  event: string;
  detail?: unknown;
};

type DiagnosticSnapshot = Record<string, unknown>;

type DiagnosticStore = {
  version: 1;
  build: string;
  sessionId: string;
  startedIso: string;
  events: BrowserImplantDiagnosticEvent[];
};

// Snapshot providers are registered once per live owner, never per attack.
const snapshotProviders = new Map<string, () => unknown | Promise<unknown>>();
export function registerBrowserImplantSnapshotProvider(name: string, provider: () => unknown | Promise<unknown>): () => void {
  snapshotProviders.set(name, provider);
  return () => { if (snapshotProviders.get(name) === provider) snapshotProviders.delete(name); };
}
export async function collectBrowserImplantSnapshots(): Promise<Record<string, unknown>> {
  const entries = await Promise.all(Array.from(snapshotProviders, async ([name, provider]) => {
    try { return [name, await provider()] as const; }
    catch (error) { return [name, {snapshotStatus: 'failed', error: String(error)}] as const; }
  }));
  return Object.fromEntries(entries);
}
const MAX_EVENTS = 1200;
function resolveRuntimeArtifactVersion(): string | null {
  if (typeof window === 'undefined') return null;
  const fileName = window.location?.pathname?.split('/').pop() ?? '';
  const match = fileName.match(/Xensonar_(\d+(?:[._]\d+)?)_/i);
  return match?.[1] ?? null;
}

function resolveDiagnosticBuild(): string {
  const version = resolveRuntimeArtifactVersion();
  return version ? `${version}-browser-c11-runtime-diagnostic` : 'browser-c11-runtime-diagnostic';
}

const BUILD = resolveDiagnosticBuild();
let seq = 0;
let hooksInstalled = false;

function nowPerf(): number {
  return typeof performance !== 'undefined' && typeof performance.now === 'function'
    ? Math.round(performance.now() * 1000) / 1000
    : 0;
}

function makeSessionId(): string {
  const stamp = new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14);
  return `${stamp}-${Math.random().toString(36).slice(2, 8)}`;
}

const store: DiagnosticStore = {
  version: 1,
  build: BUILD,
  sessionId: makeSessionId(),
  startedIso: new Date().toISOString(),
  events: [],
};

function serializable(value: unknown, depth = 0): unknown {
  if (depth > 5) return '[depth-limit]';
  if (value == null || typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return value;
  if (value instanceof Error) return { name: value.name, message: value.message, stack: value.stack ?? null };
  if (value instanceof ArrayBuffer) return { arrayBufferBytes: value.byteLength };
  if (ArrayBuffer.isView(value)) return { typedArray: value.constructor?.name ?? 'view', byteLength: value.byteLength };
  if (Array.isArray(value)) return value.slice(0, 64).map(item => serializable(item, depth + 1));
  if (typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [key, child] of Object.entries(value as Record<string, unknown>).slice(0, 64)) {
      try { out[key] = serializable(child, depth + 1); } catch { out[key] = '[unserializable]'; }
    }
    return out;
  }
  return String(value);
}

function publishGlobal(): void {
  if (typeof window === 'undefined') return;
  (window as any).__XENSONAR_BROWSER_IMPLANT_DIAGNOSTICS__ = store;
}

export function recordBrowserImplantDiagnostic(area: string, event: string, detail?: unknown): void {
  const entry: BrowserImplantDiagnosticEvent = {
    seq: ++seq,
    iso: new Date().toISOString(),
    perfMs: nowPerf(),
    area,
    event,
    ...(detail === undefined ? {} : { detail: serializable(detail) }),
  };
  store.events.push(entry);
  if (store.events.length > MAX_EVENTS) store.events.splice(0, store.events.length - MAX_EVENTS);
  publishGlobal();
}

export function installBrowserImplantDiagnosticHooks(): void {
  if (hooksInstalled || typeof window === 'undefined') return;
  hooksInstalled = true;
  window.addEventListener('error', (ev) => {
    recordBrowserImplantDiagnostic('window', 'error', {
      message: ev.message,
      filename: ev.filename,
      lineno: ev.lineno,
      colno: ev.colno,
      error: ev.error,
    });
  });
  window.addEventListener('unhandledrejection', (ev) => {
    recordBrowserImplantDiagnostic('window', 'unhandledrejection', { reason: ev.reason });
  });
  recordBrowserImplantDiagnostic('runtime', 'diagnostic-hooks-installed', environmentSnapshot());
}

export function environmentSnapshot(audioCtx?: AudioContext | null): DiagnosticSnapshot {
  const nav = typeof navigator !== 'undefined' ? navigator : null;
  const loc = typeof window !== 'undefined' ? window.location : null;
  return {
    diagnosticBuild: BUILD,
    sessionId: store.sessionId,
    protocol: loc?.protocol ?? null,
    origin: loc?.origin ?? null,
    fileName: loc?.pathname ? loc.pathname.split('/').pop() : null,
    search: loc?.search ?? null,
    isSecureContext: typeof isSecureContext === 'boolean' ? isSecureContext : null,
    crossOriginIsolated: typeof crossOriginIsolated === 'boolean' ? crossOriginIsolated : null,
    userAgent: nav?.userAgent ?? null,
    platform: nav?.platform ?? null,
    hardwareConcurrency: nav?.hardwareConcurrency ?? null,
    deviceMemory: (nav as any)?.deviceMemory ?? null,
    visibilityState: typeof document !== 'undefined' ? document.visibilityState : null,
    webAssembly: typeof WebAssembly !== 'undefined',
    webAssemblyModule: typeof WebAssembly !== 'undefined' && typeof WebAssembly.Module !== 'undefined',
    audioWorkletNode: typeof AudioWorkletNode !== 'undefined',
    sharedArrayBuffer: typeof SharedArrayBuffer !== 'undefined',
    audioContext: audioCtx ? {
      state: audioCtx.state,
      sampleRate: audioCtx.sampleRate,
      currentTime: audioCtx.currentTime,
      baseLatency: (audioCtx as any).baseLatency ?? null,
      outputLatency: (audioCtx as any).outputLatency ?? null,
      hasAudioWorklet: !!audioCtx.audioWorklet,
      destinationChannels: audioCtx.destination?.channelCount ?? null,
    } : null,
  };
}

function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) {
    crc ^= bytes[i]!;
    for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function u16(view: DataView, off: number, value: number): void { view.setUint16(off, value & 0xffff, true); }
function u32(view: DataView, off: number, value: number): void { view.setUint32(off, value >>> 0, true); }

function concat(parts: Uint8Array[]): Uint8Array {
  const total = parts.reduce((sum, p) => sum + p.byteLength, 0);
  const out = new Uint8Array(total);
  let off = 0;
  for (const p of parts) { out.set(p, off); off += p.byteLength; }
  return out;
}

function dosDateTime(date = new Date()): { time: number; date: number } {
  const year = Math.max(1980, date.getFullYear());
  return {
    time: ((date.getHours() & 31) << 11) | ((date.getMinutes() & 63) << 5) | ((Math.floor(date.getSeconds() / 2)) & 31),
    date: (((year - 1980) & 127) << 9) | (((date.getMonth() + 1) & 15) << 5) | (date.getDate() & 31),
  };
}

function makeStoreZip(files: Array<{ name: string; text: string }>): Uint8Array {
  const enc = new TextEncoder();
  const locals: Uint8Array[] = [];
  const centrals: Uint8Array[] = [];
  let offset = 0;
  const stamp = dosDateTime();

  for (const file of files) {
    const name = enc.encode(file.name);
    const data = enc.encode(file.text);
    const crc = crc32(data);
    const local = new Uint8Array(30 + name.length);
    const lv = new DataView(local.buffer);
    u32(lv, 0, 0x04034b50);
    u16(lv, 4, 20);
    u16(lv, 6, 0x0800);
    u16(lv, 8, 0);
    u16(lv, 10, stamp.time);
    u16(lv, 12, stamp.date);
    u32(lv, 14, crc);
    u32(lv, 18, data.length);
    u32(lv, 22, data.length);
    u16(lv, 26, name.length);
    u16(lv, 28, 0);
    local.set(name, 30);
    locals.push(local, data);

    const central = new Uint8Array(46 + name.length);
    const cv = new DataView(central.buffer);
    u32(cv, 0, 0x02014b50);
    u16(cv, 4, 20);
    u16(cv, 6, 20);
    u16(cv, 8, 0x0800);
    u16(cv, 10, 0);
    u16(cv, 12, stamp.time);
    u16(cv, 14, stamp.date);
    u32(cv, 16, crc);
    u32(cv, 20, data.length);
    u32(cv, 24, data.length);
    u16(cv, 28, name.length);
    u16(cv, 30, 0);
    u16(cv, 32, 0);
    u16(cv, 34, 0);
    u16(cv, 36, 0);
    u32(cv, 38, 0);
    u32(cv, 42, offset);
    central.set(name, 46);
    centrals.push(central);
    offset += local.byteLength + data.byteLength;
  }

  const centralBytes = concat(centrals);
  const end = new Uint8Array(22);
  const ev = new DataView(end.buffer);
  u32(ev, 0, 0x06054b50);
  u16(ev, 4, 0);
  u16(ev, 6, 0);
  u16(ev, 8, files.length);
  u16(ev, 10, files.length);
  u32(ev, 12, centralBytes.byteLength);
  u32(ev, 16, offset);
  u16(ev, 20, 0);
  return concat([...locals, centralBytes, end]);
}

export function buildDiagnosticStoreZipForTest(files: Array<{ name: string; text: string }>): Uint8Array {
  return makeStoreZip(files);
}

function eventText(events: BrowserImplantDiagnosticEvent[]): string {
  return events.map(e => {
    const detail = e.detail === undefined ? '' : ` ${JSON.stringify(e.detail)}`;
    return `${String(e.seq).padStart(4, '0')} ${e.iso} +${e.perfMs.toFixed(3)}ms [${e.area}] ${e.event}${detail}`;
  }).join('\n') + '\n';
}

export async function downloadBrowserImplantRuntimeDiagnostic(args: {
  snapshot: unknown;
  audioCtx?: AudioContext | null;
  host?: unknown;
  extra?: Record<string, unknown>;
}): Promise<boolean> {
  if (typeof document === 'undefined' || typeof URL === 'undefined') return false;
  try {
    const owners = await collectBrowserImplantSnapshots();
    recordBrowserImplantDiagnostic('diagnostic', 'zip-requested', { snapshot: args.snapshot });
    const env = environmentSnapshot(args.audioCtx);
    const manifest = {
      format: 'xensonar-browser-implant-runtime-diagnostic-v1',
      diagnosticBuild: BUILD,
      createdIso: new Date().toISOString(),
      sessionId: store.sessionId,
      eventCount: store.events.length,
      filesAreStoreOnlyZip: true,
      aggregateSchema: '400.1-reject-fence-input-age-v1',
      snapshotsAreAtomicAcrossOwners: false,
      note: 'No audio PCM is included. This ZIP contains runtime state and boot/control diagnostics only.',
    };
    const files = [
      { name: 'README.txt', text: [
        'Xensonar C11 Browser Implant runtime diagnostic',
        `Build: ${BUILD}`,
        `Session: ${store.sessionId}`,
        '',
        'Important boot stages to inspect:',
        '- worklet-module-*',
        '- processor-constructed',
        '- init-posted / init-ack',
        '- kernel-bridge-create-*',
        '- ready / fault / ready-timeout',
        '',
        'No audio samples are stored in this diagnostic.',
        '',
      ].join('\n') },
      { name: 'manifest.json', text: JSON.stringify(manifest, null, 2) + '\n' },
      { name: 'environment.json', text: JSON.stringify(env, null, 2) + '\n' },
      { name: 'browser_implant_snapshot.json', text: JSON.stringify(serializable(args.snapshot), null, 2) + '\n' },
      { name: 'host_snapshot.json', text: JSON.stringify((owners.direct as {host?: unknown} | undefined)?.host ?? serializable(args.host ?? null), null, 2) + '\n' },
      { name: 'admission_session_snapshots.json', text: JSON.stringify(owners, null, 2) + '\n' },
      { name: 'extra.json', text: JSON.stringify(serializable(args.extra ?? {}), null, 2) + '\n' },
      { name: 'events.json', text: JSON.stringify(store.events, null, 2) + '\n' },
      { name: 'events.log', text: eventText(store.events) },
    ];
    const bytes = makeStoreZip(files);
    const zipBuffer = new ArrayBuffer(bytes.byteLength);
    new Uint8Array(zipBuffer).set(bytes);
    const blob = new Blob([zipBuffer], { type: 'application/zip' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    a.href = url;
    const version = resolveRuntimeArtifactVersion();
    a.download = version
      ? `Xensonar_${version}_BROWSER_IMPLANT_RUNTIME_${stamp}.zip`
      : `Xensonar_BROWSER_IMPLANT_RUNTIME_${stamp}.zip`;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 5000);
    recordBrowserImplantDiagnostic('diagnostic', 'zip-download-triggered', { bytes: bytes.byteLength });
    return true;
  } catch (error) {
    recordBrowserImplantDiagnostic('diagnostic', 'zip-failed', { error });
    return false;
  }
}

publishGlobal();
