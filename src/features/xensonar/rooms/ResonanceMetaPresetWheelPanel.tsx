import { useResonanceMetaPresetWheelWorkspace } from './useResonanceMetaPresetWheelWorkspace';

export type MetaPresetWheelPreset = { id: string; label: string; description: string; points: string; [key: string]: any };

const WHEEL_SLOT_POINTS = [
  '0,-48 9,-38 -9,-38',
  '31,-31 20,-31 31,-20',
  '48,0 38,-9 38,9',
  '31,31 20,31 31,20',
  '0,48 -9,38 9,38',
  '-31,31 -20,31 -31,20',
  '-48,0 -38,9 -38,-9',
  '-31,-31 -20,-31 -31,-20',
];

const describePresetCore = (preset: Record<string, any>) => {
  const patch = preset.nexusPatch ?? {};
  return [
    patch.gridTuning ? `Raster ${patch.gridTuning}` : null,
    patch.gridMode ? `Modus ${patch.gridMode}` : null,
    preset.waveSoundPreset ? `Welle ${preset.waveSoundPreset}` : null,
    preset.particlePreset ? `Partikel ${preset.particlePreset}` : null,
    typeof preset.gridTempoBpm === 'number' ? `${preset.gridTempoBpm} BPM` : null,
  ].filter(Boolean).join(' · ');
};

type Props = {
  metaPresets: MetaPresetWheelPreset[];
  mandalaDotPositions: Array<{ id: string; cx: number; cy: number }>;
  mandalaPresetColors: Record<string, string>;
  mandalaRandomizingPresetId: string | null;
  rouletteIsSpinning: boolean;
  highlightedMandalaPresetId: string | null;
  activeMetaPreset: { label: string; description: string } | null;
  activeMetaPresetId: string | null;
  sessionMetaOverrides: Record<string, { preset?: unknown }>;
  onRandomizeMetaPreset: (presetId: string) => void;
  onApplyMetaPreset: (presetId: string) => void;
  onStartMetaPresetRoulette: () => void;
  hexToRgba: (hex: string, alpha: number) => string;
};

