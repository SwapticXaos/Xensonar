import { requestOpenMelodicLoopGridWorkbench } from "../../xensonar/domain/gridWorkbenchBridge";
import { requestMaterialImportDialog } from "./materialImportChannel";
type LogicModeCardsProps = {
  logicView: 'drums' | 'melodic';
  currentDrumPatternLabel: string;
  currentDrumKitLabel: string;
  currentMelodicPresetLabel: string;
  onSelectLogicView: (view: 'drums' | 'melodic') => void;
};

export function LogicModeCards({
  logicView,
  currentDrumPatternLabel,
  currentDrumKitLabel,
  currentMelodicPresetLabel: _currentMelodicPresetLabel,
  onSelectLogicView,
}: LogicModeCardsProps) {
  return (
    <div className="flex flex-wrap gap-3">
      <button
        type="button"
        onClick={() => onSelectLogicView('drums')}
        className={`min-w-[15rem] rounded-xl border px-5 py-3 text-left ${logicView === 'drums' ? 'border-cyan-500 bg-cyan-950/35 text-cyan-100 shadow-[0_0_0_1px_rgba(34,211,238,0.12)]' : 'border-neutral-700 bg-neutral-900 text-neutral-200 hover:bg-neutral-800'}`}
      >
        <div className="text-sm font-semibold">Drum Machine</div>
        <div className={`mt-1 text-[11px] leading-relaxed ${logicView === 'drums' ? 'text-cyan-200/90' : 'text-neutral-500'}`}>
          {currentDrumPatternLabel} · {currentDrumKitLabel}
        </div>
      </button>
      <button
        type="button"
        onClick={() => onSelectLogicView('melodic')}
        className={`min-w-[15rem] rounded-xl border px-5 py-3 text-left ${logicView === 'melodic' ? 'border-violet-500 bg-violet-950/35 text-violet-100 shadow-[0_0_0_1px_rgba(139,92,246,0.12)]' : 'border-neutral-700 bg-neutral-900 text-neutral-200 hover:bg-neutral-800'}`}
      >
        <div className="text-sm font-semibold">Melodic Loop</div>
        <div className={`mt-1 text-[11px] leading-relaxed ${logicView === 'melodic' ? 'text-violet-200/90' : 'text-neutral-500'}`}>
          4 Instrumente · 3 Muster
        </div>
      </button>
    </div>
  );
}

type MaterialQuickAccessPanelProps = {
  materialName: string;
  materialRole: 'loop' | 'waveMaterial' | 'particleExciter' | 'droneTexture';
  materialBpm: number;
  materialBars: number;
  rootFollowPreferred: boolean;
  busy: boolean;
  canUndo: boolean;
  canRedo: boolean;
  hasRawSourceAsset: boolean;
  onMaterialNameChange: (value: string) => void;
  onMaterialRoleChange: (value: 'loop' | 'waveMaterial' | 'particleExciter' | 'droneTexture') => void;
  onMaterialBpmChange: (value: number) => void;
  onMaterialBarsChange: (value: number) => void;
  onRootFollowPreferredChange: (value: boolean) => void;
  onUndo: () => void;
  onRedo: () => void;
  onStartMaterialGroovePreview: () => void;
  onSendMelodicLoopToXensonar: () => void;
  onSendToSpectralForge: () => void;
  onSendDirectSourceToXensonar: () => void;
};

