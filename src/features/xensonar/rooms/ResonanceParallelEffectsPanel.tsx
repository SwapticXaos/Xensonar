import { useEffect, useState, type Dispatch, type SetStateAction } from "react";
import type { ControlSchedulerMetrics } from "../../resonance/controlScheduler";
import type { TransientRuntimeSnapshot } from "../../resonance/transientRuntime";
import type { LiveMasterTelemetry } from "../../resonance/liveMastering";
import type { SchwarmMaterial, SwarmState } from "../../resonance/schwarmdeuter";
import {
  RESONANCE_CONTROL_PERF_MONITOR_EVENT,
  RESONANCE_TRANSIENT_RUNTIME_MONITOR_EVENT,
  type ResonanceControlPerfMonitorEvent,
  type ResonanceTransientRuntimeMonitorEvent,
} from "./resonanceRuntimeMonitorLiveChannel";
import type {
  CollectiveMemorySourceKey,
  CollectiveMemorySourcePatch,
  CollectiveMemoryUi,
  EnterHoldPsyFxUi,
  PsychedelicSpiralMonitor,
  PsychedelicSpiralSourceKey,
  PsychedelicSpiralSourcePatch,
  PsychedelicSpiralUi,
  SchwarmSourceKey,
  SchwarmSourcePatch,
  SchwarmUi,
} from "./resonanceFxDefaults";

type ResonanceParallelEffectsPanelProps = {
  collectiveMemoryEnabled: boolean;
  setCollectiveMemoryEnabled: (value: boolean) => void;
  collectiveMemoryWindow: number;
  setCollectiveMemoryWindow: (value: number) => void;
  collectiveMemoryUi: CollectiveMemoryUi;
  updateCollectiveMemoryUi: (key: CollectiveMemorySourceKey, patch: CollectiveMemorySourcePatch) => void;
  collectiveMemoryMonitor: { energy: number; brightness: number; harmonicRootHz: number; intervalTension: number } | null;
  formatHzCompact: (hz: number, decimals?: number) => string;
  psychedelicSpiralEnabled: boolean;
  setPsychedelicSpiralEnabled: (value: boolean) => void;
  psychedelicSpiralUi: PsychedelicSpiralUi;
  setPsychedelicSpiralUi: Dispatch<SetStateAction<PsychedelicSpiralUi>>;
  psychedelicSpiralFollow: number;
  setPsychedelicSpiralFollow: (value: number) => void;
  updatePsychedelicSpiralSource: (key: PsychedelicSpiralSourceKey, patch: PsychedelicSpiralSourcePatch) => void;
  psychedelicSpiralMonitor: PsychedelicSpiralMonitor;
  enterHoldPsyFxEnabled: boolean;
  setEnterHoldPsyFxEnabled: (value: boolean) => void;
  enterHoldPsyFxUi: EnterHoldPsyFxUi;
  setEnterHoldPsyFxUi: Dispatch<SetStateAction<EnterHoldPsyFxUi>>;
  schwarmEnabled: boolean;
  setSchwarmEnabled: (value: boolean) => void;
  schwarmUi: SchwarmUi;
  setSchwarmUi: Dispatch<SetStateAction<SchwarmUi>>;
  schwarmMaterialOptions: Array<{ value: SchwarmMaterial; label: string }>;
  controlPerfMonitor: ControlSchedulerMetrics;
  transientRuntimeMonitor: TransientRuntimeSnapshot;
  updateSchwarmSource: (key: SchwarmSourceKey, patch: SchwarmSourcePatch) => void;
  schwarmMonitor: SwarmState | null;
  liveMasteringEnabled: boolean;
  setLiveMasteringEnabled: (value: boolean) => void;
  liveMasteringStrength: number;
  setLiveMasteringStrength: (value: number) => void;
  liveMasteringGlue: number;
  setLiveMasteringGlue: (value: number) => void;
  liveMasteringAir: number;
  setLiveMasteringAir: (value: number) => void;
  liveMasterMonitor: LiveMasterTelemetry;
};

