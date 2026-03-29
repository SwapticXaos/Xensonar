import { useEffect, useRef, useState } from 'react';
import { useStore, type ToolType } from '../state/store';
import { stampPresets, type StampCategory } from '../audio/stampPresets';

const tools: { id: ToolType; icon: string; label: string; shortcut: string }[] = [
  { id: 'brush', icon: '🖌️', label: 'Soft Brush', shortcut: 'B' },
  { id: 'hardBrush', icon: '✏️', label: 'Hard Brush', shortcut: 'H' },
  { id: 'line', icon: '📐', label: 'Linie', shortcut: 'L' },
  { id: 'harmonicBrush', icon: '🎵', label: 'Harmonic Brush', shortcut: 'A' },
  { id: 'noiseBrush', icon: '🌊', label: 'Noise Brush', shortcut: 'N' },
  { id: 'spray', icon: '💨', label: 'Spray', shortcut: 'S' },
  { id: 'formant', icon: '🗣️', label: 'Vokalband-Pinsel', shortcut: 'F' },
  { id: 'stamp', icon: '📋', label: 'Stempel', shortcut: 'T' },
  { id: 'morph', icon: '🌀', label: 'Verformen', shortcut: 'M' },
  { id: 'smudge', icon: '🫟', label: 'Wischfinger', shortcut: 'J' },
  { id: 'dodgeBurn', icon: '☀️', label: 'Nachbelichten / Abdunkeln', shortcut: 'D' },
  { id: 'blurSharpen', icon: '🪞', label: 'Blur / Sharpen', shortcut: 'K' },
  { id: 'delaySmear', icon: '⟿', label: 'Delay Smear', shortcut: 'Y' },
  { id: 'threshold', icon: '🚪', label: 'Threshold / Gate', shortcut: 'R' },
  { id: 'sourceTrace', icon: '🧬', label: 'Quellspur / Source Trace', shortcut: 'U' },
];

