import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  downloadEmbeddedNativeAudioInstaller,
  finishNativeAudioDiagnostic,
  nativeAudioRequested,
  nativeAudioInstallerEmbedded,
  nativeProvenSlimBuild,
  probeNativeAudioHost,
  probeNativeAudioProof,
  saveNativeProvenSlimHtml,
  type NativeAudioProof,
  setNativeAudioRequested,
  type NativeAudioProbe,
} from './nativeAudioRuntime';
import { recordBrowserImplantDiagnostic } from '../browserImplant/runtimeDiagnostics';

type Availability = 'checking' | 'missing' | 'ready';
type InstallState = 'idle' | 'checking' | 'waiting' | 'failed';
type DiagnosticState = 'idle' | 'ending' | 'queued' | 'failed';
type SlimState = 'idle' | 'saving' | 'saved' | 'failed';
const RELOAD_GUARD = 'xensonar-native-audio-ready-reload-v1';

export function HeaderNativeAudioControl() {
  const [open, setOpen] = useState(false);
  const [requested, setRequested] = useState(() => nativeAudioRequested());
  const [availability, setAvailability] = useState<Availability>('checking');
  const [probe, setProbe] = useState<NativeAudioProbe>({ available: false, physicalAudio: false, compatible: false, serviceVersion: '', sampleRate: 0, deviceQuantumFrames: 0 });
  const [installState, setInstallState] = useState<InstallState>('idle');
  const [diagnosticState, setDiagnosticState] = useState<DiagnosticState>('idle');
  const [nativeProof, setNativeProof] = useState<NativeAudioProof | null>(null);
  const [slimState, setSlimState] = useState<SlimState>('idle');
  const [slimBytes, setSlimBytes] = useState(0);
  const [manualRefreshPending, setManualRefreshPending] = useState(false);
  const [manualRefreshMessage, setManualRefreshMessage] = useState<string | null>(null);
  const slimBuild = useMemo(() => nativeProvenSlimBuild(), []);
  const installerEmbedded = useMemo(() => nativeAudioInstallerEmbedded(), []);
  const previousAvailability = useRef<Availability>('checking');

  const refresh = useCallback(async (showFeedback = false) => {
    if (showFeedback) {
      setManualRefreshPending(true);
      setManualRefreshMessage('Prüfung läuft …');
      recordBrowserImplantDiagnostic('native-backend', 'manual-refresh-clicked', {});
    }
    try {
      const next = await probeNativeAudioHost();
      setProbe(next);
      const ready = next.available && next.physicalAudio && next.compatible;
      setAvailability(ready ? 'ready' : 'missing');
      if (showFeedback) {
        const stamp = new Date().toLocaleTimeString();
        setManualRefreshMessage(ready ? `Geprüft ${stamp} · Backend bereit.` : `Geprüft ${stamp} · weiterhin nicht erreichbar.`);
        recordBrowserImplantDiagnostic('native-backend', 'manual-refresh-result', { ready, probe: next });
      }
    } catch (error) {
      if (showFeedback) {
        const stamp = new Date().toLocaleTimeString();
        setManualRefreshMessage(`Geprüft ${stamp} · Fehler beim Probe.`);
        recordBrowserImplantDiagnostic('native-backend', 'manual-refresh-failed', { error });
      }
    } finally {
      if (showFeedback) setManualRefreshPending(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
    const onFocus = () => { void refresh(); };
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [refresh]);

  useEffect(() => {
    // Browser mode should not generate permanent localhost polling traffic.
    // Poll continuously only while Native is requested, while installation is
    // waiting, or while the Audio menu is open. Focus/open still refreshes once.
    if (!(requested || installState === 'waiting' || open)) return undefined;
    const intervalMs = installState === 'waiting' ? 900 : 2200;
    const poll = () => { if (!document.hidden) void refresh(); };
    poll();
    const id = window.setInterval(poll, intervalMs);
    return () => window.clearInterval(id);
  }, [installState, open, refresh, requested]);

  useEffect(() => {
    const prev = previousAvailability.current;
    previousAvailability.current = availability;
    if (availability === 'missing') {
      try { window.sessionStorage.removeItem(RELOAD_GUARD); } catch {}
      return;
    }
    if (!requested || availability !== 'ready' || prev === 'ready') return;
    if (installState !== 'waiting' && installState !== 'checking') return;
    try {
      if (window.sessionStorage.getItem(RELOAD_GUARD) === '1') return;
      window.sessionStorage.setItem(RELOAD_GUARD, '1');
    } catch {}
    window.setTimeout(() => window.location.reload(), 120);
  }, [availability, installState, requested]);

  useEffect(() => {
    if (!(requested && availability === 'ready')) {
      setNativeProof(null);
      return;
    }
    let cancelled = false;
    const check = async () => {
      const next = await probeNativeAudioProof();
      if (!cancelled) setNativeProof(next);
    };
    void check();
    const id = window.setInterval(() => { if (!document.hidden) void check(); }, 2200);
    return () => { cancelled = true; window.clearInterval(id); };
  }, [availability, requested]);

  const nativeActive = requested && availability === 'ready';
  const statusLabel = nativeActive ? 'Native' : availability === 'ready' ? 'Native bereit' : 'Browser';
  const dotClass = nativeActive ? 'bg-emerald-300' : availability === 'ready' ? 'bg-cyan-300' : 'bg-neutral-500';
  const details = useMemo(() => {
    if (availability !== 'ready') { if (probe.available && !probe.compatible) return `Native Audio ${probe.serviceVersion || 'alt'} gefunden · Update auf 0.385.7 erforderlich.`; return installState === 'waiting' ? 'Installer gestartet. Warte auf den lokalen AudioRtHost …' : 'Browser Audio aktiv. Native Audio ist noch nicht verbunden.'; }
    const rate = probe.sampleRate > 0 ? `${Math.round(probe.sampleRate / 100) / 10} kHz` : 'Audio ready';
    const quantum = probe.deviceQuantumFrames > 0 ? ` · ${probe.deviceQuantumFrames} Frames` : '';
    return `AudioRtHost verbunden · ${rate}${quantum}`;
  }, [availability, installState, probe.deviceQuantumFrames, probe.sampleRate]);

  const chooseNative = async () => {
    setNativeAudioRequested(true);
    setRequested(true);
    setInstallState('checking');
    const existing = await probeNativeAudioHost(1200);
    setProbe(existing);
    if (existing.available && existing.physicalAudio && existing.compatible) {
      setAvailability('ready');
      window.location.reload();
      return;
    }
    if (!downloadEmbeddedNativeAudioInstaller()) {
      setInstallState('failed');
      return;
    }
    setInstallState('waiting');
  };

  const chooseBrowser = () => {
    setNativeAudioRequested(false);
    setRequested(false);
    try { window.sessionStorage.removeItem(RELOAD_GUARD); } catch {}
    const url = new URL(window.location.href);
    url.searchParams.delete('nativeRflMaterial');
    window.location.assign(url.toString());
  };

  const saveSlim = async () => {
    if (!nativeProof?.verified || slimState === 'saving') return;
    setSlimState('saving');
    const result = await saveNativeProvenSlimHtml();
    setSlimBytes(result.bytes);
    setSlimState(result.ok ? 'saved' : 'failed');
  };

  const finishDiagnostic = async () => {
    if (diagnosticState === 'ending') return;
    setDiagnosticState('ending');
    const ok = await finishNativeAudioDiagnostic();
    if (!ok) {
      setDiagnosticState('failed');
      return;
    }
    setNativeAudioRequested(false);
    setRequested(false);
    setDiagnosticState('queued');
    // Hard lifecycle boundary: reload the same file:// page after the session
    // terminates so the Native RFL runtime unmounts instead of retaining a
    // stale control/session object while the supervisor starts a fresh host.
    window.setTimeout(() => window.location.reload(), 700);
  };

  return (
    <div className="relative pl-1" aria-label="Audio-Einstellungen">
      <button type="button" onClick={() => setOpen(value => !value)}
        className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[10px] uppercase tracking-[0.14em] transition ${nativeActive ? 'border-emerald-600/80 bg-emerald-950/25 text-emerald-100' : 'border-violet-700/70 bg-violet-950/20 text-violet-100 hover:bg-violet-900/30'}`}
        aria-expanded={open} aria-label="Audio-Einstellungen öffnen"
        title="Native Audio: mehr Echtzeit-Headroom und robustere Wiedergabe außerhalb des Browser-Audiopfads">
        <span className={`h-1.5 w-1.5 rounded-full ${dotClass}`} /> Audio · {statusLabel}
      </button>
      {open ? (
        <div className="absolute left-1/2 top-[calc(100%+0.5rem)] z-[1200] w-80 -translate-x-1/2 rounded-2xl border border-violet-800/70 bg-neutral-950/95 p-3 text-[11px] text-neutral-200 shadow-2xl shadow-black/70 backdrop-blur">
          <div className="flex items-start justify-between gap-3"><div><div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-violet-200">Audio Engine</div><div className="mt-1 text-neutral-300">{details}</div></div><span className={`rounded-full px-2 py-1 text-[9px] uppercase tracking-[0.14em] ${nativeActive ? 'bg-emerald-950/60 text-emerald-200' : availability === 'ready' ? 'bg-cyan-950/50 text-cyan-200' : 'bg-neutral-900 text-neutral-400'}`}>{statusLabel}</span></div>
          <p className="mt-3 leading-relaxed text-neutral-400">Native Audio verbindet Xensonar mit dem lokalen AudioRtHost. Die bestehende HTML und ihr Browser-Gedächtnis bleiben unverändert.</p>
          {availability === 'ready' ? (
            <div className="mt-3 flex gap-2">
              {!nativeActive ? <button type="button" onClick={() => void chooseNative()} className="flex-1 rounded-xl border border-emerald-500 bg-emerald-950/45 px-3 py-2.5 text-[10px] font-bold uppercase tracking-[0.14em] text-emerald-50 hover:bg-emerald-900/50">Native Audio verbinden</button> : <button type="button" onClick={chooseBrowser} className="flex-1 rounded-xl border border-neutral-700 bg-neutral-900/70 px-3 py-2 text-[10px] uppercase tracking-[0.14em] text-neutral-200 hover:bg-neutral-800">Browser verwenden</button>}
              <button type="button" onClick={() => void refresh()} className="rounded-xl border border-violet-800 px-3 py-2 text-[10px] uppercase tracking-[0.14em] text-violet-200 hover:bg-violet-950/40">Prüfen</button>
            </div>
          ) : slimBuild || !installerEmbedded ? (
            <div className="mt-3 rounded-xl border border-neutral-700 bg-neutral-900/60 p-3 text-[10px] leading-relaxed text-neutral-300">
              <div className="font-semibold text-neutral-100">Native Backend ist momentan nicht erreichbar.</div>
              <div className="mt-1">Diese kompakte Native-Proven-HTML enthält absichtlich keinen Installer mehr. Browser Audio bleibt verfügbar. Für Neuinstallation oder Backend-Update die ursprüngliche Bootstrap-HTML verwenden.</div>
              <button type="button" disabled={manualRefreshPending} onClick={() => void refresh(true)} className="mt-2 w-full rounded-lg border border-violet-700 px-3 py-2 text-[10px] font-bold uppercase tracking-[0.13em] text-violet-100 hover:bg-violet-950/40 disabled:opacity-60">{manualRefreshPending ? 'Prüfe Native Backend …' : 'Native Backend erneut prüfen'}</button>
              {manualRefreshMessage ? <div className="mt-2 text-[10px] leading-relaxed text-violet-200/80">{manualRefreshMessage}</div> : null}
            </div>
          ) : (
            <div className="mt-3">
              <button type="button" disabled={installState === 'checking' || installState === 'waiting'} onClick={() => void chooseNative()} className="w-full rounded-xl border border-cyan-500 bg-cyan-950/40 px-3 py-2.5 text-[10px] font-bold uppercase tracking-[0.14em] text-cyan-50 hover:bg-cyan-900/45 disabled:opacity-60">
                {installState === 'waiting' ? 'Warte auf Native Audio …' : installState === 'checking' ? 'Prüfe Native Audio …' : 'Native Audio aktivieren'}
              </button>
              {installState === 'waiting' ? <div className="mt-3 rounded-xl border border-cyan-800/70 bg-cyan-950/20 p-3 text-[10px] leading-relaxed text-cyan-50"><div className="font-semibold text-cyan-100">Installer öffnen und „Installieren“ bestätigen.</div><div className="mt-1">Diese HTML bleibt offen und erkennt den Host automatisch. Es wird nichts entpackt und kein Terminal benötigt.</div></div> : null}
              {installState === 'failed' ? <div className="mt-2 text-[10px] text-rose-300">Der eingebettete Installer konnte nicht bereitgestellt werden.</div> : null}
            </div>
          )}
          {nativeActive && nativeProof?.verified ? (
            <div className="mt-3 rounded-xl border border-emerald-600/70 bg-emerald-950/20 p-2.5">
              <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-emerald-200">Native Audio bewiesen</div>
              <div className="mt-1 text-[10px] leading-relaxed text-emerald-100/75">RFL-Material wurde nativ publiziert, Fenster wurden angenommen und nichtstilles Audio wurde im Native-Callback erzeugt. Der eingebettete Einmal-Installer kann jetzt aus einer Nachfolge-HTML entfernt werden.</div>
              <button type="button" disabled={slimState === 'saving'} onClick={() => void saveSlim()} className="mt-2 w-full rounded-lg border border-emerald-400 bg-emerald-500/15 px-3 py-2 text-[10px] font-bold uppercase tracking-[0.13em] text-emerald-50 hover:bg-emerald-500/25 disabled:opacity-60">
                {slimState === 'saving' ? 'KOMPAKTE HTML WIRD ERZEUGT …' : 'KOMPAKTE NATIVE-HTML SPEICHERN'}
              </button>
              {slimState === 'saved' ? <div className="mt-2 text-[10px] text-emerald-200">Kompakte HTML erzeugt{slimBytes > 0 ? ` · ${(slimBytes / 1024 / 1024).toFixed(2)} MiB` : ''}. Wenn der Browser einen Speicherdialog gezeigt hat, kann dieselbe Datei überschrieben werden; dadurch bleibt auch der Dateipfad unverändert.</div> : null}
              {slimState === 'failed' ? <div className="mt-2 text-[10px] text-rose-300">Kompakte HTML konnte nicht gespeichert werden. Die aktuelle Bootstrap-HTML bleibt unverändert nutzbar.</div> : null}
            </div>
          ) : nativeActive ? (
            <div className="mt-3 rounded-xl border border-emerald-900/70 bg-emerald-950/10 p-2.5 text-[10px] leading-relaxed text-emerald-100/60">Native Backend verbunden. Die Slim-Grenze wird erst freigeschaltet, nachdem RFL-Material tatsächlich nativ hörbares PCM erzeugt hat.</div>
          ) : null}
          {nativeActive ? (
            <div className="mt-3 rounded-xl border border-amber-500/80 bg-amber-950/30 p-2.5">
              <div className="mb-2 text-[10px] leading-relaxed text-amber-100/80">Beendet genau diese Native-Testsession. Der Hintergrunddienst verpackt danach genau diesen Lauf einmalig als Diagnose-ZIP in Downloads und startet anschließend wieder stumm.</div>
              <button type="button" disabled={diagnosticState === 'ending'} onClick={() => void finishDiagnostic()} className="w-full rounded-lg border-2 border-amber-400 bg-amber-500/20 px-3 py-2.5 text-[10px] font-extrabold uppercase tracking-[0.13em] text-amber-50 shadow-[0_0_18px_rgba(251,191,36,0.18)] hover:bg-amber-500/30 disabled:opacity-60">
                {diagnosticState === 'ending' ? 'SESSION WIRD BEENDET · ZIP WIRD GESPEICHERT …' : 'TEST BEENDEN · DIAGNOSE-ZIP SPEICHERN'}
              </button>
            </div>
          ) : null}
          {diagnosticState === 'queued' ? (
            <div className="mt-3 rounded-xl border border-emerald-700/70 bg-emerald-950/25 p-2.5 text-[10px] leading-relaxed text-emerald-100">Native-Testsession beendet. Das Result-ZIP wird in Downloads geschrieben; der AudioRtHost startet danach wieder stumm und wartet auf die nächste Native-Verbindung.</div>
          ) : null}
          {diagnosticState === 'failed' ? (
            <div className="mt-3 rounded-xl border border-rose-700/70 bg-rose-950/25 p-2.5 text-[10px] leading-relaxed text-rose-100">Diagnose-Abschluss konnte den Host nicht bestätigen. Der laufende Native-Status bleibt erhalten; bitte nicht erneut installieren.</div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