function ResonanceRuntimeMonitorReadout({
  initialControlPerfMonitor,
  initialTransientRuntimeMonitor,
}: {
  initialControlPerfMonitor: ControlSchedulerMetrics;
  initialTransientRuntimeMonitor: TransientRuntimeSnapshot;
}) {
  const [controlPerfMonitor, setControlPerfMonitor] = useState(initialControlPerfMonitor);
  const [transientRuntimeMonitor, setTransientRuntimeMonitor] = useState(initialTransientRuntimeMonitor);

  useEffect(() => {
    const handleControlPerfMonitor = (event: Event) => {
      setControlPerfMonitor((event as ResonanceControlPerfMonitorEvent).detail);
    };
    const handleTransientRuntimeMonitor = (event: Event) => {
      setTransientRuntimeMonitor((event as ResonanceTransientRuntimeMonitorEvent).detail);
    };

    window.addEventListener(RESONANCE_CONTROL_PERF_MONITOR_EVENT, handleControlPerfMonitor);
    window.addEventListener(RESONANCE_TRANSIENT_RUNTIME_MONITOR_EVENT, handleTransientRuntimeMonitor);
    return () => {
      window.removeEventListener(RESONANCE_CONTROL_PERF_MONITOR_EVENT, handleControlPerfMonitor);
      window.removeEventListener(RESONANCE_TRANSIENT_RUNTIME_MONITOR_EVENT, handleTransientRuntimeMonitor);
    };
  }, []);

  return (
    <>
      <div className="rounded border border-neutral-800 bg-neutral-950/40 px-2 py-2 text-[11px] text-neutral-500">
        Control Load <span className="text-neutral-300">{(controlPerfMonitor.workRatio * 100).toFixed(0)}%</span> · {controlPerfMonitor.taskRuns} Ticks/Window · {controlPerfMonitor.avgWorkMs.toFixed(2)}ms Arbeit/Frame
      </div>
      <div className="rounded border border-neutral-800 bg-neutral-950/40 px-2 py-2 text-[11px] text-neutral-500">
        Transienten <span className="text-neutral-300">{transientRuntimeMonitor.activeVoices}/{transientRuntimeMonitor.hardLimit}</span> · Load <span className="text-neutral-300">{(transientRuntimeMonitor.load * 100).toFixed(0)}%</span> · Drop <span className="text-neutral-300">{transientRuntimeMonitor.droppedVoices}</span> · Send-Trims <span className="text-neutral-300">{transientRuntimeMonitor.gatedSends}</span>
      </div>
    </>
  );
}

