import { DroneRhythmEditorSlot } from './DroneRhythmEditorSlot';
import type { ResonanceControlCorePanelProps, ResonanceDriveSourceKey } from './resonanceControlCoreTypes';

const DRIVE_SOURCES: Array<{ key: ResonanceDriveSourceKey; label: string }> = [
  { key: 'drone', label: 'Drone' }, { key: 'particles', label: 'Partikel' }, { key: 'waves', label: 'Wellenstarter' }, { key: 'myzel', label: 'Myzel' },
];

type Props = Pick<ResonanceControlCorePanelProps,
  | 'nParamsUI' | 'droneVolume' | 'setDroneVolume' | 'onDroneTimbreChange'
  | 'updateNParams' | 'transientDriveUi' | 'updateTransientDriveSource'
  | 'myzelEnabled' | 'myzelStep16ths' | 'toggleMyzelEnabled' | 'setMyzelStep16ths'
> & { droneEditorOpen: boolean; setDroneEditorOpen: (updater: boolean | ((value: boolean) => boolean)) => void };

export function ResonanceDroneDriveControls({
  nParamsUI, droneVolume, setDroneVolume, onDroneTimbreChange, updateNParams,
  transientDriveUi, updateTransientDriveSource, myzelEnabled, myzelStep16ths,
  toggleMyzelEnabled, setMyzelStep16ths, droneEditorOpen, setDroneEditorOpen,
}: Props) {
  return (
    <div className="flex flex-col gap-3 border border-neutral-800 bg-neutral-900/50 p-4">
      <h3 className="mb-1 border-b border-neutral-800 pb-1 text-[10px] uppercase tracking-widest text-neutral-500">Drone · Begleitung · Drive</h3>
      <div><label className="mb-1 block text-xs text-neutral-400">Gesamtlautstärke: {(droneVolume * 100).toFixed(0)}%</label><input type="range" min="0" max="1" step="0.01" value={droneVolume} onChange={(e) => setDroneVolume(parseFloat(e.target.value))} className="w-full cursor-pointer" /></div>
      <div><label className="mb-1 block text-xs text-neutral-400">Drone Klangfarbe: {(nParamsUI.droneTimbre * 100).toFixed(0)}%</label><input type="range" min="0" max="1" step="0.01" value={nParamsUI.droneTimbre} onChange={(e) => onDroneTimbreChange(parseFloat(e.target.value))} className="w-full cursor-pointer" /></div>
      <div className="grid grid-cols-2 gap-2">
        <div><label className="mb-1 block text-xs text-neutral-400">Vibrato</label><input type="range" min="0" max="1" step="0.01" value={nParamsUI.droneVibrato} onChange={(e) => updateNParams({ droneVibrato: parseFloat(e.target.value) })} className="w-full cursor-pointer" /></div>
        <div><label className="mb-1 block text-xs text-neutral-400">Flanger</label><input type="range" min="0" max="1" step="0.01" value={nParamsUI.droneFlanger} onChange={(e) => updateNParams({ droneFlanger: parseFloat(e.target.value) })} className="w-full cursor-pointer" /></div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div><label className="mb-1 block text-xs text-neutral-400">Drive Insert</label><label className="mb-1 flex cursor-pointer items-center gap-2 text-sm text-neutral-300"><input type="checkbox" checked={!!nParamsUI.droneDriveOn} onChange={(e) => updateNParams({ droneDriveOn: e.target.checked })} /><span className="text-xs text-neutral-400">{nParamsUI.droneDriveOn ? 'An' : 'Aus'}</span></label></div>
        <div><label className="mb-1 block text-xs text-neutral-400">Drive: {((nParamsUI.droneDriveAmount ?? 0.36) * 100).toFixed(0)}%</label><input type="range" min="0" max="1" step="0.01" value={nParamsUI.droneDriveAmount ?? 0.36} onChange={(e) => updateNParams({ droneDriveAmount: parseFloat(e.target.value) })} className="w-full cursor-pointer" /></div>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <div><label className="mb-1 block text-xs text-neutral-400">Tone</label><input type="range" min="0" max="1" step="0.01" value={nParamsUI.droneDriveTone ?? 0.56} onChange={(e) => updateNParams({ droneDriveTone: parseFloat(e.target.value) })} className="w-full cursor-pointer" /></div>
        <div><label className="mb-1 block text-xs text-neutral-400">Mix</label><input type="range" min="0" max="1" step="0.01" value={nParamsUI.droneDriveMix ?? 0.48} onChange={(e) => updateNParams({ droneDriveMix: parseFloat(e.target.value) })} className="w-full cursor-pointer" /></div>
        <div><label className="mb-1 block text-xs text-neutral-400">Output</label><input type="range" min="0.3" max="1.2" step="0.01" value={nParamsUI.droneDriveOutput ?? 0.9} onChange={(e) => updateNParams({ droneDriveOutput: parseFloat(e.target.value) })} className="w-full cursor-pointer" /></div>
      </div>
      <div className="rounded border border-neutral-800 bg-neutral-950/40 p-2">
        <div className="mb-2 text-[10px] uppercase tracking-widest text-neutral-500">Drive Quellen</div>
        <div className="grid grid-cols-2 gap-2">
          {DRIVE_SOURCES.map(({ key, label }) => { const cfg = transientDriveUi[key]; return (
            <div key={key} className="rounded border border-neutral-800 bg-neutral-950/50 p-2">
              <label className="mb-1 flex items-center gap-2 text-xs text-neutral-300"><input type="checkbox" checked={cfg.enabled} onChange={(e) => updateTransientDriveSource(key, { enabled: e.target.checked })} /><span>{label}</span><span className="ml-auto text-[10px] text-neutral-500">{(cfg.send * 100).toFixed(0)}%</span></label>
              <input type="range" min="0" max="1" step="0.01" value={cfg.send} onChange={(e) => updateTransientDriveSource(key, { send: parseFloat(e.target.value) })} className="w-full cursor-pointer" />
            </div>
          ); })}
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <div><label className="mb-1 block text-xs text-neutral-400">Drone Rhythmus (Gate)</label><select value={nParamsUI.droneRhythm} onChange={(e) => updateNParams({ droneRhythm: e.target.value })} className="w-full border border-neutral-700 bg-neutral-950 p-1 text-sm text-neutral-300"><option value="Off">Aus (Dauerstrich)</option><option value="Puls 1/4">Langsamer Puls (1/4)</option><option value="Puls 1/8">Treibender Puls (1/8)</option><option value="Puls 1/16">Stottern (1/16)</option><option value="Synkope">Synkope (Pattern)</option><option value="Custom">Custom (16 Step)</option></select></div>
        <DroneRhythmEditorSlot currentMode={nParamsUI.droneRhythm} currentCustomSteps={nParamsUI.droneRhythmCustomSteps ?? [1,0,0,0,1,0,0,0,1,0,0,0,1,0,0,0]} open={droneEditorOpen} onToggle={() => setDroneEditorOpen((open) => !open)} onSelectMode={(mode) => updateNParams({ droneRhythm: mode })} onChangeCustomSteps={(steps) => updateNParams({ droneRhythmCustomSteps: steps, droneRhythm: 'Custom' })} />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div><label className="mb-1 block text-xs text-neutral-400">Myzel / Wohnzimmer (geteilt)</label><button onClick={toggleMyzelEnabled} className={`w-full border px-3 py-2 text-sm ${myzelEnabled ? 'border-amber-500 bg-amber-900 text-amber-100' : 'border-neutral-700 text-neutral-200 hover:bg-neutral-900'}`}>{myzelEnabled ? 'Myzel Deaktivieren' : 'Myzel Aktivieren'}</button></div>
        <div><label className="mb-1 block text-xs text-neutral-400">Myzel-Takt</label><select value={String(myzelStep16ths)} onChange={(e) => setMyzelStep16ths(parseInt(e.target.value, 10))} className="w-full border border-neutral-700 bg-neutral-950 p-1 text-sm text-neutral-300">{Array.from({ length: 9 }, (_, i) => i + 1).map((step) => <option key={step} value={step}>{step} / 16</option>)}</select></div>
      </div>
    </div>
  );
}