export function ResonanceMetaPresetWheelPanel(props: Props) {
  const {
    metaPresets, mandalaDotPositions, mandalaPresetColors, mandalaRandomizingPresetId,
    rouletteIsSpinning, highlightedMandalaPresetId, activeMetaPreset, activeMetaPresetId,
    sessionMetaOverrides, onRandomizeMetaPreset, onApplyMetaPreset, onStartMetaPresetRoulette, hexToRgba,
  } = props;
  const {
    normalizedWheelPresetOrder, wheelSlotIds, orderedMetaPresets, orderedWheelPresets, selectedManagerPreset,
    setSelectedManagerPresetId, setDraggedManagerPresetId, persistWheelOrder, moveManagerPreset,
    dropManagerPreset, resetManagerWheelOrder,
  } = useResonanceMetaPresetWheelWorkspace({ metaPresets, activeMetaPresetId });

  return (
    <>
        <div className="mt-4 border border-neutral-800 bg-neutral-950/70 p-3">
          <div className="mx-auto aspect-square w-full">
            <svg viewBox="0 0 100 100" className="h-full w-full" fill="none" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-label="Xensonar Harmonic Mandala mit Meta-Presets">
              <defs>
                <filter id="mandala-soft-glow" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="0.22" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>

              <g transform="translate(49.65 50)" stroke="rgba(56,189,248,0.14)">
                <ellipse rx="4" ry="18" />
                <ellipse rx="4" ry="18" transform="rotate(45)" />
                <ellipse rx="4" ry="18" transform="rotate(90)" />
                <ellipse rx="4" ry="18" transform="rotate(135)" />
                <circle cx="0" cy="-18" r="18" />
                <circle cx="18" cy="0" r="18" />
                <circle cx="0" cy="18" r="18" />
                <circle cx="-18" cy="0" r="18" />
                <polygon points="0,-48 9,-38 -9,-38" />
                <polygon points="48,0 38,-9 38,9" />
                <polygon points="0,48 -9,38 9,38" />
                <polygon points="-48,0 -38,9 -38,-9" />
              </g>

              <g transform="translate(50.35 50)" stroke="rgba(232,121,249,0.14)">
                <ellipse rx="4" ry="18" />
                <ellipse rx="4" ry="18" transform="rotate(45)" />
                <ellipse rx="4" ry="18" transform="rotate(90)" />
                <ellipse rx="4" ry="18" transform="rotate(135)" />
                <circle cx="0" cy="-18" r="18" />
                <circle cx="18" cy="0" r="18" />
                <circle cx="0" cy="18" r="18" />
                <circle cx="-18" cy="0" r="18" />
                <polygon points="0,-48 9,-38 -9,-38" />
                <polygon points="48,0 38,-9 38,9" />
                <polygon points="0,48 -9,38 9,38" />
                <polygon points="-48,0 -38,9 -38,-9" />
              </g>

              <g transform="translate(50 50)" stroke="#5f5f5f" filter="url(#mandala-soft-glow)">
                <ellipse rx="4" ry="18" />
                <ellipse rx="4" ry="18" transform="rotate(45)" />
                <ellipse rx="4" ry="18" transform="rotate(90)" />
                <ellipse rx="4" ry="18" transform="rotate(135)" />
                <circle cx="0" cy="-18" r="18" />
                <circle cx="18" cy="0" r="18" />
                <circle cx="0" cy="18" r="18" />
                <circle cx="-18" cy="0" r="18" />

                {mandalaDotPositions.map((dot, idx) => {
                  const targetPresetId = wheelSlotIds[idx] ?? dot.id;
                  const targetPreset = metaPresets.find((preset) => preset.id === targetPresetId);
                  const dotColor = mandalaPresetColors[targetPresetId] ?? mandalaPresetColors[dot.id] ?? '#a3a3a3';
                  const isSpinning = mandalaRandomizingPresetId === targetPresetId;
                  return (
                    <g
                      key={`mandala-dot-${targetPresetId}-${idx}`}
                      role="button"
                      tabIndex={0}
                      onClick={() => onRandomizeMetaPreset(targetPresetId)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          onRandomizeMetaPreset(targetPresetId);
                        }
                      }}
                      aria-label={`Meta-Preset ${targetPreset?.label ?? targetPresetId} fuer diese Sitzung zufaellig ueberschreiben`}
                      style={{ cursor: mandalaRandomizingPresetId || rouletteIsSpinning ? "wait" : "pointer" }}
                    >
                      <title>Sitzungs-Zufall fuer ${targetPreset?.label ?? targetPresetId}</title>
                      <circle cx={dot.cx} cy={dot.cy} r="4.1" fill={hexToRgba(dotColor, isSpinning ? 0.18 : 0.09)} stroke={isSpinning ? dotColor : "#5f5f5f"} strokeWidth={isSpinning ? 1.6 : 1.1} />
                      <circle cx={dot.cx} cy={dot.cy} r="1.9" fill={isSpinning ? dotColor : "#737373"} />
                    </g>
                  );
                })}

                <polygon points="0,-48 9,-38 -9,-38" />
                <polygon points="48,0 38,-9 38,9" />
                <polygon points="0,48 -9,38 9,38" />
                <polygon points="-48,0 -38,9 -38,-9" />
                <polygon points="-31,-31 -20,-31 -31,-20" />
                <polygon points="31,-31 20,-31 31,-20" />
                <polygon points="31,31 20,31 31,20" />
                <polygon points="-31,31 -20,31 -31,20" />
              </g>

              <g transform="translate(50 50)">
                {orderedWheelPresets.map((preset, idx) => {
                  const color = mandalaPresetColors[preset.id] ?? '#a3a3a3';
                  const active = highlightedMandalaPresetId === preset.id;
                  return (
                    <g
                      key={`${preset.id}-${idx}`}
                      role="button"
                      tabIndex={0}
                      onClick={() => onApplyMetaPreset(preset.id)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          onApplyMetaPreset(preset.id);
                        }
                      }}
                      style={{ cursor: "pointer" }}
                      aria-label={`Meta-Preset ${preset.label} laden`}
                    >
                      <title>{preset.label}: {preset.description}</title>
                      <polygon
                        points={WHEEL_SLOT_POINTS[idx] ?? preset.points}
                        fill={active ? hexToRgba(color, 0.22) : hexToRgba(color, 0.08)}
                        stroke={active ? color : hexToRgba(color, 0.48)}
                        strokeWidth={active ? 2.6 : 1.45}
                        style={active ? { filter: `drop-shadow(0 0 8px ${hexToRgba(color, 0.55)})` } : undefined}
                      />
                    </g>
                  );
                })}
                <g
                  role="button"
                  tabIndex={0}
                  onClick={onStartMetaPresetRoulette}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      onStartMetaPresetRoulette();
                    }
                  }}
                  aria-label="Zufälliges Meta-Preset auswürfeln"
                  style={{ cursor: mandalaRandomizingPresetId || rouletteIsSpinning ? "wait" : "pointer" }}
                >
                  <title>Zufälliges Meta-Preset auswürfeln</title>
                  <circle cx="0" cy="0" r="6.2" fill={rouletteIsSpinning ? "rgba(250, 204, 21, 0.12)" : "rgba(255,255,255,0.025)"} stroke={rouletteIsSpinning ? "#fde047" : "rgba(163,163,163,0.28)"} strokeWidth="1.1" style={rouletteIsSpinning ? { animation: 'mandalaCenterPulse 0.42s ease-in-out infinite' } : undefined} />
                  <circle cx="0" cy="0" r="2.5" fill={rouletteIsSpinning ? "#facc15" : "rgba(212,212,212,0.42)"} />
                  <circle cx="0" cy="0" r="1.1" fill={rouletteIsSpinning ? "#fff7ae" : "rgba(255,255,255,0.75)"} />
                </g>
              </g>
            </svg>
          </div>
          <div className="mt-2 flex flex-col gap-1 text-[10px] uppercase tracking-widest text-neutral-500">
            <div className="flex items-center justify-between gap-2">
              <span>Meta-Presets auf den 8 Außenpfeilen</span>
              <span>{rouletteIsSpinning || mandalaRandomizingPresetId ? "würfelt" : activeMetaPreset ? "aktiv" : "klick lädt"}</span>
            </div>
            <div className={`min-h-[2.5rem] leading-relaxed ${activeMetaPreset ? "text-amber-300" : "text-neutral-500"}`}>
              {rouletteIsSpinning ? "Mitte klicken: das Mandala würfelt ein Meta-Preset aus Mausbewegung und Rechnerjitter." : mandalaRandomizingPresetId ? "Die inneren Punkte überschreiben das zugehörige Meta-Preset für diese Sitzung per Rechner- und Mauszufall." : activeMetaPreset ? `${activeMetaPreset.label}${activeMetaPresetId && sessionMetaOverrides[activeMetaPresetId]?.preset ? " · Session-Zufall" : ""} · ${activeMetaPreset.description}` : "12 Uhr beginnen, dann im Uhrzeigersinn weiterschalten. Mitte klickt Glücksrad, die inneren Punkte würfeln das jeweilige Preset neu aus."}
            </div>
          </div>
        </div>

        <div className="mt-4 border border-fuchsia-500/25 bg-fuchsia-950/10 p-3">
          <div className="flex items-center justify-between gap-2 border-b border-fuchsia-500/20 pb-2">
            <div>
              <div className="text-[10px] uppercase tracking-widest text-fuchsia-200">Glücksrad-Manager</div>
              <div className="text-[10px] text-neutral-500">Obere 8 Listeneinträge belegen das Rad. Ziehen oder Pfeile nutzen.</div>
            </div>
            <button type="button" onClick={resetManagerWheelOrder} className="border border-neutral-700 bg-neutral-950 px-2 py-1 text-[10px] uppercase tracking-widest text-neutral-300 hover:border-fuchsia-400">
              Reset
            </button>
          </div>

          <div className="mt-3 grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-3">
            <div className="max-h-72 overflow-y-auto pr-1 space-y-1">
              {orderedMetaPresets.map((preset, idx) => {
                const onWheel = idx < 8;
                const active = preset.id === (selectedManagerPreset?.id ?? activeMetaPresetId);
                return (
                  <div
                    key={`manager-${preset.id}`}
                    draggable
                    onDragStart={() => setDraggedManagerPresetId(preset.id)}
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={() => dropManagerPreset(preset.id)}
                    onClick={() => setSelectedManagerPresetId(preset.id)}
                    className={`grid grid-cols-[auto_minmax(0,1fr)_auto] gap-2 items-center border px-2 py-1 text-xs cursor-pointer ${active ? 'border-fuchsia-300 bg-fuchsia-500/10' : onWheel ? 'border-amber-500/30 bg-amber-950/10' : 'border-neutral-800 bg-neutral-950/60'}`}
                  >
                    <span className={`w-7 text-[10px] font-semibold ${onWheel ? 'text-amber-200' : 'text-neutral-500'}`}>{onWheel ? `Rad ${idx + 1}` : idx + 1}</span>
                    <span className="min-w-0">
                      <span className="block truncate text-neutral-200">{preset.label}</span>
                      <span className="block truncate text-[10px] text-neutral-500">{describePresetCore(preset)}</span>
                    </span>
                    <span className="flex gap-1">
                      <button type="button" onClick={(event) => { event.stopPropagation(); moveManagerPreset(preset.id, -1); }} className="border border-neutral-700 bg-neutral-950 px-1 text-[10px] text-neutral-300">↑</button>
                      <button type="button" onClick={(event) => { event.stopPropagation(); moveManagerPreset(preset.id, 1); }} className="border border-neutral-700 bg-neutral-950 px-1 text-[10px] text-neutral-300">↓</button>
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="border border-neutral-800 bg-neutral-950/60 p-2 text-xs text-neutral-300 min-h-48">
              {selectedManagerPreset ? (
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="text-sm font-semibold text-fuchsia-100">{selectedManagerPreset.label}</div>
                      <div className="text-[11px] leading-relaxed text-neutral-400">{selectedManagerPreset.description}</div>
                    </div>
                    <button type="button" onClick={() => onApplyMetaPreset(selectedManagerPreset.id)} className="border border-amber-400/60 bg-amber-500/10 px-2 py-1 text-[10px] uppercase tracking-widest text-amber-200">
                      Laden
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[10px] uppercase tracking-widest text-neutral-500">
                    <div className="border border-neutral-800 p-2">
                      <div className="text-neutral-300">Raster</div>
                      <div>{selectedManagerPreset.nexusPatch?.gridTuning ?? 'aktuell'}</div>
                    </div>
                    <div className="border border-neutral-800 p-2">
                      <div className="text-neutral-300">Modus</div>
                      <div>{selectedManagerPreset.nexusPatch?.gridMode ?? 'aktuell'}</div>
                    </div>
                    <div className="border border-neutral-800 p-2">
                      <div className="text-neutral-300">Wellenstarter</div>
                      <div>{selectedManagerPreset.waveSoundPreset ?? 'aktuell'}</div>
                    </div>
                    <div className="border border-neutral-800 p-2">
                      <div className="text-neutral-300">Partikel</div>
                      <div>{selectedManagerPreset.particlePreset ?? 'aktuell'}</div>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button type="button" onClick={() => onRandomizeMetaPreset(selectedManagerPreset.id)} className="border border-sky-400/50 bg-sky-500/10 px-2 py-1 text-[10px] uppercase tracking-widest text-sky-200">
                      Slot-Zufall
                    </button>
                    <button type="button" onClick={() => { const next = [selectedManagerPreset.id, ...normalizedWheelPresetOrder.filter((id) => id !== selectedManagerPreset.id)]; persistWheelOrder(next); }} className="border border-fuchsia-400/50 bg-fuchsia-500/10 px-2 py-1 text-[10px] uppercase tracking-widest text-fuchsia-200">
                      Auf Rad 1
                    </button>
                  </div>

                  <details className="border border-neutral-800 bg-neutral-900/40 p-2">
                    <summary className="cursor-pointer text-[10px] uppercase tracking-widest text-neutral-400">Synth-/Meta-Parameter</summary>
                    <pre className="mt-2 max-h-56 overflow-auto whitespace-pre-wrap text-[10px] leading-relaxed text-neutral-400">{JSON.stringify({
                      grid: selectedManagerPreset.nexusPatch,
                      waveSoundPreset: selectedManagerPreset.waveSoundPreset,
                      waveSoundEnabled: selectedManagerPreset.waveSoundEnabled,
                      waveSoundVolume: selectedManagerPreset.waveSoundVolume,
                      particlePreset: selectedManagerPreset.particlePreset,
                      dronePreset: selectedManagerPreset.dronePreset,
                      gridAllowedSteps: selectedManagerPreset.gridAllowedSteps,
                      agentEnabledSteps: selectedManagerPreset.agentEnabledSteps,
                      rootFollow: selectedManagerPreset.rootFollow,
                      materialTrack: selectedManagerPreset.materialTrack,
                      samples: selectedManagerPreset.samples,
                    }, null, 2)}</pre>
                  </details>

                  <div className="text-[10px] leading-relaxed text-neutral-500">
                    Eigene Meta-Presets sind im Schema vorbereitet; dieser Slice speichert zunächst Rad-Reihenfolge und Session-Zufall, noch keinen vollständigen Materialspur/RFL/Sample-Snapshot.
                  </div>
                </div>
              ) : (
                <div className="text-neutral-500">Kein Meta-Preset ausgewählt.</div>
              )}
            </div>
          </div>
        </div>
    </>
  );
}