export function ResonanceParallelEffectsPanel({
  collectiveMemoryEnabled,
  setCollectiveMemoryEnabled,
  collectiveMemoryWindow,
  setCollectiveMemoryWindow,
  collectiveMemoryUi,
  updateCollectiveMemoryUi,
  collectiveMemoryMonitor,
  formatHzCompact,
  psychedelicSpiralEnabled,
  setPsychedelicSpiralEnabled,
  psychedelicSpiralUi,
  setPsychedelicSpiralUi,
  psychedelicSpiralFollow,
  setPsychedelicSpiralFollow,
  updatePsychedelicSpiralSource,
  psychedelicSpiralMonitor,
  enterHoldPsyFxEnabled,
  setEnterHoldPsyFxEnabled,
  enterHoldPsyFxUi,
  setEnterHoldPsyFxUi,
  schwarmEnabled,
  setSchwarmEnabled,
  schwarmUi,
  setSchwarmUi,
  schwarmMaterialOptions,
  controlPerfMonitor,
  transientRuntimeMonitor,
  updateSchwarmSource,
  schwarmMonitor,
  liveMasteringEnabled,
  setLiveMasteringEnabled,
  liveMasteringStrength,
  setLiveMasteringStrength,
  liveMasteringGlue,
  setLiveMasteringGlue,
  liveMasteringAir,
  setLiveMasteringAir,
  liveMasterMonitor,
}: ResonanceParallelEffectsPanelProps) {
  return (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-neutral-900/50 p-4 border border-neutral-800 flex flex-col gap-3">
                  <h3 className="text-[10px] text-neutral-500 uppercase tracking-widest mb-1 border-b border-neutral-800 pb-1">Collective Memory · Harmonic</h3>
                  <div className="grid grid-cols-2 gap-2 items-end">
                    <label className="flex items-center gap-2 cursor-pointer text-sm text-neutral-300"><input type="checkbox" checked={collectiveMemoryEnabled} onChange={(e) => setCollectiveMemoryEnabled(e.target.checked)} />Effektgerät aktiv</label>
                    <div>
                      <label className="block text-xs text-neutral-400 mb-1">Memory-Fenster: {collectiveMemoryWindow.toFixed(1)}s</label>
                      <input type="range" min="2" max="16" step="0.5" value={collectiveMemoryWindow} onChange={(e) => setCollectiveMemoryWindow(parseFloat(e.target.value))} className="w-full cursor-pointer" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {([
                      ["drone", "Drone"],
                      ["particles", "Partikel"],
                      ["waves", "Wellenstarter"],
                      ["myzel", "Myzel"],
                    ] as const).map(([key, label]) => {
                      const cfg = collectiveMemoryUi[key];
                      return (
                        <div key={key} className="border border-neutral-800 bg-neutral-950/50 p-2 flex flex-col gap-2">
                          <label className="flex items-center gap-2 cursor-pointer text-sm text-neutral-300"><input type="checkbox" checked={cfg.enabled} onChange={(e) => updateCollectiveMemoryUi(key, { enabled: e.target.checked })} />{label}</label>
                          <div>
                            <label className="block text-[11px] text-neutral-500 mb-1">Send {(cfg.send * 100).toFixed(0)}%</label>
                            <input type="range" min="0" max="1.2" step="0.01" value={cfg.send} onChange={(e) => updateCollectiveMemoryUi(key, { send: parseFloat(e.target.value) })} className="w-full cursor-pointer" />
                          </div>
                          <div>
                            <label className="block text-[11px] text-neutral-500 mb-1">Wet {(cfg.wet * 100).toFixed(0)}%</label>
                            <input type="range" min="0" max="1" step="0.01" value={cfg.wet} onChange={(e) => updateCollectiveMemoryUi(key, { wet: parseFloat(e.target.value) })} className="w-full cursor-pointer" />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-[11px] text-neutral-500">
                    <div className="border border-neutral-800 bg-neutral-950/40 px-2 py-1">Energie <span className="text-neutral-300">{((collectiveMemoryMonitor?.energy ?? 0) * 100).toFixed(0)}%</span></div>
                    <div className="border border-neutral-800 bg-neutral-950/40 px-2 py-1">Helligkeit <span className="text-neutral-300">{((collectiveMemoryMonitor?.brightness ?? 0) * 100).toFixed(0)}%</span></div>
                    <div className="border border-neutral-800 bg-neutral-950/40 px-2 py-1">Root <span className="text-neutral-300">{collectiveMemoryMonitor ? formatHzCompact(collectiveMemoryMonitor.harmonicRootHz) : "—"}</span></div>
                    <div className="border border-neutral-800 bg-neutral-950/40 px-2 py-1">Spannung <span className="text-neutral-300">{((collectiveMemoryMonitor?.intervalTension ?? 0) * 100).toFixed(0)}%</span></div>
                  </div>
                  <div className="text-xs text-neutral-500">Das Gerät hört auf den Gesamtmix, bildet über einige Sekunden ein harmonisches Gedächtnis und färbt Drone, Partikel, Wellenstarter und Myzel als eigene Sends zurück in den Musik-Bus. Mehr Fenster = trägeres Erinnern, kleinere Fenster = reaktiver.</div>
                </div>

                <div className="bg-neutral-900/50 p-4 border border-neutral-800 flex flex-col gap-3">
                  <h3 className="text-[10px] text-neutral-500 uppercase tracking-widest mb-1 border-b border-neutral-800 pb-1">Psychedelic Spiral · Parallelgerät</h3>
                  <div className="grid grid-cols-2 gap-2 items-end">
                    <label className="flex items-center gap-2 cursor-pointer text-sm text-neutral-300"><input type="checkbox" checked={psychedelicSpiralEnabled} onChange={(e) => setPsychedelicSpiralEnabled(e.target.checked)} />Spiralgerät aktiv</label>
                    <div className="text-[11px] text-neutral-500">Kritisch integriert: nicht als Master, sondern als kohärenter Parallelraum auf dem Space-Bus. Tastatur- und Rastersteuerung bleiben unberührt.</div>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    <div>
                      <label className="block text-xs text-neutral-400 mb-1">Drive {(psychedelicSpiralUi.drive * 100).toFixed(0)}%</label>
                      <input type="range" min="0" max="1" step="0.01" value={psychedelicSpiralUi.drive} onChange={(e) => setPsychedelicSpiralUi((prev) => ({ ...prev, drive: parseFloat(e.target.value) }))} className="w-full cursor-pointer" />
                    </div>
                    <div>
                      <label className="block text-xs text-neutral-400 mb-1">Color {(psychedelicSpiralUi.color * 100).toFixed(0)}%</label>
                      <input type="range" min="0" max="1" step="0.01" value={psychedelicSpiralUi.color} onChange={(e) => setPsychedelicSpiralUi((prev) => ({ ...prev, color: parseFloat(e.target.value) }))} className="w-full cursor-pointer" />
                    </div>
                    <div>
                      <label className="block text-xs text-neutral-400 mb-1">Motion {(psychedelicSpiralUi.motion * 100).toFixed(0)}%</label>
                      <input type="range" min="0" max="1" step="0.01" value={psychedelicSpiralUi.motion} onChange={(e) => setPsychedelicSpiralUi((prev) => ({ ...prev, motion: parseFloat(e.target.value) }))} className="w-full cursor-pointer" />
                    </div>
                    <div>
                      <label className="block text-xs text-neutral-400 mb-1">Feedback {(psychedelicSpiralUi.feedback * 100).toFixed(0)}%</label>
                      <input type="range" min="0" max="1" step="0.01" value={psychedelicSpiralUi.feedback} onChange={(e) => setPsychedelicSpiralUi((prev) => ({ ...prev, feedback: parseFloat(e.target.value) }))} className="w-full cursor-pointer" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    <div>
                      <label className="block text-xs text-neutral-400 mb-1">Bloom {(psychedelicSpiralUi.bloom * 100).toFixed(0)}%</label>
                      <input type="range" min="0" max="1" step="0.01" value={psychedelicSpiralUi.bloom} onChange={(e) => setPsychedelicSpiralUi((prev) => ({ ...prev, bloom: parseFloat(e.target.value) }))} className="w-full cursor-pointer" />
                    </div>
                    <div>
                      <label className="block text-xs text-neutral-400 mb-1">Mix {(psychedelicSpiralUi.mix * 100).toFixed(0)}%</label>
                      <input type="range" min="0.4" max="1" step="0.01" value={psychedelicSpiralUi.mix} onChange={(e) => setPsychedelicSpiralUi((prev) => ({ ...prev, mix: parseFloat(e.target.value) }))} className="w-full cursor-pointer" />
                    </div>
                    <div>
                      <label className="block text-xs text-neutral-400 mb-1">Breite {(psychedelicSpiralUi.stereoWidth * 100).toFixed(0)}%</label>
                      <input type="range" min="0" max="1" step="0.01" value={psychedelicSpiralUi.stereoWidth} onChange={(e) => setPsychedelicSpiralUi((prev) => ({ ...prev, stereoWidth: parseFloat(e.target.value) }))} className="w-full cursor-pointer" />
                    </div>
                    <div>
                      <label className="block text-xs text-neutral-400 mb-1">Follow {(psychedelicSpiralFollow * 100).toFixed(0)}%</label>
                      <input type="range" min="0" max="1" step="0.01" value={psychedelicSpiralFollow} onChange={(e) => setPsychedelicSpiralFollow(parseFloat(e.target.value))} className="w-full cursor-pointer" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {([
                      ["drone", "Drone"],
                      ["particles", "Partikel"],
                      ["waves", "Wellenstarter"],
                      ["myzel", "Myzel"],
                    ] as const).map(([key, label]) => {
                      const cfg = psychedelicSpiralUi[key];
                      return (
                        <div key={key} className="border border-neutral-800 bg-neutral-950/50 p-2 flex flex-col gap-2">
                          <label className="flex items-center gap-2 cursor-pointer text-sm text-neutral-300"><input type="checkbox" checked={cfg.enabled} onChange={(e) => updatePsychedelicSpiralSource(key, { enabled: e.target.checked })} />{label}</label>
                          <div>
                            <label className="block text-[11px] text-neutral-500 mb-1">Send {(cfg.send * 100).toFixed(0)}%</label>
                            <input type="range" min="0" max="1" step="0.01" value={cfg.send} onChange={(e) => updatePsychedelicSpiralSource(key, { send: parseFloat(e.target.value) })} className="w-full cursor-pointer" />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-[11px] text-neutral-500">
                    <div className="border border-neutral-800 bg-neutral-950/40 px-2 py-1">Drive <span className="text-neutral-300">{(psychedelicSpiralMonitor.drive * 100).toFixed(0)}%</span></div>
                    <div className="border border-neutral-800 bg-neutral-950/40 px-2 py-1">Motion <span className="text-neutral-300">{(psychedelicSpiralMonitor.motion * 100).toFixed(0)}%</span></div>
                    <div className="border border-neutral-800 bg-neutral-950/40 px-2 py-1">Bloom <span className="text-neutral-300">{(psychedelicSpiralMonitor.bloom * 100).toFixed(0)}%</span></div>
                    <div className="border border-neutral-800 bg-neutral-950/40 px-2 py-1">Breite <span className="text-neutral-300">{(psychedelicSpiralMonitor.width * 100).toFixed(0)}%</span></div>
                  </div>
                  <div className="text-xs text-neutral-500">Das Spiralgerät sitzt als modulare Parallelstufe auf dem Space-Bus. Es sammelt je nach Send-Anteilen Drone, Partikel, Wellenstarter und Myzel ein und bleibt dadurch kohärent mit Raum III, statt als globaler Master-Matsch alles gleich zu färben.</div>
                </div>

                <div className="bg-neutral-900/50 p-4 border border-neutral-800 flex flex-col gap-3">
                  <h3 className="text-[10px] text-neutral-500 uppercase tracking-widest mb-1 border-b border-neutral-800 pb-1">Enter Hold · Psy Pulse Phaser</h3>
                  <div className="flex items-center justify-between gap-3">
                    <label className="flex items-center gap-2 cursor-pointer text-sm text-neutral-300"><input type="checkbox" checked={enterHoldPsyFxEnabled} onChange={(e) => setEnterHoldPsyFxEnabled(e.target.checked)} />Gerät aktiv</label>
                    <div className="text-xs text-neutral-500">wirkt nur solange <span className="text-neutral-300">Enter</span> gehalten wird</div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs text-neutral-400 mb-1">Depth {(enterHoldPsyFxUi.depth * 100).toFixed(0)}%</label>
                      <input type="range" min="0" max="1" step="0.01" value={enterHoldPsyFxUi.depth} onChange={(e) => setEnterHoldPsyFxUi((prev) => ({ ...prev, depth: parseFloat(e.target.value) }))} className="w-full cursor-pointer" />
                    </div>
                    <div>
                      <label className="block text-xs text-neutral-400 mb-1">Color {(enterHoldPsyFxUi.color * 100).toFixed(0)}%</label>
                      <input type="range" min="0" max="1" step="0.01" value={enterHoldPsyFxUi.color} onChange={(e) => setEnterHoldPsyFxUi((prev) => ({ ...prev, color: parseFloat(e.target.value) }))} className="w-full cursor-pointer" />
                    </div>
                    <div>
                      <label className="block text-xs text-neutral-400 mb-1">Flicker {(enterHoldPsyFxUi.flicker * 100).toFixed(0)}%</label>
                      <input type="range" min="0" max="1" step="0.01" value={enterHoldPsyFxUi.flicker} onChange={(e) => setEnterHoldPsyFxUi((prev) => ({ ...prev, flicker: parseFloat(e.target.value) }))} className="w-full cursor-pointer" />
                    </div>
                    <div>
                      <label className="block text-xs text-neutral-400 mb-1">Mix {(enterHoldPsyFxUi.mix * 100).toFixed(0)}%</label>
                      <input type="range" min="0" max="1" step="0.01" value={enterHoldPsyFxUi.mix} onChange={(e) => setEnterHoldPsyFxUi((prev) => ({ ...prev, mix: parseFloat(e.target.value) }))} className="w-full cursor-pointer" />
                    </div>
                    <div>
                      <label className="block text-xs text-neutral-400 mb-1">Bass Motion {(enterHoldPsyFxUi.bassMotion * 100).toFixed(0)}%</label>
                      <input type="range" min="0" max="1" step="0.01" value={enterHoldPsyFxUi.bassMotion} onChange={(e) => setEnterHoldPsyFxUi((prev) => ({ ...prev, bassMotion: parseFloat(e.target.value) }))} className="w-full cursor-pointer" />
                    </div>
                    <div>
                      <label className="block text-xs text-neutral-400 mb-1">Output {(enterHoldPsyFxUi.outputGain * 100).toFixed(0)}%</label>
                      <input type="range" min="0.3" max="1.4" step="0.01" value={enterHoldPsyFxUi.outputGain} onChange={(e) => setEnterHoldPsyFxUi((prev) => ({ ...prev, outputGain: parseFloat(e.target.value) }))} className="w-full cursor-pointer" />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="rounded border border-neutral-800 bg-neutral-950/50 p-3">
                      <label className="block text-xs text-neutral-400 mb-1">Wave Send {(enterHoldPsyFxUi.waveSend * 100).toFixed(0)}%</label>
                      <input type="range" min="0" max="1" step="0.01" value={enterHoldPsyFxUi.waveSend} onChange={(e) => setEnterHoldPsyFxUi((prev) => ({ ...prev, waveSend: parseFloat(e.target.value) }))} className="w-full cursor-pointer" />
                    </div>
                    <div className="rounded border border-neutral-800 bg-neutral-950/50 p-3">
                      <label className="flex items-center gap-2 cursor-pointer text-sm text-neutral-300 mb-1"><input type="checkbox" checked={enterHoldPsyFxUi.bassLink} onChange={(e) => setEnterHoldPsyFxUi((prev) => ({ ...prev, bassLink: e.target.checked }))} />Bass mitnehmen</label>
                      <label className="block text-xs text-neutral-400 mb-1">Bass Send {(enterHoldPsyFxUi.bassSend * 100).toFixed(0)}%</label>
                      <input type="range" min="0" max="1" step="0.01" value={enterHoldPsyFxUi.bassSend} onChange={(e) => setEnterHoldPsyFxUi((prev) => ({ ...prev, bassSend: parseFloat(e.target.value) }))} className="w-full cursor-pointer" />
                    </div>
                  </div>
                  <div className="text-xs text-neutral-500">Enter bleibt weiter der normale Ringwellen-Trigger. Solange die Taste gehalten wird, bekommen Wellenstarter einen tempo-synchronen Psy-Pulse-Phaser; der Bass kann optional in einer dunkleren, weniger hektischen Variante mitlaufen.</div>
                </div>

                <div className="bg-neutral-900/50 p-4 border border-neutral-800 flex flex-col gap-3">
                  <h3 className="text-[10px] text-neutral-500 uppercase tracking-widest mb-1 border-b border-neutral-800 pb-1">Schwarmdeuter · Particle Body Reader</h3>
                  <div className="grid grid-cols-2 gap-2 items-end">
                    <label className="flex items-center gap-2 cursor-pointer text-sm text-neutral-300"><input type="checkbox" checked={schwarmEnabled} onChange={(e) => setSchwarmEnabled(e.target.checked)} />Schwarmdeuter aktiv</label>
                    <div className="text-[11px] text-neutral-500">Läuft nur, wenn aktivierte Quellen wirklich Send haben. Partikelzustand wird gelesen, Audio bleibt als modulare Parallelstufe patchbar.</div>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-xs text-neutral-400 mb-1">Amount {(schwarmUi.amount * 100).toFixed(0)}%</label>
                      <input type="range" min="0" max="1" step="0.01" value={schwarmUi.amount} onChange={(e) => setSchwarmUi((prev) => ({ ...prev, amount: parseFloat(e.target.value) }))} className="w-full cursor-pointer" />
                    </div>
                    <div>
                      <label className="block text-xs text-neutral-400 mb-1">Interpretation {(schwarmUi.interpretiveBias * 100).toFixed(0)}%</label>
                      <input type="range" min="0" max="1" step="0.01" value={schwarmUi.interpretiveBias} onChange={(e) => setSchwarmUi((prev) => ({ ...prev, interpretiveBias: parseFloat(e.target.value) }))} className="w-full cursor-pointer" />
                    </div>
                    <div>
                      <label className="block text-xs text-neutral-400 mb-1">Sensitivity {(schwarmUi.sensitivity * 100).toFixed(0)}%</label>
                      <input type="range" min="0" max="1" step="0.01" value={schwarmUi.sensitivity} onChange={(e) => setSchwarmUi((prev) => ({ ...prev, sensitivity: parseFloat(e.target.value) }))} className="w-full cursor-pointer" />
                    </div>
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    <div>
                      <label className="block text-xs text-neutral-400 mb-1">Memory {schwarmUi.memorySeconds.toFixed(1)}s</label>
                      <input type="range" min="0.6" max="4" step="0.1" value={schwarmUi.memorySeconds} onChange={(e) => setSchwarmUi((prev) => ({ ...prev, memorySeconds: parseFloat(e.target.value) }))} className="w-full cursor-pointer" />
                    </div>
                    <div>
                      <label className="block text-xs text-neutral-400 mb-1">Density {(schwarmUi.densityBias * 100).toFixed(0)}%</label>
                      <input type="range" min="0" max="1" step="0.01" value={schwarmUi.densityBias} onChange={(e) => setSchwarmUi((prev) => ({ ...prev, densityBias: parseFloat(e.target.value) }))} className="w-full cursor-pointer" />
                    </div>
                    <div>
                      <label className="block text-xs text-neutral-400 mb-1">Weave {(schwarmUi.weave * 100).toFixed(0)}%</label>
                      <input type="range" min="0" max="1" step="0.01" value={schwarmUi.weave} onChange={(e) => setSchwarmUi((prev) => ({ ...prev, weave: parseFloat(e.target.value) }))} className="w-full cursor-pointer" />
                    </div>
                    <div>
                      <label className="block text-xs text-neutral-400 mb-1">Update {Math.round(schwarmUi.updateMs)}ms</label>
                      <input type="range" min="80" max="260" step="10" value={schwarmUi.updateMs} onChange={(e) => setSchwarmUi((prev) => ({ ...prev, updateMs: parseFloat(e.target.value) }))} className="w-full cursor-pointer" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 items-end">
                    <div>
                      <label className="block text-xs text-neutral-400 mb-1">Material</label>
                      <select value={schwarmUi.material} onChange={(e) => setSchwarmUi((prev) => ({ ...prev, material: e.target.value as SchwarmMaterial }))} className="w-full bg-neutral-950 border border-neutral-700 p-1 text-sm text-neutral-300">
                        {schwarmMaterialOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                      </select>
                    </div>
                    <ResonanceRuntimeMonitorReadout
                      initialControlPerfMonitor={controlPerfMonitor}
                      initialTransientRuntimeMonitor={transientRuntimeMonitor}
                    />
                  </div>
                  <div className="rounded border border-neutral-800 bg-neutral-950/40 p-2">
                    <div className="mb-2 text-[10px] uppercase tracking-widest text-neutral-500">Schwarm Quellen</div>
                    <div className="grid grid-cols-2 gap-2">
                      {([
                        ["drone", "Drone"],
                        ["particles", "Partikel"],
                        ["waves", "Wellenstarter"],
                        ["myzel", "Myzel"],
                      ] as const).map(([key, label]) => {
                        const cfg = schwarmUi[key];
                        return (
                          <div key={key} className="rounded border border-neutral-800 bg-neutral-950/50 p-2">
                            <label className="mb-1 flex items-center gap-2 text-xs text-neutral-300">
                              <input type="checkbox" checked={cfg.enabled} onChange={(e) => updateSchwarmSource(key, { enabled: e.target.checked })} />
                              <span>{label}</span>
                              <span className="ml-auto text-[10px] text-neutral-500">{(cfg.send * 100).toFixed(0)}%</span>
                            </label>
                            <input type="range" min="0" max="1" step="0.01" value={cfg.send} onChange={(e) => updateSchwarmSource(key, { send: parseFloat(e.target.value) })} className="w-full cursor-pointer" />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-[11px] text-neutral-500">
                    <div className="border border-neutral-800 bg-neutral-950/40 px-2 py-1">Kohäsion <span className="text-neutral-300">{((schwarmMonitor?.descriptors.cohesion ?? 0) * 100).toFixed(0)}%</span></div>
                    <div className="border border-neutral-800 bg-neutral-950/40 px-2 py-1">Turbulenz <span className="text-neutral-300">{((schwarmMonitor?.descriptors.turbulence ?? 0) * 100).toFixed(0)}%</span></div>
                    <div className="border border-neutral-800 bg-neutral-950/40 px-2 py-1">Kristall <span className="text-neutral-300">{((schwarmMonitor?.descriptors.crystallization ?? 0) * 100).toFixed(0)}%</span></div>
                    <div className="border border-neutral-800 bg-neutral-950/40 px-2 py-1">Druck <span className="text-neutral-300">{((schwarmMonitor?.descriptors.pressure ?? 0) * 100).toFixed(0)}%</span></div>
                  </div>
                  <div className="text-xs text-neutral-500">Der Schwarmdeuter liest Agenten- und Partikelzustände, nicht nur das Audiosignal. So bleibt die Interpretation an Bewegung, Dichte und Wiederkehr gekoppelt. Zugleich ist er als eigene Parallelstufe abschaltbar und per Update-Intervall zügelbar.</div>
                </div>

                <div className="bg-neutral-900/50 p-4 border border-neutral-800 flex flex-col gap-3">
                  <h3 className="text-[10px] text-neutral-500 uppercase tracking-widest mb-1 border-b border-neutral-800 pb-1">Live Mastering · Bus Glue</h3>
                  <div className="grid grid-cols-2 gap-2 items-end">
                    <label className="flex items-center gap-2 cursor-pointer text-sm text-neutral-300"><input type="checkbox" checked={liveMasteringEnabled} onChange={(e) => setLiveMasteringEnabled(e.target.checked)} />Live-Mastering aktiv</label>
                    <div className="text-[11px] text-neutral-500">Kritisch übernommen: der Bus-Gedanke taugt, aber hier als vorsichtiger Insert zwischen Sammelbussen und Endstufe, damit Routing und Tastatursteuerung stabil bleiben.</div>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-xs text-neutral-400 mb-1">Balance {(liveMasteringStrength * 100).toFixed(0)}%</label>
                      <input type="range" min="0" max="1" step="0.01" value={liveMasteringStrength} onChange={(e) => setLiveMasteringStrength(parseFloat(e.target.value))} className="w-full cursor-pointer" />
                    </div>
                    <div>
                      <label className="block text-xs text-neutral-400 mb-1">Glue {(liveMasteringGlue * 100).toFixed(0)}%</label>
                      <input type="range" min="0" max="1" step="0.01" value={liveMasteringGlue} onChange={(e) => setLiveMasteringGlue(parseFloat(e.target.value))} className="w-full cursor-pointer" />
                    </div>
                    <div>
                      <label className="block text-xs text-neutral-400 mb-1">Air {(liveMasteringAir * 100).toFixed(0)}%</label>
                      <input type="range" min="0" max="1" step="0.01" value={liveMasteringAir} onChange={(e) => setLiveMasteringAir(parseFloat(e.target.value))} className="w-full cursor-pointer" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-[11px] text-neutral-500">
                    <div className="border border-neutral-800 bg-neutral-950/40 px-2 py-1">Main <span className="text-neutral-300">{(liveMasterMonitor.main * 100).toFixed(0)}%</span></div>
                    <div className="border border-neutral-800 bg-neutral-950/40 px-2 py-1">Drone <span className="text-neutral-300">{(liveMasterMonitor.drone * 100).toFixed(0)}%</span></div>
                    <div className="border border-neutral-800 bg-neutral-950/40 px-2 py-1">Rhythm <span className="text-neutral-300">{(liveMasterMonitor.rhythm * 100).toFixed(0)}%</span></div>
                    <div className="border border-neutral-800 bg-neutral-950/40 px-2 py-1">Space <span className="text-neutral-300">{(liveMasterMonitor.space * 100).toFixed(0)}%</span></div>
                    <div className="border border-neutral-800 bg-neutral-950/40 px-2 py-1">Trim <span className="text-neutral-300">{(liveMasterMonitor.trim * 100).toFixed(0)}%</span></div>
                  </div>
                  <div className="text-xs text-neutral-500">Drone, Rhythmus und Space laufen in getrennte Sammelpfade, werden dort sanft balanciert und erst dann in Clip/Limiter geschoben. Drums bleiben beim Stem-Recording weiter separat; die Tastatur- und Fenstersteuerung wurde nicht angerührt.</div>
                </div>


              </div>
  );
}
