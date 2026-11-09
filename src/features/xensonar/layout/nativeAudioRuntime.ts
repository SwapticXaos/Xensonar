export const XENSONAR_NATIVE_AUDIO_BASE_URL = 'http://127.0.0.1:32185';
export const XENSONAR_NATIVE_AUDIO_PREF_KEY = 'xensonar-native-audio-enabled-v1';
export const XENSONAR_NATIVE_AUDIO_INSTALLER_FILENAME = 'xensonar-native-audio_0.385.7_amd64.deb';
export const XENSONAR_NATIVE_AUDIO_SERVICE_VERSION = '0.385.7';

export function nativeAudioRequested(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const search = new URLSearchParams(window.location.search);
    if (search.get('nativeRflMaterial') === '1') return true;
    if (search.get('nativeRflMaterial') === '0') return false;
    return window.localStorage.getItem(XENSONAR_NATIVE_AUDIO_PREF_KEY) === '1';
  } catch {
    return false;
  }
}

export function setNativeAudioRequested(enabled: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    if (enabled) window.localStorage.setItem(XENSONAR_NATIVE_AUDIO_PREF_KEY, '1');
    else window.localStorage.removeItem(XENSONAR_NATIVE_AUDIO_PREF_KEY);
  } catch {}
}

export function nativeAudioAssetUrl(path: string): string {
  return `${XENSONAR_NATIVE_AUDIO_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;
}

export type NativeAudioProbe = {
  available: boolean;
  physicalAudio: boolean;
  compatible: boolean;
  serviceVersion: string;
  sampleRate: number;
  deviceQuantumFrames: number;
};

export async function probeNativeAudioHost(timeoutMs = 900): Promise<NativeAudioProbe> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(nativeAudioAssetUrl('/v1/session'), {
      method: 'GET',
      cache: 'no-store',
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`native host ${response.status}`);
    const session = await response.json() as Record<string, unknown>;
    return {
      available: true,
      physicalAudio: session.physicalAudio === true,
      compatible: String(session.serviceVersion || '') === XENSONAR_NATIVE_AUDIO_SERVICE_VERSION,
      serviceVersion: String(session.serviceVersion || ''),
      sampleRate: Number(session.sampleRate || 0),
      deviceQuantumFrames: Number(session.deviceQuantumFrames || 0),
    };
  } catch {
    return { available: false, physicalAudio: false, compatible: false, serviceVersion: '', sampleRate: 0, deviceQuantumFrames: 0 };
  } finally {
    window.clearTimeout(timer);
  }
}

declare global {
  interface Window {
    __XENSONAR_NATIVE_INSTALLER_LINUX_X64_DEB_B64__?: string;
  }
}

export function nativeAudioInstallerEmbedded(): boolean {
  return typeof window !== 'undefined' && Boolean(window.__XENSONAR_NATIVE_INSTALLER_LINUX_X64_DEB_B64__);
}

export function nativeProvenSlimBuild(): boolean {
  return typeof window !== 'undefined' && window.__XENSONAR_NATIVE_PROVEN_SLIM__ === true;
}

export function downloadEmbeddedNativeAudioInstaller(): boolean {
  if (typeof window === 'undefined' || typeof document === 'undefined') return false;
  const encoded = window.__XENSONAR_NATIVE_INSTALLER_LINUX_X64_DEB_B64__;
  if (!encoded) return false;
  try {
    const binary = window.atob(encoded);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    const url = URL.createObjectURL(new Blob([bytes], { type: 'application/vnd.debian.binary-package' }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = XENSONAR_NATIVE_AUDIO_INSTALLER_FILENAME;
    anchor.style.display = 'none';
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 5000);
    return true;
  } catch {
    return false;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => window.setTimeout(resolve, ms));
}



export type NativeAudioProof = {
  verified: boolean;
  materialAssetsPublished: number;
  windowsAccepted: number;
  nonzeroCallbacks: number;
  processErrors: number;
  reason: string;
};

export async function probeNativeAudioProof(timeoutMs = 1400): Promise<NativeAudioProof> {
  const empty = (reason: string): NativeAudioProof => ({
    verified: false,
    materialAssetsPublished: 0,
    windowsAccepted: 0,
    nonzeroCallbacks: 0,
    processErrors: 0,
    reason,
  });
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    const sessionResponse = await fetch(nativeAudioAssetUrl('/v1/session'), {
      method: 'GET', cache: 'no-store', signal: controller.signal,
    });
    if (!sessionResponse.ok) return empty(`session-${sessionResponse.status}`);
    const session = await sessionResponse.json() as Record<string, unknown>;
    if (session.physicalAudio !== true) return empty('physical-audio-not-ready');
    if (String(session.serviceVersion || '') !== XENSONAR_NATIVE_AUDIO_SERVICE_VERSION) return empty('service-version-mismatch');
    const token = String(session.token || '');
    const sessionId = String(session.sessionId || '');
    if (!token || !sessionId) return empty('session-identity-missing');
    const statusResponse = await fetch(nativeAudioAssetUrl('/v1/status'), {
      method: 'GET',
      cache: 'no-store',
      headers: {
        'X-Xensonar-Token': token,
        'X-Xensonar-Session': sessionId,
      },
      signal: controller.signal,
    });
    if (!statusResponse.ok) return empty(`status-${statusResponse.status}`);
    const status = await statusResponse.json() as Record<string, unknown>;
    const materialAssetsPublished = Number(status.rflMaterialAssetsPublished || 0);
    const windowsAccepted = Number(status.rflMaterialWindowsAccepted || 0);
    const nonzeroCallbacks = Number(status.rflMaterialNonzeroCallbacks || 0);
    const processErrors = Number(status.processErrors || 0);
    const verified = materialAssetsPublished > 0 && windowsAccepted > 0 && nonzeroCallbacks > 0 && processErrors === 0;
    return {
      verified,
      materialAssetsPublished,
      windowsAccepted,
      nonzeroCallbacks,
      processErrors,
      reason: verified ? 'native-rfl-audio-proven' : 'awaiting-native-rfl-audio-proof',
    };
  } catch {
    return empty('proof-fetch-failed');
  } finally {
    window.clearTimeout(timer);
  }
}

type NativeSlimSaveResult = {
  ok: boolean;
  bytes: number;
  method: 'file-picker' | 'download' | 'failed';
  filename: string;
};

declare global {
  interface Window {
    showSaveFilePicker?: (options?: Record<string, unknown>) => Promise<{
      createWritable: () => Promise<{ write: (data: Blob) => Promise<void>; close: () => Promise<void> }>;
    }>;
    __XENSONAR_NATIVE_PROVEN_SLIM__?: boolean;
  }
}

function currentHtmlFilename(): string {
  try {
    const raw = decodeURIComponent(window.location.pathname.split('/').pop() || 'Xensonar_385.html');
    return raw.toLowerCase().endsWith('.html') ? raw : `${raw}.html`;
  } catch {
    return 'Xensonar_385.html';
  }
}

export function buildNativeProvenSlimHtml(): string | null {
  if (typeof document === 'undefined') return null;
  const clone = document.documentElement.cloneNode(true) as HTMLElement;
  const root = clone.querySelector('#root');
  if (root) root.innerHTML = '';
  clone.querySelector('#xensonar-variant2-native-audio-inline-v03857')?.remove();
  clone.querySelector('#xensonar-native-proven-slim-marker')?.remove();
  const head = clone.querySelector('head');
  if (!head) return null;
  const marker = document.createElement('script');
  marker.id = 'xensonar-native-proven-slim-marker';
  marker.textContent = "window.__XENSONAR_NATIVE_PROVEN_SLIM__=true;try{localStorage.setItem('xensonar-native-audio-enabled-v1','1')}catch(e){}";
  head.insertBefore(marker, head.firstChild);
  return `<!doctype html>\n${clone.outerHTML}`;
}

export async function saveNativeProvenSlimHtml(): Promise<NativeSlimSaveResult> {
  if (typeof window === 'undefined' || typeof document === 'undefined') return { ok: false, bytes: 0, method: 'failed', filename: '' };
  const html = buildNativeProvenSlimHtml();
  if (!html) return { ok: false, bytes: 0, method: 'failed', filename: '' };
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const original = currentHtmlFilename();
  const filename = original.replace(/\.html$/i, '') + '_NATIVE_PROVEN_SLIM.html';
  const picker = window.showSaveFilePicker;
  if (typeof picker === 'function') {
    try {
      const handle = await picker({
        suggestedName: original,
        types: [{ description: 'Xensonar HTML', accept: { 'text/html': ['.html'] } }],
      });
      const writable = await handle.createWritable();
      await writable.write(blob);
      await writable.close();
      return { ok: true, bytes: blob.size, method: 'file-picker', filename: original };
    } catch (error) {
      if ((error as { name?: string } | null)?.name === 'AbortError') return { ok: false, bytes: blob.size, method: 'failed', filename };
    }
  }
  try {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    anchor.style.display = 'none';
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 5000);
    return { ok: true, bytes: blob.size, method: 'download', filename };
  } catch {
    return { ok: false, bytes: blob.size, method: 'failed', filename };
  }
}

export async function finishNativeAudioDiagnostic(): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const sessionResponse = await fetch(nativeAudioAssetUrl('/v1/session'), { method: 'GET', cache: 'no-store' });
      if (!sessionResponse.ok) throw new Error(`session ${sessionResponse.status}`);
      const session = await sessionResponse.json() as Record<string, unknown>;
      const token = String(session.token || '');
      const sessionId = String(session.sessionId || '');
      if (!token || !sessionId) throw new Error('session identity missing');
      const response = await fetch(nativeAudioAssetUrl('/v1/shutdown'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'X-Xensonar-Token': token,
          'X-Xensonar-Session': sessionId,
        },
        body: '',
        cache: 'no-store',
      });
      if (response.ok) return true;
    } catch {}
    await sleep(250 * (attempt + 1));
  }
  return false;
}