export function MaterialQuickAccessPanel({
  materialName,
  materialRole,
  materialBpm,
  materialBars,
  rootFollowPreferred,
  busy,
  canUndo,
  canRedo,
  hasRawSourceAsset,
  onMaterialNameChange,
  onMaterialRoleChange,
  onMaterialBpmChange,
  onMaterialBarsChange,
  onRootFollowPreferredChange,
  onUndo,
  onRedo,
  onStartMaterialGroovePreview,
  onSendMelodicLoopToXensonar,
  onSendToSpectralForge,
  onSendDirectSourceToXensonar,
}: MaterialQuickAccessPanelProps) {
  return (
    <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_20rem]">
      <div className="rounded border border-neutral-800 bg-neutral-950/50 p-3">
        <div className="grid gap-3 md:grid-cols-5">
          <label className="space-y-1 text-xs text-neutral-400 md:col-span-2">
            <span className="uppercase tracking-[0.18em] text-neutral-500">Materialname</span>
            <input value={materialName} onChange={(e) => onMaterialNameChange(e.target.value)} className="w-full border border-neutral-700 bg-neutral-900 px-2 py-2 text-neutral-100" />
          </label>
          <label className="space-y-1 text-xs text-neutral-400">
            <span className="uppercase tracking-[0.18em] text-neutral-500">Rolle</span>
            <select value={materialRole} onChange={(e) => onMaterialRoleChange(e.target.value as 'loop' | 'waveMaterial' | 'particleExciter' | 'droneTexture')} className="w-full border border-neutral-700 bg-neutral-900 px-2 py-2 text-neutral-100">
              <option value="loop">Loop</option>
              <option value="waveMaterial">Wellenstarter</option>
              <option value="particleExciter">Partikel</option>
              <option value="droneTexture">Drone</option>
            </select>
          </label>
          <label className="space-y-1 text-xs text-neutral-400">
            <span className="uppercase tracking-[0.18em] text-neutral-500">BPM</span>
            <input type="number" value={materialBpm} min={40} max={320} onChange={(e) => onMaterialBpmChange(Number(e.target.value) || 108)} className="w-full border border-neutral-700 bg-neutral-900 px-2 py-2 text-neutral-100" />
          </label>
          <label className="space-y-1 text-xs text-neutral-400">
            <span className="uppercase tracking-[0.18em] text-neutral-500">Takte</span>
            <input type="number" value={materialBars} min={1} max={16} onChange={(e) => onMaterialBarsChange(Number(e.target.value) || 4)} className="w-full border border-neutral-700 bg-neutral-900 px-2 py-2 text-neutral-100" />
          </label>
        </div>
      </div>
      <div className="rounded border border-neutral-800 bg-neutral-950/50 p-3 text-xs text-neutral-400">
        <div className="uppercase tracking-[0.18em] text-neutral-500">Schnellzugriff</div>
        <div className="mt-2 flex flex-wrap gap-2">
          <button type="button" onClick={onUndo} disabled={!canUndo} className="rounded border border-neutral-700 px-3 py-2 text-neutral-200 hover:bg-neutral-900 disabled:opacity-40">Undo</button>
          <button type="button" onClick={onRedo} disabled={!canRedo} className="rounded border border-neutral-700 px-3 py-2 text-neutral-200 hover:bg-neutral-900 disabled:opacity-40">Redo</button>
          <button type="button" onClick={requestMaterialImportDialog} className="rounded border border-fuchsia-700/70 px-3 py-2 text-fuchsia-100 hover:bg-fuchsia-950/30">Materialspur importieren</button>
          <button type="button" onClick={requestOpenMelodicLoopGridWorkbench} className="rounded border border-violet-700/70 px-3 py-2 text-violet-100 hover:bg-violet-950/30">Raster-Werkbank öffnen</button>
          <label className="inline-flex items-center gap-2 rounded border border-violet-700/50 px-3 py-2 text-violet-100 hover:bg-violet-950/20">
            <input type="checkbox" checked={rootFollowPreferred} onChange={(e) => onRootFollowPreferredChange(e.target.checked)} className="accent-violet-500" />
            <span>Als Root-Follow Loop verwenden</span>
          </label>
          <button type="button" onClick={onStartMaterialGroovePreview} className="rounded border border-violet-700/70 px-3 py-2 text-violet-100 hover:bg-violet-950/30">Material + Groove</button>
          <button type="button" onClick={onSendMelodicLoopToXensonar} disabled={busy} className="rounded border border-cyan-700/70 bg-cyan-950/35 px-3 py-2 text-cyan-100 hover:bg-cyan-900/35 disabled:opacity-50">Melodic Loop an Xensonar senden</button>
          <button type="button" onClick={onSendToSpectralForge} disabled={busy} className="rounded border border-sky-700/70 bg-sky-950/25 px-3 py-2 text-sky-100 hover:bg-sky-900/30 disabled:opacity-50">An SpectralForge senden</button>
          <button type="button" onClick={onSendDirectSourceToXensonar} disabled={busy || !hasRawSourceAsset} className="rounded border border-emerald-700/70 bg-emerald-950/25 px-3 py-2 text-emerald-100 hover:bg-emerald-900/30 disabled:opacity-50">Direktquelle an Xensonar senden</button>
        </div>
      </div>
    </div>
  );
}
