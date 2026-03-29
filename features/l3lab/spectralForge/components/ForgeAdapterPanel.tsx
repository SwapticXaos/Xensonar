import { useMemo, useState } from 'react';
import { useStore, DURATION, computeLoopDurationSec } from '../state/store';
import { useForgeMaterialAdapters, getForgeMaterialAdapter, buildForgeExportContext, createExampleExternalPackageFromContext, LEGACY_SPECTRAL_FORGE_PRODUCER } from '../../forgeBridge';
import { audioEngine } from '../audio/AudioEngine';
import { registerExternalMaterialPackage } from '../../materialLibrary';

export default function ForgeAdapterPanel() {
  const adapters = useForgeMaterialAdapters();
  const materialExport = useStore((s) => s.materialExport);
  const updateMaterialExport = useStore((s) => s.updateMaterialExport);
  const spectralData = useStore((s) => s.spectralData);
  const synthMode = useStore((s) => s.synthMode);
  const waveformMix = useStore((s) => s.waveformMix);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');

  const selectedAdapter = useMemo(() => getForgeMaterialAdapter(materialExport.adapterId ?? 'canonical-forge-bridge'), [materialExport.adapterId, adapters]);

  const exportMeta = useMemo(() => ({
    name: materialExport.name,
    role: materialExport.role,
    bpm: materialExport.bpm,
    bars: materialExport.bars,
    guideSegments: materialExport.guideSegments,
    guideMarkers: materialExport.guideMarkers,
    loopStartSec: 0,
    loopEndSec: DURATION,
    rootHz: null,
    sourceVersion: LEGACY_SPECTRAL_FORGE_PRODUCER.version,
    renderMode: synthMode,
    durationSec: DURATION,
    intendedLoopDurationSec: computeLoopDurationSec(materialExport.bars, materialExport.bpm),
  }), [materialExport, synthMode]);

  const handleProbe = async () => {
    setBusy(true);
    setStatus('Rendere Probe für externes Adapterpaket ...');
    try {
      const blob = await audioEngine.exportWAV(spectralData, synthMode, waveformMix);
      const context = buildForgeExportContext(exportMeta, blob, LEGACY_SPECTRAL_FORGE_PRODUCER);
      const pkg = createExampleExternalPackageFromContext(context);
      registerExternalMaterialPackage(pkg);
      setStatus('Externes Beispielpaket erfolgreich durch die Materialschicht registriert');
      window.setTimeout(() => setStatus(''), 2200);
    } catch (error) {
      console.error('[xensonar][forge-adapter-probe]', error);
      setStatus('Adapter-Probe fehlgeschlagen');
      window.setTimeout(() => setStatus(''), 2500);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-2 border border-neutral-800 bg-neutral-950/60 p-3">
      <div>
        <div className="mb-1 uppercase tracking-[0.2em] text-neutral-500">Adapter-Schicht</div>
        <p>Legacy Forge und künftige alternative Schmieden sollen nicht direkt an Room V kleben, sondern erst über eine gemeinsame Materialbrücke gehen.</p>
      </div>
      <label className="space-y-1 text-xs text-neutral-400">
        <span className="block uppercase tracking-[0.2em] text-neutral-500">Export-Adapter</span>
        <select
          value={materialExport.adapterId}
          onChange={(e) => updateMaterialExport({ adapterId: e.target.value })}
          className="w-full border border-neutral-700 bg-neutral-900 px-2 py-1 text-neutral-100"
        >
          {adapters.map((adapter) => (
            <option key={adapter.adapterId} value={adapter.adapterId}>{adapter.adapterName}</option>
          ))}
        </select>
      </label>
      <div className="rounded border border-neutral-800 bg-neutral-900/70 p-2 text-[11px] leading-relaxed text-neutral-400">
        <div className="font-medium text-neutral-200">{selectedAdapter.adapterName}</div>
        <div>{selectedAdapter.description}</div>
        <div className="mt-1 text-neutral-500">Rollen: {selectedAdapter.supportedRoles.join(', ')}</div>
      </div>
      <button
        type="button"
        onClick={handleProbe}
        disabled={busy}
        className="w-full border border-neutral-700 px-3 py-2 text-left text-neutral-300 hover:bg-neutral-900 disabled:opacity-60"
      >
        {busy ? 'Probe läuft ...' : 'Probe: externes Beispielpaket registrieren'}
      </button>
      {status ? <div className="text-[11px] text-cyan-300">{status}</div> : null}
    </div>
  );
}
