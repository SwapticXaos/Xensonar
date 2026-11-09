import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { acceptExternalLoopOffer } from '../../l3lab/external/externalLoopHost';
import { sanitizeExternalBars } from '../../l3lab/external/externalLoopContract';
import { EmbeddedMicrotoPlatformerDock } from './EmbeddedMicrotoPlatformerDock';
import { queueMicrotoMelodicLoopSeedHandoff } from '../../l3lab/canonicalForge/microtoMelodicLoopHandoff';
import { queueForgeAudioHandoff } from '../../l3lab/forgeAudioHandoff';
import type { MicrotoMelodicLoopSeedExport, MicrotoXensonarLoopExport } from '../../../external/microto/integrations/xensonar/types';
import { EXTERNAL_DOCK_VIEW_KEY, readExternalDockView, writeExternalDockView, type ExternalDockView } from './xenpolarShortcut';


function createProbeLoopWav(durationSec: number, sampleRate = 44100) {
  const frameCount = Math.max(1, Math.floor(durationSec * sampleRate));
  const channelCount = 1;
  const bytesPerSample = 2;
  const blockAlign = channelCount * bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const dataSize = frameCount * blockAlign;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);
  let offset = 0;
  const writeAscii = (text: string) => {
    for (let i = 0; i < text.length; i += 1) {
      view.setUint8(offset, text.charCodeAt(i));
      offset += 1;
    }
  };
  writeAscii('RIFF');
  view.setUint32(offset, 36 + dataSize, true); offset += 4;
  writeAscii('WAVE');
  writeAscii('fmt ');
  view.setUint32(offset, 16, true); offset += 4;
  view.setUint16(offset, 1, true); offset += 2;
  view.setUint16(offset, channelCount, true); offset += 2;
  view.setUint32(offset, sampleRate, true); offset += 4;
  view.setUint32(offset, byteRate, true); offset += 4;
  view.setUint16(offset, blockAlign, true); offset += 2;
  view.setUint16(offset, bytesPerSample * 8, true); offset += 2;
  writeAscii('data');
  view.setUint32(offset, dataSize, true); offset += 4;

  for (let i = 0; i < frameCount; i += 1) {
    const t = i / sampleRate;
    const env = Math.min(1, t / 0.02) * Math.min(1, (durationSec - t) / 0.05);
    const pulse = Math.sin(2 * Math.PI * 220 * t) * 0.16;
    const overtone = Math.sin(2 * Math.PI * 440 * t) * 0.08;
    const click = ((i % Math.max(1, Math.floor(sampleRate / 2))) < 120 ? 0.18 : 0);
    const sample = Math.max(-1, Math.min(1, (pulse + overtone + click) * env));
    view.setInt16(offset, Math.round(sample * 32767), true);
    offset += 2;
  }

  return new Blob([buffer], { type: 'audio/wav' });
}

async function readAudioDurationSec(file: Blob) {
  const arrayBuffer = await file.arrayBuffer();
  const AudioContextCtor = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextCtor) throw new Error('AudioContext nicht verfügbar');
  const audioContext = new AudioContextCtor();
  try {
    const decoded = await audioContext.decodeAudioData(arrayBuffer.slice(0));
    return decoded.duration;
  } finally {
    void audioContext.close().catch(() => undefined);
  }
}

