import type { SynthMode } from '../../state/store';

export type DirectRendererReferenceMode = {
  id: SynthMode;
  label: string;
  desc: string;
};

export const DIRECT_RENDERER_REFERENCE_NOTE =
  'Direkt-Renderer als schnelle Referenzspur: unmittelbare Spectrogramm-Vorschau/WAV ohne Hörweisen-Orchestrierung. Bleibt bewusst erhalten, aber ist nicht die gleiche Play-Lesung wie die Hörweisen oben.';

export const DIRECT_RENDERER_REFERENCE_MODES: DirectRendererReferenceMode[] = [
  { id: 'additive', label: 'Additiv', desc: 'Sinus direkt' },
  { id: 'ifft', label: 'IFFT', desc: 'Spektrum direkt' },
  { id: 'granular', label: 'Granular', desc: 'Körnung direkt' },
  { id: 'glyph', label: 'Glyph', desc: 'Ereignis direkt' },
];

export function resolveDirectRendererReferenceButtonClass(modeId: SynthMode, activeMode: SynthMode): string {
  if (activeMode !== modeId) return 'bg-gray-800 text-gray-400 hover:bg-gray-700';
  return modeId === 'granular'
    ? 'bg-cyan-700 text-white ring-1 ring-cyan-400'
    : 'bg-green-700 text-white';
}
