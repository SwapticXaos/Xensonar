import type { MaterialLoopTimeMode, ResonanceHotkeyMode } from './materialLoopPanelTypes';

export function HeaderVolumeControl({
  label,
  value,
  onChange,
  tone = 'fuchsia',
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  tone?: 'fuchsia' | 'violet' | 'neutral';
}) {
  const accent = tone === 'violet' ? 'accent-violet-500' : tone === 'fuchsia' ? 'accent-fuchsia-500' : 'accent-neutral-300';
  return (
    <label className="block rounded border border-neutral-800 bg-black/25 px-2 py-1 text-[10px] leading-tight text-neutral-300">
      <div className="mb-1 flex items-center justify-between gap-2"><span>{label}</span><span className="text-neutral-500">{Math.round(value * 100)}%</span></div>
      <input type="range" min="0" max="1" step="0.01" value={value} onChange={(event) => onChange(parseFloat(event.target.value))} className={`w-full cursor-pointer ${accent}`} />
    </label>
  );
}

export function TimeModeSelect({
  label,
  value,
  onChange,
  tone = 'neutral',
}: {
  label: string;
  value: MaterialLoopTimeMode;
  onChange: (value: MaterialLoopTimeMode) => void;
  tone?: 'neutral' | 'violet';
}) {
  const border = tone === 'violet' ? 'border-violet-700/60 text-violet-100' : 'border-neutral-700 text-neutral-300';
  return (
    <label className="block">
      <span className="mb-1 block text-xs text-neutral-400">{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value as MaterialLoopTimeMode)} className={`w-full bg-neutral-950 ${border} border p-1 text-sm`}>
        <option value="normal">Normal</option>
        <option value="double">Double Time</option>
        <option value="half">Half Time</option>
      </select>
    </label>
  );
}

export function HotkeyModeControls({
  resonanceHotkeyMode,
  onResonanceHotkeyModeChange,
}: {
  resonanceHotkeyMode: ResonanceHotkeyMode;
  onResonanceHotkeyModeChange: (value: ResonanceHotkeyMode) => void;
}) {
  return (
    <div className="rounded border border-neutral-800 bg-neutral-950/70 p-2 space-y-2">
      <div className="text-[10px] uppercase tracking-widest text-neutral-500">Resonance-Hotkeys</div>
      <div className="flex flex-wrap gap-2 text-xs">
        <button type="button" onClick={() => onResonanceHotkeyModeChange('material')} className={`rounded-sm border px-2 py-1 ${resonanceHotkeyMode === 'material' ? 'border-amber-400/90 bg-cyan-950/40 text-cyan-100 shadow-[0_0_0_1px_rgba(251,191,36,0.25)]' : 'border-neutral-700 text-neutral-300 hover:bg-neutral-900'}`}>Materialspur</button>
        <button type="button" onClick={() => onResonanceHotkeyModeChange('root-follow')} className={`rounded-sm border px-2 py-1 ${resonanceHotkeyMode === 'root-follow' ? 'border-amber-400/90 bg-violet-950/35 text-violet-100 shadow-[0_0_0_1px_rgba(251,191,36,0.25)]' : 'border-neutral-700 text-neutral-300 hover:bg-neutral-900'}`}>Root Follow</button>
        <button type="button" onClick={() => onResonanceHotkeyModeChange('particle-classic')} className={`rounded-sm border px-2 py-1 ${resonanceHotkeyMode === 'particle-classic' ? 'border-amber-400/90 bg-amber-950/30 text-amber-100 shadow-[0_0_0_1px_rgba(251,191,36,0.25)]' : 'border-neutral-700 text-neutral-300 hover:bg-neutral-900'}`}>Partikel</button>
      </div>
    </div>
  );
}