export function ExternalDeviceSlot({
  onOpenCanonicalMelodicLoop,
  onOpenLegacyForge,
  onOpenCanonicalForge,
}: {
  onOpenCanonicalMelodicLoop?: () => void;
  onOpenLegacyForge?: () => void;
  onOpenCanonicalForge?: () => void;
}) {
  const [view, setView] = useState<ExternalDockView>(() => readExternalDockView());
  const [bars, setBars] = useState(4);
  const [name, setName] = useState('Probe Loop');
  const [status, setStatus] = useState('Noch kein externer Loop importiert.');
  const [busy, setBusy] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(EXTERNAL_DOCK_VIEW_KEY, view);
    }
  }, [view]);

  const handleProbeImport = async () => {
    setBusy(true);
    try {
      const targetBars = Math.min(16, sanitizeExternalBars(bars));
      const durationSec = Math.max(0.4, targetBars * 0.75);
      const blob = createProbeLoopWav(durationSec);
      const entry = acceptExternalLoopOffer({
        name: (name || 'Probe Loop').trim() || 'Probe Loop',
        blob,
        bars: targetBars,
        durationSec,
        sourceDevice: 'ExternalSlotProbe',
        sourceVersion: 'phase-c',
        renderMode: 'probe-loop',
        notes: 'Debug-Probe aus dem Adapter Dock',
        workspaceOrigin: 'external',
      });
      setStatus(`Probe importiert: ${entry.name} · ${entry.bars} Bars · Material-ID ${entry.id}`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Probe-Import fehlgeschlagen');
    } finally {
      setBusy(false);
    }
  };

  const handleMicrotoExport = async (payload: MicrotoXensonarLoopExport) => {
    setBusy(true);
    try {
      const entry = acceptExternalLoopOffer({
        name: payload.name,
        blob: payload.blob,
        bars: Math.min(16, sanitizeExternalBars(payload.bars)),
        durationSec: payload.durationSec,
        rootHz: payload.rootHz ?? null,
        sourceDevice: payload.sourceDevice,
        sourceVersion: payload.sourceVersion,
        renderMode: payload.renderMode,
        notes: payload.notes ?? 'MicrotoSynFlow Dock Export',
        workspaceOrigin: 'external',
      });
      setStatus(`Microto importiert: ${entry.name} · ${entry.bars} Bars · ${payload.durationSec.toFixed(2)} s · Material-ID ${entry.id}`);
      setView('host');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Microto-Import fehlgeschlagen');
    } finally {
      setBusy(false);
    }
  };

  const handleMicrotoMelodicLoopExport = async (payload: MicrotoMelodicLoopSeedExport) => {
    setBusy(true);
    try {
      queueMicrotoMelodicLoopSeedHandoff(payload);
      setStatus(`Microto-Seed bereit: ${payload.name} · ${payload.bars} Host-Bars · ${payload.movementEvents.length} Events → Melodic Loop`);
      writeExternalDockView('host');
      setView('host');
      onOpenCanonicalMelodicLoop?.();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Melodic-Loop-Handoff fehlgeschlagen');
    } finally {
      setBusy(false);
    }
  };

  const handleMicrotoForge1Export = async (payload: MicrotoXensonarLoopExport) => {
    setBusy(true);
    try {
      queueForgeAudioHandoff({
        target: 'legacy',
        name: payload.name,
        fileName: `${payload.name.trim().toLowerCase().replace(/[^a-z0-9-_]+/g, '-') || 'microto-loop'}.wav`,
        blob: payload.blob,
        bars: Math.min(16, sanitizeExternalBars(payload.bars)),
        bpm: 108,
        role: 'loop',
        origin: 'microto',
      });
      setStatus(`Microto bereit für SpectralForge: ${payload.name} · ${payload.bars} Host-Bars · ${payload.durationSec.toFixed(2)} s`);
      writeExternalDockView('host');
      setView('host');
      onOpenLegacyForge?.();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'SpectralForge-Handoff fehlgeschlagen');
    } finally {
      setBusy(false);
    }
  };

  const handleMicrotoForge2Export = async (payload: MicrotoXensonarLoopExport) => {
    setBusy(true);
    try {
      queueForgeAudioHandoff({
        target: 'canonical',
        name: payload.name,
        fileName: `${payload.name.trim().toLowerCase().replace(/[^a-z0-9-_]+/g, '-') || 'microto-loop'}.wav`,
        blob: payload.blob,
        bars: Math.min(16, sanitizeExternalBars(payload.bars)),
        bpm: 108,
        role: 'loop',
        origin: 'microto',
      });
      setStatus(`Microto bereit für SyntheticForge: ${payload.name} · ${payload.bars} Host-Bars · ${payload.durationSec.toFixed(2)} s`);
      writeExternalDockView('host');
      setView('host');
      onOpenCanonicalForge?.();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'SyntheticForge-Handoff fehlgeschlagen');
    } finally {
      setBusy(false);
    }
  };

  const handleFileImport = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setBusy(true);
    try {
      const durationSec = await readAudioDurationSec(file);
      const targetBars = Math.min(16, sanitizeExternalBars(bars));
      const inferredName = file.name.replace(/\.[^.]+$/, '') || 'External Loop';
      const entry = acceptExternalLoopOffer({
        name: name.trim() || inferredName,
        blob: file,
        bars: targetBars,
        durationSec,
        sourceDevice: 'ExternalFileImport',
        sourceVersion: 'phase-c',
        renderMode: 'file-import',
        notes: `Importiert aus ${file.name}`,
        workspaceOrigin: 'external',
      });
      setStatus(`Datei importiert: ${entry.name} · ${entry.bars} Bars · ${durationSec.toFixed(2)} s · Material-ID ${entry.id}`);
      event.currentTarget.value = '';
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Datei-Import fehlgeschlagen');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4 border border-neutral-800 bg-neutral-950/70 p-4 text-sm text-neutral-300">
      <div className="space-y-2">
        <div className="text-xs uppercase tracking-[0.25em] text-sky-300">III.2c Fremdgerät-Slot</div>
        <div className="text-lg font-semibold text-neutral-100">External Loop Host · Phase C</div>
        <p className="max-w-3xl text-sm leading-relaxed text-neutral-400">
          Das Dock kann jetzt zweierlei: schlichte externe WAV-Loops hosten und den ersten exportfähigen
          MicrotoSynFlow-Korridor einbetten. Für diesen Schritt zählt der echte Durchstich: hinein in den
          Fremdraum, dort Audio erzeugen, und denselben Körper direkt zurück in Xensonars Materialspur schicken.
          IV Spiele bündelt Familie und Arcade; Xenpolar 3 bleibt hier der direkte Jump-Run-Exportpfad.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2 border border-neutral-800 bg-neutral-900/50 p-2 text-xs text-neutral-400">
        <span className="uppercase tracking-[0.2em] text-neutral-500">Dock-Ansichten</span>
        <button
          type="button"
          onClick={() => {
            writeExternalDockView('host');
            setView('host');
          }}
          className={`border px-3 py-1.5 ${view === 'host' ? 'border-sky-500 bg-sky-950/40 text-sky-200' : 'border-neutral-700 text-neutral-300 hover:bg-neutral-900'}`}
        >
          Host Import
        </button>
        <button
          type="button"
          onClick={() => {
            writeExternalDockView('microto');
            setView('microto');
          }}
          className={`min-w-[280px] rounded-xl border px-4 py-3 text-left transition ${view === 'microto' ? 'border-cyan-400 bg-cyan-500/15 text-cyan-100 shadow-[0_0_0_1px_rgba(34,211,238,0.15)]' : 'border-cyan-800/80 bg-cyan-950/25 text-cyan-100 hover:bg-cyan-950/40'}`}
        >
          <div className="text-[10px] uppercase tracking-[0.32em] text-cyan-300/80">Jump-Run Andockkorridor</div>
          <div className="mt-1 text-base font-semibold">(( IV Spiele · Xenpolar 3 ))</div>
        </button>
        <span className="text-neutral-500">{view === 'host' ? 'Direkter Loop-Eingang in Xensonar.' : 'IV Spiele · Xenpolar 3 als eingebetteter Jump-Run-Exportpfad.'}</span>
      </div>

      {view === 'microto' ? (
        <EmbeddedMicrotoPlatformerDock
          onBackToHost={() => setView('host')}
          onExportLoopToXensonar={handleMicrotoExport}
          onExportLoopToForge1={handleMicrotoForge1Export}
          onExportLoopToForge2={handleMicrotoForge2Export}
          onExportSeedToMelodicLoop={handleMicrotoMelodicLoopExport}
        />
      ) : (
        <>
          <div className="grid gap-3 lg:grid-cols-[1.2fr,1fr]">
            <div className="space-y-3 rounded border border-neutral-800 bg-neutral-900/60 p-3">
              <div className="text-xs uppercase tracking-[0.2em] text-neutral-500">Host-Mapping</div>
              <label className="block space-y-1">
                <span className="text-xs text-neutral-400">Name im Materialregal</span>
                <input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  className="w-full border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm text-neutral-100 outline-none focus:border-sky-500"
                  placeholder="External Loop"
                />
              </label>
              <label className="block space-y-1">
                <span className="text-xs text-neutral-400">Auf wie viele Xensonar-Bars soll der Körper gelegt werden?</span>
                <input
                  type="number"
                  min={1}
                  max={16}
                  step={1}
                  value={bars}
                  onChange={(event) => setBars(Math.min(16, sanitizeExternalBars(Number(event.target.value))))}
                  className="w-28 border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm text-neutral-100 outline-none focus:border-sky-500"
                />
              </label>
              <div className="rounded border border-sky-900/50 bg-sky-950/20 p-3 text-xs leading-relaxed text-sky-100/90">
                Xensonar übernimmt später selbst das Tempo. Der Importeur deklariert hier nur die Zielspannweite im Host-Taktcontainer.
              </div>
            </div>

            <div className="space-y-3 rounded border border-neutral-800 bg-neutral-900/60 p-3">
              <div className="text-xs uppercase tracking-[0.2em] text-neutral-500">Host-Checks</div>
              <button
                type="button"
                disabled={busy}
                onClick={handleProbeImport}
                className="w-full border border-sky-700 px-3 py-2 text-left text-sm text-sky-100 hover:bg-sky-950/30 disabled:cursor-wait disabled:opacity-60"
              >
                {busy ? 'Import läuft …' : 'Probe-Loop erzeugen und ins Materialregal schicken'}
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => fileInputRef.current?.click()}
                className="w-full border border-neutral-700 px-3 py-2 text-left text-sm text-neutral-200 hover:bg-neutral-800 disabled:cursor-wait disabled:opacity-60"
              >
                WAV-Datei wählen und importieren
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".wav,audio/wav,audio/x-wav"
                className="hidden"
                onChange={handleFileImport}
              />
              <button
                type="button"
                onClick={() => {
                  writeExternalDockView('microto');
                  setView('microto');
                }}
                className="w-full border border-cyan-700 px-3 py-2 text-left text-sm text-cyan-100 hover:bg-cyan-950/30"
              >
                In MicrotoSynFlow wechseln und dort einen Loop bauen
              </button>
              <div className="rounded border border-neutral-800 bg-neutral-950/70 p-3 text-xs leading-relaxed text-neutral-400">
                Nach erfolgreichem Import sollte der Loop im Materialregal auftauchen und über das registrierte Material-Event direkt in Xensonars Loop-Auswahl gezogen werden.
              </div>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded border border-neutral-800 bg-neutral-900/60 p-3 text-xs leading-relaxed text-neutral-400">
              <div className="mb-2 font-medium text-neutral-200">1. Quelle</div>
              Externes Tool liefert nur Audio plus Bars. Noch kein Spezialwissen über die innere App-Architektur.
            </div>
            <div className="rounded border border-neutral-800 bg-neutral-900/60 p-3 text-xs leading-relaxed text-neutral-400">
              <div className="mb-2 font-medium text-neutral-200">2. Host</div>
              Das Dock mappt dieses Minimalangebot deterministisch auf <span className="text-cyan-300">XensonarMaterialPackageV1</span>.
            </div>
            <div className="rounded border border-neutral-800 bg-neutral-900/60 p-3 text-xs leading-relaxed text-neutral-400">
              <div className="mb-2 font-medium text-neutral-200">3. Durchstich</div>
              MicrotoSynFlow hängt jetzt nicht nur als Idee daneben, sondern mit einem ersten echten Korridor: Loop bauen, Send to Xensonar drücken, Material im Regal sehen.
            </div>
          </div>
        </>
      )}

      <div className="rounded border border-emerald-900/40 bg-emerald-950/20 p-3 text-xs text-emerald-100/90">
        <div className="mb-1 uppercase tracking-[0.2em] text-emerald-300">Status</div>
        {status}
      </div>
    </div>
  );
}
