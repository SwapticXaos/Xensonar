import type { QuantizeGrid } from '../domain/instrumentData';
import { PARTICLE_QUANTIZE_GRID_OPTIONS, isDefaultParticleQuantizeGrid, normalizeParticleQuantizeGrid } from './quantizeGridHelpers';
import type { ResonanceControlCorePanelProps } from './resonanceControlCoreTypes';

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

type Props = Pick<ResonanceControlCorePanelProps,
  | 'nParamsUI' | 'updateNParams' | 'onLockCursorToGridChange' | 'onQuantizeToggle'
  | 'onQuantizeBpmChange' | 'quantizeGrid' | 'particleQuantizeReferenceBars'
  | 'quantizeStepMs' | 'gridTempoBpm' | 'onQuantizeGridChange'
  | 'onQuantizeReferenceBarsChange' | 'onGridTempoBpmChange'
>;

export function ResonanceTimingEchoControls({
  nParamsUI, updateNParams, onLockCursorToGridChange, onQuantizeToggle,
  onQuantizeBpmChange, quantizeGrid, particleQuantizeReferenceBars,
  quantizeStepMs, gridTempoBpm, onQuantizeGridChange,
  onQuantizeReferenceBarsChange, onGridTempoBpmChange,
}: Props) {
  return (
    <>
      <div className="flex flex-col gap-3 border border-neutral-800 bg-neutral-900/50 p-4">
        <h3 className="mb-1 border-b border-neutral-800 pb-1 text-[10px] uppercase tracking-widest text-neutral-500">Steuerung &amp; Raum</h3>
        <div>
          <label className="mb-1 block text-xs text-neutral-400">Cursor-Speed (Pfeile): {nParamsUI.cursorSpeed.toFixed(1)}</label>
          <input type="range" min="1" max="14" step="0.5" value={nParamsUI.cursorSpeed} onChange={(e) => updateNParams({ cursorSpeed: parseFloat(e.target.value) })} className="w-full cursor-pointer" />
        </div>
        <label className="mt-2 flex cursor-pointer items-center gap-2 text-sm text-neutral-300"><input type="checkbox" checked={nParamsUI.gridOn} onChange={(e) => updateNParams({ gridOn: e.target.checked })} />Tuning Raster sichtbar</label>
        <label className="flex cursor-pointer items-center gap-2 text-sm text-neutral-300"><input type="checkbox" checked={nParamsUI.lockCursorToGrid} onChange={(e) => onLockCursorToGridChange(e.target.checked)} />Cursor an Raster anpassen</label>
      </div>
      <div className="flex flex-col gap-3 border border-neutral-800 bg-neutral-900/50 p-4">
        <h3 className="mb-1 border-b border-neutral-800 pb-1 text-[10px] uppercase tracking-widest text-neutral-500">Zeit &amp; Echo</h3>
        <label className="flex cursor-pointer items-center gap-2 text-sm text-neutral-300"><input type="checkbox" checked={nParamsUI.quantizeOn} onChange={(e) => onQuantizeToggle(e.target.checked)} />Partikel-Quantisierung</label>
        <div><label className="mb-1 block text-xs text-neutral-400">Partikel-Tempo: {nParamsUI.quantizeBpm} BPM</label><input type="range" min="40" max="240" step="1" value={nParamsUI.quantizeBpm} onChange={(e) => onQuantizeBpmChange(parseInt(e.target.value, 10))} className="w-full cursor-pointer" /></div>
        <div className="grid grid-cols-2 gap-2" data-particle-quantization-in-time-echo="true">
          <div>
            <label className="mb-1 flex items-center justify-between text-xs text-neutral-400"><span>Partikel-Raster</span><span className="text-emerald-300">(Tab)</span></label>
            <select value={isDefaultParticleQuantizeGrid(quantizeGrid) ? String(normalizeParticleQuantizeGrid(quantizeGrid)) : 'other'} onChange={(e) => { if (e.target.value !== 'other') onQuantizeGridChange(parseInt(e.target.value, 10) as QuantizeGrid); }} className="w-full border border-neutral-700 bg-neutral-950 p-1 text-sm text-neutral-300">
              {PARTICLE_QUANTIZE_GRID_OPTIONS.map((option) => <option key={option} value={option}>{option}tel</option>)}<option value="other">other</option>
            </select>
            <input type="number" min={1} max={256} step={1} value={normalizeParticleQuantizeGrid(quantizeGrid)} onChange={(e) => onQuantizeGridChange(normalizeParticleQuantizeGrid(parseInt(e.target.value || '16', 10)))} className="mt-2 w-full border border-neutral-800 bg-neutral-950 p-1 text-xs text-neutral-300" aria-label="Partikel-Raster andere Segmente" />
          </div>
          <div>
            <label className="mb-1 block text-xs text-neutral-400">Partikel-Bezug: {particleQuantizeReferenceBars} Takte</label>
            <input type="number" min={0.125} max={16} step={0.125} value={particleQuantizeReferenceBars} onChange={(e) => onQuantizeReferenceBarsChange(Math.max(0.125, Math.min(16, parseFloat(e.target.value || '1'))))} className="w-full border border-neutral-800 bg-neutral-950 p-1 text-xs text-neutral-300" title="Bezugsdauer: Slots werden über diese Anzahl Takte verteilt" />
            <div className="mt-2 rounded border border-neutral-800 bg-neutral-950/50 px-2 py-1 text-xs text-neutral-500">Step: {quantizeStepMs}ms · Kollisionen wählen die aktiven Slots; ohne Quantisierung darf Bewegungsrhythmik trotzdem geordnet wirken.</div>
          </div>
        </div>
        <div><label className="mb-1 block text-xs text-neutral-400">Grid-Tempo: {gridTempoBpm} BPM ({quantizeStepMs}ms)</label><input type="range" min="40" max="240" step="1" value={gridTempoBpm} onChange={(e) => onGridTempoBpmChange(parseInt(e.target.value, 10))} className="w-full cursor-pointer" /></div>
        <hr className="my-1 border-neutral-800" />
        <label className="flex cursor-pointer items-center gap-2 text-sm text-neutral-300"><input type="checkbox" checked={nParamsUI.echoOn} onChange={(e) => updateNParams({ echoOn: e.target.checked })} />Partikel Echo Aktiv</label>
        <div><label className="mb-1 block text-xs text-neutral-400">Echo Tempo: {nParamsUI.echoTempo}ms</label><input type="range" min="100" max="1000" step="10" value={nParamsUI.echoTempo} onChange={(e) => updateNParams({ echoTempo: parseInt(e.target.value, 10) })} className="w-full cursor-pointer" /></div>
        <div><label className="mb-1 block text-xs text-neutral-400">Echo Decay: {(clamp(nParamsUI.echoDecay ?? 0.6, 0, 0.96) * 100).toFixed(0)}%</label><input type="range" min="0" max="0.96" step="0.01" value={nParamsUI.echoDecay ?? 0.6} onChange={(e) => updateNParams({ echoDecay: parseFloat(e.target.value) })} className="w-full cursor-pointer" /></div>
      </div>
    </>
  );
}
