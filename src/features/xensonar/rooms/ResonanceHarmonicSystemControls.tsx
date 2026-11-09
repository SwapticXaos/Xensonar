import { getModesForSystem, type GridTuning, type ParticleSystem, type ChurchMode } from '../domain/instrumentData';
import type { ResonanceControlCorePanelProps } from './resonanceControlCoreTypes';

const GRID_BASE_MIN = 400;
const GRID_BASE_MAX = 1760;
const GRID_BASE_STEP = 0.1;
const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

type Props = Pick<ResonanceControlCorePanelProps,
  | 'nParamsUI'
  | 'updateNParams'
  | 'setParticleSystem'
  | 'setChurchMode'
  | 'changeGridTuning'
  | 'setGridMode'
  | 'onResetGrid'
  | 'residentEnabled'
  | 'residentVolume'
  | 'residentSystem'
  | 'residentMode'
  | 'onToggleResidentEnabled'
  | 'onResidentVolumeChange'
  | 'onResidentSystemChange'
  | 'onResidentModeChange'
  | 'onOpenInstallationRoom'
> & {
  gridBaseInput: string;
  setGridBaseInput: (value: string) => void;
  commitGridBase: (value: string) => void;
  activeGridRack: GridTuning[];
  activeGridTuningOptions: Array<{ value: GridTuning; label: string }>;
  gridTuningLibraryOptions: Array<{ value: GridTuning; label: string }>;
  openGridRack: () => void;
};

