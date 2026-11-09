import { audioEngine } from '../../audio/AudioEngine';
import type { SynthMode } from '../../state/store';
import {
  DIRECT_RENDERER_REFERENCE_MODES,
  DIRECT_RENDERER_REFERENCE_NOTE,
  resolveDirectRendererReferenceButtonClass,
} from './directRendererReferenceModel';

type DirectRendererReferencePanelProps = {
  expanded: boolean;
  onToggle: () => void;
  synthMode: SynthMode;
  setSynthMode: (mode: SynthMode) => void;
  showGrainLayer: boolean;
  setShowGrainLayer: (show: boolean) => void;
};

export function DirectRendererReferencePanel({
  expanded,
  onToggle,
  synthMode,
  setSynthMode,
  showGrainLayer,
  setShowGrainLayer,
}: DirectRendererReferencePanelProps) {
  const selectDirectRendererMode = (mode: SynthMode) => {
    setSynthMode(mode);
    audioEngine.invalidateBuffer();
  };

  return (
    <div
      className="p-2 border-b border-gray-800"
      data-spectral-forge-legacy-renderer-surface="true"
      data-spectral-forge-direct-renderer-reference-surface="true"
    >
      <button
        onClick={onToggle}
        className="text-gray-500 font-semibold mb-1.5 w-full text-left flex items-center gap-1"
      >
        <span className={`transition-transform ${expanded ? 'rotate-90' : ''}`}>▶</span>
        ⚙️ Direkt-Renderer (Referenz)
      </button>

      {expanded && (
        <div className="flex flex-col gap-2">
          <div className="rounded bg-gray-800/50 p-1.5 text-[10px] leading-relaxed text-gray-500">
            {DIRECT_RENDERER_REFERENCE_NOTE}
          </div>
          <div className="flex flex-col gap-1">
            {DIRECT_RENDERER_REFERENCE_MODES.map(mode => (
              <button
                key={mode.id}
                onClick={() => selectDirectRendererMode(mode.id)}
                className={`h-8 rounded text-xs font-medium transition-colors flex items-center justify-between px-2 ${resolveDirectRendererReferenceButtonClass(mode.id, synthMode)}`}
              >
                <span>{mode.label}</span>
                <span className="text-[10px] opacity-60">{mode.desc}</span>
              </button>
            ))}
          </div>

          <div className="mt-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showGrainLayer}
                onChange={e => setShowGrainLayer(e.target.checked)}
                className="accent-cyan-500"
              />
              <span className="text-gray-400">🌾 Körnung-Ebene anzeigen</span>
            </label>
            {(showGrainLayer || synthMode === 'granular') && (
              <div className="mt-1.5 text-[10px] text-gray-500 leading-relaxed bg-gray-800/50 p-1.5 rounded">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span className="w-3 h-3 rounded-full bg-red-500 inline-block" />
                  <span>Kurz = Rauschen/Clicks</span>
                </div>
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span className="w-3 h-3 rounded-full bg-gray-400 inline-block" />
                  <span>Mittel = Textur</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-cyan-400 inline-block" />
                  <span>Lang = Tonal/Smooth</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
