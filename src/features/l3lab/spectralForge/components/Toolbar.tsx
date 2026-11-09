import { useEffect, useRef, useState } from 'react';
import { useStore } from '../state/store';
import { stampPresets, type StampCategory } from '../audio/stampPresets';
import {
  TOOLBAR_TOOLS,
  buildToolButtonTitle,
  resolveEraseModeClass,
  resolveEraseModeLabel,
  resolveEraseModeTitle,
  resolveStampCategoryFilterClass,
  resolveStampCategoryHeaderClass,
  resolveStampCategoryHeaderLabel,
  resolveStampPresetButtonClass,
  resolveStampPresetCategories,
  resolveStampPresetKindClass,
  resolveStampPresetKindLabel,
  resolveStampPresetsByCategory,
  resolveToolButtonClass,
  resolveVisibleStampPresetCategories,
} from './toolbar/toolbarUiModel';

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
      {TOOLBAR_TOOLS.map(tool => (
        <button
          key={tool.id}
          title={buildToolButtonTitle(tool)}
          onClick={() => setActiveTool(tool.id)}
          onContextMenu={(e) => {
            if (tool.id !== 'stamp') return;
            e.preventDefault();
            setPresetMenu({ open: true, x: e.clientX + 8, y: e.clientY + 8 });
          }}
          className={resolveToolButtonClass(activeTool, tool.id)}
        >
          {tool.icon}
        </button>
      ))}

      {/* Separator */}
      <div className="border-t border-gray-700 my-1" />

      {/* Erase mode toggle */}
      <button
        title={resolveEraseModeTitle(eraseMode)}
        onClick={toggleEraseMode}
        className={resolveEraseModeClass(eraseMode)}
      >
        {resolveEraseModeLabel(eraseMode)}
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
              className={`rounded px-2 py-0.5 text-[10px] ${resolveStampCategoryFilterClass('all', selectedCategory)}`}
            >Alle</button>
            {resolveStampPresetCategories(stampPresets).map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`rounded px-2 py-0.5 text-[10px] ${resolveStampCategoryFilterClass(category, selectedCategory)}`}
              >{category}</button>
            ))}
          </div>
          <div className="max-h-[60vh] overflow-y-auto pr-1 flex flex-col gap-2">
            {resolveVisibleStampPresetCategories(stampPresets, selectedCategory)
              .map((category) => (
              <div key={category} className="flex flex-col gap-1">
                <div className={resolveStampCategoryHeaderClass(category)}>
                  {resolveStampCategoryHeaderLabel(category)}
                </div>
                {resolveStampPresetsByCategory(stampPresets, category).map((preset) => (
                  <button
                    key={preset.id}
                    onClick={() => loadPreset(preset.id)}
                    className={`text-left px-2 py-1.5 rounded ${resolveStampPresetButtonClass(preset)}`}
                    title={preset.description}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-[11px] text-gray-200 leading-tight">{preset.name}</div>
                      <div className={`text-[9px] uppercase ${resolveStampPresetKindClass(preset)}`}>
                        {resolveStampPresetKindLabel(preset)}
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