export function ResonanceHarmonicSystemControls({
  nParamsUI,
  updateNParams,
  setParticleSystem,
  setChurchMode,
  changeGridTuning,
  setGridMode,
  onResetGrid,
  residentEnabled,
  residentVolume,
  residentSystem,
  residentMode,
  onToggleResidentEnabled,
  onResidentVolumeChange,
  onResidentSystemChange,
  onResidentModeChange,
  onOpenInstallationRoom,
  gridBaseInput,
  setGridBaseInput,
  commitGridBase,
  activeGridRack,
  activeGridTuningOptions,
  gridTuningLibraryOptions,
  openGridRack,
}: Props) {
  return (
    <div className="flex flex-col gap-3 border border-neutral-800 bg-neutral-900/50 p-4">
      <h3 className="mb-1 border-b border-neutral-800 pb-1 text-[10px] uppercase tracking-widest text-neutral-500">Harmonisches System</h3>
      <div>
        <label className="mb-1 block text-xs text-neutral-400">Kammerton / Grundton: {nParamsUI.gridBase.toFixed(1)} Hz</label>
        <div className="flex items-center gap-3">
          <input
            type="range"
            min={GRID_BASE_MIN}
            max={GRID_BASE_MAX}
            step={GRID_BASE_STEP}
            value={nParamsUI.gridBase}
            onChange={(e) => {
              const next = clamp(parseFloat(e.target.value), GRID_BASE_MIN, GRID_BASE_MAX);
              const rounded = Math.round(next * 10) / 10;
              updateNParams({ gridBase: rounded });
              setGridBaseInput(rounded.toFixed(1));
            }}
            className="w-full cursor-pointer"
          />
          <input
            type="number"
            min={GRID_BASE_MIN}
            max={GRID_BASE_MAX}
            step={GRID_BASE_STEP}
            inputMode="decimal"
            value={gridBaseInput}
            onChange={(e) => setGridBaseInput(e.target.value)}
            onBlur={() => commitGridBase(gridBaseInput)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commitGridBase(gridBaseInput);
            }}
            className="w-28 shrink-0 border border-neutral-700 bg-neutral-950 px-2 py-1 text-right text-sm text-neutral-200"
          />
        </div>
        <div className="mt-1 text-[11px] leading-relaxed text-neutral-500">Raster System und Raster Modus beziehen sich auf diesen Kammerton als Grundton und Periodenanker. Die obere Linie des Spielfelds markiert diesen Wert. Bereich: 400.0 bis 1760.0 Hz.</div>
      </div>
      <div>
        <label className="mb-1 flex items-center justify-between text-xs text-neutral-400"><span>Partikel System</span><span className="text-emerald-400">(-_)</span></label>
        <select value={nParamsUI.particleSystem} onChange={(e) => setParticleSystem(e.target.value as ParticleSystem)} className="w-full border border-neutral-700 bg-neutral-950 p-1 text-sm text-neutral-300">
          <option value="ji">Just Intonation</option><option value="12edo">12 EDO</option><option value="bp">Bohlen-Pierce (13-TET)</option>
        </select>
      </div>
      <div>
        <label className="mb-1 flex items-center justify-between text-xs text-neutral-400"><span>Partikel Modus</span><span className="text-emerald-400">(N / M)</span></label>
        <select value={nParamsUI.churchMode} onChange={(e) => setChurchMode(e.target.value as ChurchMode)} className="w-full border border-neutral-700 bg-neutral-950 p-1 text-sm text-neutral-300">
          {getModesForSystem(nParamsUI.particleSystem).map((mode) => <option key={mode.value} value={mode.value}>{mode.label}</option>)}
        </select>
      </div>
      <div>
        <label className="mb-1 flex items-center justify-between text-xs text-neutral-400"><span>Raster System</span><span className="text-emerald-400">(; , / : .)</span></label>
        <select value={nParamsUI.gridTuning} onChange={(e) => changeGridTuning(e.target.value as GridTuning)} className="w-full border border-neutral-700 bg-neutral-950 p-1 text-sm text-neutral-300">
          {activeGridTuningOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
        <div className="mt-2 flex items-center justify-between gap-2 text-[10px] text-neutral-500">
          <span>Aktives Rack: {activeGridRack.length} / 11 Slots</span>
          <button type="button" onClick={openGridRack} className="rounded border border-fuchsia-800/70 px-2 py-1 text-fuchsia-200 hover:bg-fuchsia-950/30">Raster-Werkbank öffnen</button>
        </div>
      </div>
      <div className="mt-2">
        <label className="mb-1 flex items-center justify-between text-xs text-neutral-400"><span>Raster Modus</span><span className="text-emerald-400">(AltGr / Strg)</span></label>
        <select value={nParamsUI.gridMode} onChange={(e) => setGridMode(e.target.value as ChurchMode)} className="w-full border border-neutral-700 bg-neutral-950 p-1 text-sm text-neutral-300">
          {getModesForSystem(nParamsUI.gridTuning).map((mode) => <option key={mode.value} value={mode.value}>{mode.label}</option>)}
        </select>
      </div>
      <div>
        <label className="mb-1 flex items-center justify-between text-xs text-neutral-400"><span>Resident System</span><span className="text-emerald-400">(Mehr Auswahl hier)</span></label>
        <select value={residentSystem} onChange={(e) => onResidentSystemChange(e.target.value as GridTuning)} className="w-full border border-neutral-700 bg-neutral-950 p-1 text-sm text-neutral-300">
          {gridTuningLibraryOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
      </div>
      <div>
        <label className="mb-1 flex items-center justify-between text-xs text-neutral-400"><span>Resident Modus</span><span className="text-emerald-400">(Raum III)</span></label>
        <select value={residentMode} onChange={(e) => onResidentModeChange(e.target.value as ChurchMode)} className="w-full border border-neutral-700 bg-neutral-950 p-1 text-sm text-neutral-300">
          {getModesForSystem(residentSystem).map((mode) => <option key={mode.value} value={mode.value}>{mode.label}</option>)}
        </select>
      </div>
      <label className="flex cursor-pointer items-center gap-2 text-sm text-neutral-300"><input type="checkbox" checked={residentEnabled} onChange={onToggleResidentEnabled} />Residents an / aus</label>
      <div>
        <label className="mb-1 block text-xs text-neutral-400">Resident-Lautstärke: {(residentVolume * 100).toFixed(0)}%</label>
        <input type="range" min="0" max="1" step="0.01" value={residentVolume} onChange={(e) => onResidentVolumeChange(parseFloat(e.target.value))} className="w-full cursor-pointer" />
      </div>
      <button type="button" onClick={onOpenInstallationRoom} className="text-left text-xs text-cyan-300 underline underline-offset-4 hover:text-cyan-200">Mehr Auswahl hier</button>
      <div className="mt-auto flex items-center gap-2 pt-2">
        <label className="flex cursor-pointer items-center gap-2 text-xs text-neutral-300"><input type="checkbox" checked={nParamsUI.rememberGrid} onChange={(e) => updateNParams({ rememberGrid: e.target.checked })} />Raster merken</label>
        <button onClick={onResetGrid} className="ml-auto border border-neutral-700 bg-neutral-900 px-2 py-0.5 text-xs text-neutral-400 hover:bg-neutral-800">Raster Reset</button>
      </div>
    </div>
  );
}