export default function Toolbar() {
  const activeTool = useStore(s => s.activeTool);
  const setActiveTool = useStore(s => s.setActiveTool);
  const eraseMode = useStore(s => s.toolSettings.eraseMode);
  const toggleEraseMode = useStore(s => s.toggleEraseMode);
  const setStampData = useStore(s => s.setStampData);
  const setStampPhase = useStore(s => s.setStampPhase);
  const resetStampTransform = useStore(s => s.resetStampTransform);
  const updateToolSettings = useStore(s => s.updateToolSettings);

  const menuRef = useRef<HTMLDivElement>(null);
  const [presetMenu, setPresetMenu] = useState<{ open: boolean; x: number; y: number }>({
    open: false,
    x: 0,
    y: 0,
  });
  const [selectedCategory, setSelectedCategory] = useState<'all' | StampCategory>('all');

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(e.target as Node)) {
        setPresetMenu((s) => ({ ...s, open: false }));
      }
    };
    window.addEventListener('mousedown', onDown);
    return () => window.removeEventListener('mousedown', onDown);
  }, []);

  const loadPreset = (presetId: string) => {
    const preset = stampPresets.find(p => p.id === presetId);
    if (!preset) return;
    setActiveTool('stamp');
    updateToolSettings({ brushSize: preset.defaultSize, intensity: preset.defaultIntensity });
    setStampData({
      width: preset.stamp.width,
      height: preset.stamp.height,
      data: preset.stamp.data.slice(),
      grainData: preset.stamp.grainData.slice(),
    });
    resetStampTransform();
    setStampPhase('stamping');
    setPresetMenu((s) => ({ ...s, open: false }));
  };

  return (
    <div className="flex flex-col gap-1 p-1.5 bg-gray-900 border-r border-gray-700 w-12">
      {tools.map(tool => (
        <button
          key={tool.id}
          title={`${tool.label} (${tool.shortcut})`}
          onClick={() => setActiveTool(tool.id)}
          onContextMenu={(e) => {
            if (tool.id !== 'stamp') return;
            e.preventDefault();
            setPresetMenu({ open: true, x: e.clientX + 8, y: e.clientY + 8 });
          }}
          className={`
            w-9 h-9 flex items-center justify-center rounded text-lg
            transition-all duration-100
            ${activeTool === tool.id
              ? 'bg-purple-600 shadow-lg shadow-purple-500/30 scale-105'
              : 'bg-gray-800 hover:bg-gray-700'
            }
          `}
        >
          {tool.icon}
        </button>
      ))}

      {/* Separator */}
      <div className="border-t border-gray-700 my-1" />

      {/* Erase mode toggle */}
      <button
        title={`Radier-Modus (X) ${eraseMode ? 'AN' : 'AUS'}`}
        onClick={toggleEraseMode}
        className={`
          w-9 h-9 flex items-center justify-center rounded text-sm font-bold
          transition-all duration-100
          ${eraseMode
            ? 'bg-red-600 shadow-lg shadow-red-500/40 text-white animate-pulse'
            : 'bg-gray-800 hover:bg-gray-700 text-gray-400'
          }
        `}
      >
        {eraseMode ? '⊖' : '⊕'}
      </button>

      {presetMenu.open && (
        <div
          ref={menuRef}
          className="fixed z-50 bg-gray-900 border border-gray-700 rounded-md p-1.5 w-72 shadow-2xl"
          style={{ left: presetMenu.x, top: presetMenu.y }}
        >
          <div className="text-[10px] text-cyan-300 px-1.5 pb-1.5 border-b border-gray-700 mb-1 flex items-center justify-between">
            <span>Stempel-Presets</span>
            <span className="text-gray-500">{stampPresets.length} Einträge</span>
          </div>
          <div className="px-1.5 pb-1.5 text-[10px] text-gray-500 border-b border-gray-800 mb-2">
            <span className="text-cyan-400">Core</span> = kuratierte Kernbank · <span className="text-amber-400">Legacy</span> = ältere Vergleichsbasis
          </div>
          <div className="mb-2 flex flex-wrap gap-1 px-1">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`rounded px-2 py-0.5 text-[10px] ${selectedCategory === 'all' ? 'bg-cyan-700 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}
            >Alle</button>
            {Array.from(new Set(stampPresets.map((preset) => preset.category))).map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`rounded px-2 py-0.5 text-[10px] ${selectedCategory === category ? 'bg-cyan-700 text-white' : category === 'legacy' ? 'bg-amber-950/40 text-amber-300 hover:bg-amber-900/30' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}
              >{category}</button>
            ))}
          </div>
          <div className="max-h-[60vh] overflow-y-auto pr-1 flex flex-col gap-2">
            {Array.from(new Set(stampPresets.map((preset) => preset.category)))
              .filter((category) => selectedCategory === 'all' || selectedCategory === category)
              .map((category) => (
              <div key={category} className="flex flex-col gap-1">
                <div className={`text-[10px] uppercase tracking-wide px-1 ${category === 'legacy' ? 'text-amber-500' : 'text-gray-500'}`}>
                  {category === 'legacy' ? 'legacy bank' : `core · ${category}`}
                </div>
                {stampPresets.filter((preset) => preset.category === category).map((preset) => (
                  <button
                    key={preset.id}
                    onClick={() => loadPreset(preset.id)}
                    className={`text-left px-2 py-1.5 rounded ${preset.legacy ? 'bg-amber-950/30 hover:bg-amber-900/30 border border-amber-800/40' : 'bg-gray-800 hover:bg-gray-700'}`}
                    title={preset.description}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-[11px] text-gray-200 leading-tight">{preset.name}</div>
                      <div className={`text-[9px] uppercase ${preset.legacy ? 'text-amber-400/90' : 'text-cyan-400/80'}`}>
                        {preset.legacy ? 'legacy' : preset.category}
                      </div>
                    </div>
                    <div className="text-[10px] text-gray-500 leading-tight">{preset.description}</div>
                    <div className="mt-1 flex flex-wrap items-center gap-1 text-[9px]">
                      <span className="rounded px-1.5 py-0.5" style={{ backgroundColor: `${preset.previewColor}22`, color: preset.previewColor }}>{preset.spectralRole}</span>
                      <span className="text-gray-500">Size {preset.defaultSize}</span>
                      <span className="text-gray-500">Int {Math.round(preset.defaultIntensity * 100)}%</span>
                      <span className="text-gray-500">{preset.decayType}</span>
                    </div>
                    <div className="mt-1 flex flex-wrap gap-1 text-[9px] text-gray-500">
                      {preset.tags.map((tag) => <span key={tag} className="rounded bg-black/20 px-1.5 py-0.5">{tag}</span>)}
                    </div>
                  </button>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
