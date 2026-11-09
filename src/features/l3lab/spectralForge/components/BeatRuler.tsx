import { useStore } from '../state/store';

export default function BeatRuler() {
  const materialExport = useStore((s) => s.materialExport);
  const updateMaterialExport = useStore((s) => s.updateMaterialExport);

  return (
    <div className="border border-neutral-800 bg-neutral-950/70 px-3 py-2 rounded-md">
      <div className="flex flex-wrap items-center justify-between gap-3 text-[10px] uppercase tracking-[0.18em] text-neutral-500">
        <span>Orientierungsmarker in der Malfläche</span>
        <label className="flex items-center gap-2 normal-case tracking-normal text-neutral-400 cursor-pointer">
          <input
            type="checkbox"
            checked={materialExport.beatGuideAudible}
            onChange={(e) => updateMaterialExport({ beatGuideAudible: e.target.checked })}
          />
          Metronom hörbar
        </label>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-4 text-xs text-neutral-400">
        <label className="flex items-center gap-2">
          <span>Metronomlautstärke</span>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={materialExport.beatGuideVolume}
            onChange={(e) => updateMaterialExport({ beatGuideVolume: Number(e.target.value) })}
            onPointerUp={(e) => (e.currentTarget as HTMLInputElement).blur()}
            onMouseUp={(e) => (e.currentTarget as HTMLInputElement).blur()}
            tabIndex={-1}
            className="w-28 accent-cyan-400"
          />
          <span className="w-10 text-right font-mono">{Math.round(materialExport.beatGuideVolume * 100)}%</span>
        </label>
      </div>
    </div>
  );
}
