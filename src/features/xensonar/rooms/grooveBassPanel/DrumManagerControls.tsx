import { DRUM_LANE_LABELS, sanitizeDrumKit, withDrumLaneKitOverride } from '../../groove/drumKitRouting';
import type { DrumKit } from '../../domain/instrumentData';
import type { DrumLaneKitOverrides, GrooveBassPanelNParams, UpdateResonanceNParams } from '../resonancePanelTypedContracts';

type DrumManagerControlsProps = {
  nParamsUI: Pick<GrooveBassPanelNParams, 'drumActive' | 'drumAir' | 'drumEdge' | 'drumKit' | 'drumSnap' | 'drumSoftness' | 'grooveSwing'>;
  updateNParams: UpdateResonanceNParams;
  drumKits: Array<{ value: DrumKit; label: string }>;
  drumLaneKitOverrides: DrumLaneKitOverrides;
};

export function DrumManagerControls({ nParamsUI, updateNParams, drumKits, drumLaneKitOverrides }: DrumManagerControlsProps) {
  return (
    <div className="rounded border border-neutral-800 bg-neutral-950/60 p-3 space-y-3 text-neutral-300">
      <div>
        <div className="text-[10px] uppercase tracking-[0.25em] text-fuchsia-200/70">Drum Klang und Feinschliff</div>
        <div className="mt-1 text-[10px] leading-relaxed text-neutral-500">Live-Palette: gilt für Presets und exportierte Drum-Machine-Patterns. Spur-Sounds überschreiben das Grundkit.</div>
      </div>
      <label className="flex items-center gap-2 cursor-pointer text-sm font-semibold"><input type="checkbox" checked={nParamsUI.drumActive} onChange={(event) => updateNParams({ drumActive: event.target.checked })} />Drums Aktiv</label>
      <label className="block">
        <span className="mb-1 block text-xs text-neutral-400">Drum Grundkit</span>
        <select value={nParamsUI.drumKit ?? 'dusty_tape'} onChange={(event) => updateNParams({ drumKit: sanitizeDrumKit(event.target.value) })} className="w-full bg-neutral-950 border border-neutral-700 p-1 text-sm text-neutral-300">{drumKits.map((entry) => <option key={entry.value} value={entry.value}>{entry.label}</option>)}</select>
      </label>
      <div className="rounded border border-neutral-800 bg-neutral-950/40 p-2">
        <div className="mb-2 text-[10px] uppercase tracking-widest text-neutral-500">Spur-Sounds einzeln</div>
        <div className="grid grid-cols-1 gap-2">
          {(Object.entries(DRUM_LANE_LABELS) as Array<[keyof typeof DRUM_LANE_LABELS, string]>).map(([laneId, laneLabel]) => (
            <label key={laneId} className="grid grid-cols-[88px_1fr] items-center gap-2 text-xs text-neutral-300">
              <span>{laneLabel}</span>
              <select
                value={drumLaneKitOverrides[laneId] ?? ''}
                onChange={(event) => updateNParams({ drumLaneKits: withDrumLaneKitOverride(drumLaneKitOverrides, laneId, event.target.value) })}
                className="w-full bg-neutral-950 border border-neutral-700 p-1 text-xs text-neutral-300"
              >
                <option value="">wie Grundkit</option>
                {drumKits.map((entry) => <option key={`${laneId}-${entry.value}`} value={entry.value}>{entry.label}</option>)}
              </select>
            </label>
          ))}
        </div>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <label className="block"><span className="mb-1 block text-xs text-neutral-400">Edge: {nParamsUI.drumEdge.toFixed(2)}</span><input type="range" min="0" max="1" step="0.01" value={nParamsUI.drumEdge} onChange={(event) => updateNParams({ drumEdge: parseFloat(event.target.value) })} className="w-full cursor-pointer accent-fuchsia-500" /></label>
        <label className="block"><span className="mb-1 block text-xs text-neutral-400">Softness: {nParamsUI.drumSoftness.toFixed(2)}</span><input type="range" min="0" max="1" step="0.01" value={nParamsUI.drumSoftness} onChange={(event) => updateNParams({ drumSoftness: parseFloat(event.target.value) })} className="w-full cursor-pointer accent-fuchsia-500" /></label>
        <label className="block"><span className="mb-1 block text-xs text-neutral-400">Air: {nParamsUI.drumAir.toFixed(2)}</span><input type="range" min="0" max="1" step="0.01" value={nParamsUI.drumAir} onChange={(event) => updateNParams({ drumAir: parseFloat(event.target.value) })} className="w-full cursor-pointer accent-fuchsia-500" /></label>
        <label className="block"><span className="mb-1 block text-xs text-neutral-400">Snap: {nParamsUI.drumSnap.toFixed(2)}</span><input type="range" min="0" max="1" step="0.01" value={nParamsUI.drumSnap} onChange={(event) => updateNParams({ drumSnap: parseFloat(event.target.value) })} className="w-full cursor-pointer accent-fuchsia-500" /></label>
        <label className="block md:col-span-2"><span className="mb-1 block text-xs text-neutral-400">Groove Swing: {nParamsUI.grooveSwing.toFixed(2)}</span><input type="range" min="0" max="1" step="0.01" value={nParamsUI.grooveSwing} onChange={(event) => updateNParams({ grooveSwing: parseFloat(event.target.value) })} className="w-full cursor-pointer accent-fuchsia-500" /></label>
      </div>
    </div>

  );
}
