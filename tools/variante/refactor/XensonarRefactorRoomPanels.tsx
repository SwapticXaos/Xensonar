import type { Dispatch, SetStateAction } from "react";
import {
  BP_MODES,
  MODE_LABELS,
  WESTERN_MODES,
  ensureStepOffsetArray,
  getRowCount,
  getTuningSteps,
} from "./music";
import type { Direction, DronePreset, Mode, Params, ParticlePreset, Tuning } from "./types";

type HeaderProps = {
  title: string;
  powered: boolean;
  recording: boolean;
  onTogglePower: () => void;
  onRipple: () => void;
  onPulse: (direction: Direction) => void;
  onToggleRecording: () => void;
};

export function XensonarRefactorHeader({
  title,
  powered,
  recording,
  onTogglePower,
  onRipple,
  onPulse,
  onToggleRecording,
}: HeaderProps) {
  return (
    <div className="border border-violet-900/60 bg-black/90 rounded-2xl p-5 shadow-[0_0_24px_rgba(120,80,255,0.14)]">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-wide text-violet-200">{title}</h1>
          <p className="text-sm text-neutral-400 max-w-3xl mt-2">
            Resonanzraum aus cursor-gelenkter Agentenbewegung, mikrotönigem Raster, Klick-Ripples, gerichteten Pulswellen
            und Drone-Fundament. V1.1 setzt auf freiere Strömung statt Kessel-Drift und hält die Claims ehrlicher.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={onTogglePower}
            aria-pressed={powered}
            className={`group relative h-14 min-w-[184px] overflow-hidden rounded-2xl border px-4 transition ${
              powered
                ? "border-violet-300 bg-[linear-gradient(135deg,rgba(91,33,182,0.96),rgba(76,29,149,0.92),rgba(15,23,42,0.96))] text-white shadow-[0_0_28px_rgba(167,139,250,0.34)]"
                : "border-fuchsia-500/70 bg-[linear-gradient(135deg,rgba(12,10,24,0.96),rgba(44,12,62,0.98),rgba(16,10,32,0.98))] text-fuchsia-50 shadow-[0_0_28px_rgba(236,72,153,0.18)] hover:border-fuchsia-300 hover:shadow-[0_0_38px_rgba(236,72,153,0.28)]"
            }`}
          >
            <span
              aria-hidden="true"
              className={`pointer-events-none absolute inset-0 ${
                powered
                  ? "bg-[radial-gradient(circle_at_24%_35%,rgba(255,255,255,0.24),transparent_34%),radial-gradient(circle_at_80%_30%,rgba(196,181,253,0.18),transparent_26%)]"
                  : "bg-[radial-gradient(circle_at_20%_35%,rgba(251,191,36,0.18),transparent_22%),radial-gradient(circle_at_78%_32%,rgba(244,114,182,0.22),transparent_28%),radial-gradient(circle_at_50%_115%,rgba(56,189,248,0.16),transparent_30%)]"
              }`}
            />
            <span className="relative flex items-center gap-3 text-left">
              <span
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border text-lg ${
                  powered
                    ? "border-violet-200/70 bg-white/12 shadow-[0_0_16px_rgba(255,255,255,0.18)]"
                    : "border-amber-300/70 bg-amber-400/12 text-amber-100 shadow-[0_0_18px_rgba(251,191,36,0.3)] animate-pulse"
                }`}
              >
                ⏻
              </span>
              <span className="flex min-w-0 flex-col leading-tight">
                <span className={`text-[10px] uppercase tracking-[0.3em] ${powered ? "text-violet-100/70" : "text-fuchsia-200/70"}`}>
                  {powered ? "Maschine aktiv" : "Maschine aus"}
                </span>
                <span className="text-sm font-semibold tracking-[0.08em]">
                  {powered ? "Power · ON" : "⏻ Zündung starten"}
                </span>
              </span>
            </span>
          </button>
          <button onClick={onRipple} className="px-4 h-11 rounded-xl border border-neutral-700 bg-neutral-900 hover:bg-neutral-800">
            Ripple
          </button>
          <button onClick={() => onPulse("left")} className="px-4 h-11 rounded-xl border border-neutral-700 bg-neutral-900 hover:bg-neutral-800">
            Y ←
          </button>
          <button onClick={() => onPulse("right")} className="px-4 h-11 rounded-xl border border-neutral-700 bg-neutral-900 hover:bg-neutral-800">
            X →
          </button>
          <button onClick={() => onPulse("up")} className="px-4 h-11 rounded-xl border border-neutral-700 bg-neutral-900 hover:bg-neutral-800">
            C ↑
          </button>
          <button onClick={() => onPulse("down")} className="px-4 h-11 rounded-xl border border-neutral-700 bg-neutral-900 hover:bg-neutral-800">
            V ↓
          </button>
          <button
            onClick={onToggleRecording}
            className={`px-4 h-11 rounded-xl border ${recording ? "border-red-500 bg-red-950/60" : "border-neutral-700 bg-neutral-900 hover:bg-neutral-800"}`}
          >
            {recording ? "Stop Rec" : "Rec"}
          </button>
        </div>
      </div>
    </div>
  );
}

type ControlPanelsProps = {
  params: Params;
  setParams: Dispatch<SetStateAction<Params>>;
  showLabels: boolean;
  setShowLabels: Dispatch<SetStateAction<boolean>>;
  status: string;
  lastEvent: string;
  enabledCount: number;
  cursorStepUi: number;
  rootStepUi: number;
  astralActiveUi: boolean;
  astralXUi: number;
  recordingUrl: string | null;
  onQuickMode: (mode: Mode) => void;
};

function getTotalRows(params: Params) {
  return getRowCount(params.tuning) * (params.tuning === "bp" ? 3 : 4);
}

export function XensonarRefactorControlPanels({
  params,
  setParams,
  showLabels,
  setShowLabels,
  status,
  lastEvent,
  enabledCount,
  cursorStepUi,
  rootStepUi,
  astralActiveUi,
  astralXUi,
  recordingUrl,
  onQuickMode,
}: ControlPanelsProps) {
  const activeModeButtons = params.tuning === "bp" ? BP_MODES : WESTERN_MODES;

  return (
    <div className="space-y-4">
      <div className="border border-neutral-800 bg-black rounded-2xl p-4 space-y-3">
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div><div className="text-neutral-500">Status</div><div className="text-violet-200">{status}</div></div>
          <div><div className="text-neutral-500">Letztes Ereignis</div><div className="text-violet-100">{lastEvent}</div></div>
          <div><div className="text-neutral-500">Aktive Agenten</div><div>{enabledCount}</div></div>
          <div><div className="text-neutral-500">Cursor-Stufe</div><div>{cursorStepUi}/{getTotalRows(params) - 1}</div></div>
          <div><div className="text-neutral-500">Cursor-Modus</div><div>{astralActiveUi ? "Astral / Keyboard" : "Maus"}</div></div>
          <div><div className="text-neutral-500">Ripple-Root</div><div>{rootStepUi}/{getTotalRows(params) - 1}</div></div>
          <div><div className="text-neutral-500">Geist-X</div><div>{Math.round(astralXUi)} px</div></div>
          <div><div className="text-neutral-500">Key-Fenster</div><div>{params.keyboardWindowStart}–{params.keyboardWindowStart + 19}</div></div>
          <div><div className="text-neutral-500">Raster-Stufen/Oktave</div><div>{getTuningSteps(params.tuning)}</div></div>
        </div>
        {recordingUrl && (
          <div className="pt-2">
            <audio controls src={recordingUrl} className="w-full" />
            <a className="text-sm text-violet-300 underline" href={recordingUrl} download="xensonar-recording.webm">Recording herunterladen</a>
          </div>
        )}
      </div>

      <div className="border border-neutral-800 bg-black rounded-2xl p-4 space-y-4">
        <div>
          <label className="text-sm text-neutral-400">Tuning</label>
          <select className="mt-1 w-full bg-neutral-900 border border-neutral-700 rounded-xl px-3 py-2" value={params.tuning} onChange={(e) => setParams((prev) => ({ ...prev, tuning: e.target.value as Tuning }))}>
            <option value="12edo">12-EDO</option>
            <option value="19edo">19-EDO</option>
            <option value="31edo">31-EDO</option>
            <option value="bp">Bohlen-Pierce</option>
          </select>
        </div>
        <div>
          <label className="text-sm text-neutral-400">Mode</label>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {activeModeButtons.map((m) => (
              <button key={m} onClick={() => onQuickMode(m)} className={`px-3 py-2 rounded-xl border text-sm ${params.mode === m ? "border-violet-400 bg-violet-950/60 text-violet-100" : "border-neutral-700 bg-neutral-900"}`}>
                {MODE_LABELS[m] ?? m}
              </button>
            ))}
          </div>
        </div>
        <SelectControl label="Particle Preset" value={params.particlePreset} onChange={(value) => setParams((prev) => ({ ...prev, particlePreset: value as ParticlePreset }))} options={[
          ["glass_ping", "Glass Ping"], ["soft_pluck", "Soft Pluck"], ["fm_bell", "FM Bell"], ["marimba", "Marimba"], ["crystal_bowl", "Crystal Bowl"], ["woodblock", "Woodblock"],
        ]} />
        <SelectControl label="Drone Preset" value={params.dronePreset} onChange={(value) => setParams((prev) => ({ ...prev, dronePreset: value as DronePreset }))} options={[
          ["warm_pad", "Warm Pad"], ["reed_drone", "Reed Drone"], ["pulse_matrix", "Pulse Matrix"], ["dark_sub", "Dark Sub"], ["ethereal_halo", "Ethereal Halo"],
        ]} />
        <SelectControl label="Ripple Falloff" value={params.rippleFalloff} onChange={(value) => setParams((prev) => ({ ...prev, rippleFalloff: value as Params["rippleFalloff"] }))} options={[
          ["linear", "Linear"], ["abrupt", "Abrupt"], ["bell", "Bell Curve"], ["late", "Late Falloff"], ["exponential", "Exponential"],
        ]} />
        <SelectControl label="Grid Perspective" value={params.gridPerspective} onChange={(value) => setParams((prev) => ({ ...prev, gridPerspective: value as Params["gridPerspective"] }))} options={[["natural", "Natural Octaves"], ["equalized", "Equalized View"]]} />
        <SelectControl label="YXCV Mode" value={params.pulseMode} onChange={(value) => setParams((prev) => ({ ...prev, pulseMode: value as Params["pulseMode"] }))} options={[["line", "Line Pulse"], ["sector", "Sector Wave (todo-lite)"]]} />
      </div>

      <div className="border border-neutral-800 bg-black rounded-2xl p-4 space-y-3">
        <Slider label="Tonic Hz" value={params.tonicHz} min={55} max={440} step={1} onChange={(v) => setParams((prev) => ({ ...prev, tonicHz: v }))} />
        <Slider label="Master Volume" value={params.masterVolume} min={0} max={1} step={0.01} onChange={(v) => setParams((prev) => ({ ...prev, masterVolume: v }))} />
        <Slider label="Drift / Orbit" value={params.drift} min={0} max={1} step={0.01} onChange={(v) => setParams((prev) => ({ ...prev, drift: v }))} />
        <Slider label="Cursor Attraction" value={params.cursorAttraction} min={0.005} max={0.12} step={0.001} onChange={(v) => setParams((prev) => ({ ...prev, cursorAttraction: v }))} />
        <Slider label="Ripple Strength" value={params.rippleStrength} min={0} max={2} step={0.01} onChange={(v) => setParams((prev) => ({ ...prev, rippleStrength: v }))} />
        <Slider label="Ripple Width" value={params.rippleWidth} min={8} max={80} step={1} onChange={(v) => setParams((prev) => ({ ...prev, rippleWidth: v }))} />
        <Slider label="Ripple Radius" value={params.rippleRadius} min={40} max={560} step={1} onChange={(v) => setParams((prev) => ({ ...prev, rippleRadius: v }))} />
        <Slider label="Ripple Speed" value={params.rippleSpeed} min={80} max={520} step={1} onChange={(v) => setParams((prev) => ({ ...prev, rippleSpeed: v }))} />
        <Slider label="Density" value={params.density} min={8} max={48} step={1} onChange={(v) => setParams((prev) => ({ ...prev, density: v }))} />
        <Slider label="Quantize BPM" value={params.quantizeBpm} min={40} max={180} step={1} onChange={(v) => setParams((prev) => ({ ...prev, quantizeBpm: v }))} />
        <Slider label="Echo Feedback" value={params.echoFeedback} min={0} max={0.85} step={0.01} onChange={(v) => setParams((prev) => ({ ...prev, echoFeedback: v }))} />
        <Slider label="Echo Mix" value={params.echoMix} min={0} max={0.9} step={0.01} onChange={(v) => setParams((prev) => ({ ...prev, echoMix: v }))} />
        <Slider label="Trail Length" value={params.trailLength} min={4} max={72} step={1} onChange={(v) => setParams((prev) => ({ ...prev, trailLength: v }))} />
        <Slider label="Mode Mask" value={params.modeMaskStrength} min={0} max={1} step={0.01} onChange={(v) => setParams((prev) => ({ ...prev, modeMaskStrength: v }))} />
        <Slider label="Shimmer" value={params.shimmer} min={0} max={1} step={0.01} onChange={(v) => setParams((prev) => ({ ...prev, shimmer: v }))} />
      </div>

      <div className="border border-neutral-800 bg-black rounded-2xl p-4 grid grid-cols-2 gap-2 text-sm">
        <Toggle label="Grid Snap" value={params.gridSnap} onChange={(v) => setParams((prev) => ({ ...prev, gridSnap: v }))} />
        <Toggle label="Quantize" value={params.quantizeOn} onChange={(v) => setParams((prev) => ({ ...prev, quantizeOn: v }))} />
        <Toggle label="Echo" value={params.echoOn} onChange={(v) => setParams((prev) => ({ ...prev, echoOn: v }))} />
        <Toggle label="Drone" value={params.droneOn} onChange={(v) => setParams((prev) => ({ ...prev, droneOn: v }))} />
        <Toggle label="Trails" value={params.trailOn} onChange={(v) => setParams((prev) => ({ ...prev, trailOn: v }))} />
        <Toggle label="Input Indicator" value={params.inputIndicator} onChange={(v) => setParams((prev) => ({ ...prev, inputIndicator: v }))} />
        <Toggle label="Grid Triangles" value={params.showGridTriangles} onChange={(v) => setParams((prev) => ({ ...prev, showGridTriangles: v }))} />
        <Toggle label="Labels" value={showLabels} onChange={setShowLabels} />
      </div>

      <div className="border border-neutral-800 bg-black rounded-2xl p-4 text-xs text-neutral-300 flex items-center justify-between gap-3">
        <div>Links auf die Dreiecke klicken = Step mute/unmute. Ziehen = Mikro-Offset pro Rasterstufe.</div>
        <button onClick={() => setParams((prev) => ({ ...prev, manualMutedSteps: [], manualStepOffsets: ensureStepOffsetArray(prev.tuning, []).map(() => 0) }))} className="px-3 py-2 rounded-xl border border-neutral-700 bg-neutral-900 hover:bg-neutral-800">
          Raster Reset
        </button>
      </div>

      <div className="border border-amber-900/40 bg-amber-950/20 rounded-2xl p-4 text-xs text-amber-100/90 space-y-2">
        <p><strong>Hinweis:</strong> Quantize Grid bleibt in V1.1 bewusst verborgen, solange es noch keinen Drumbeat / Clock-Partner gibt.</p>
        <p>Natural Grid zeigt Oktaven absichtlich "realer": je tiefer, desto dichter liegen die Schritte. Equalized View entzerrt nur die Darstellung, nicht das Tuning selbst.</p>
        <p>Tastatur und Pfeile steuern den Astralcursor. Deren Sound ist der Wellenstart: anderes Timbre und etwa eine Oktave unter den Partikelstimmen.</p>
        <p>Die Maus setzt wieder den physischen Cursor. Sobald sie bewegt wird, kehrt der Geist zurück bzw. verschwindet.</p>
        <p>19-EDO und 31-EDO sind Klangräume, aber noch keine vollständig ausgearbeiteten eigenen Lehrsysteme. Bohlen-Pierce hat eigene Modi im UI.</p>
      </div>
    </div>
  );
}

function SelectControl({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: readonly (readonly [string, string])[] }) {
  return (
    <div>
      <label className="text-sm text-neutral-400">{label}</label>
      <select className="mt-1 w-full bg-neutral-900 border border-neutral-700 rounded-xl px-3 py-2" value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map(([optionValue, optionLabel]) => <option key={optionValue} value={optionValue}>{optionLabel}</option>)}
      </select>
    </div>
  );
}

function Slider({
  label,
  value,
  min,
  max,
  step,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
}) {
  return (
    <label className="block">
      <div className="flex justify-between text-sm text-neutral-400 mb-1">
        <span>{label}</span>
        <span className="text-neutral-200">{typeof value === "number" ? value.toFixed(step < 1 ? 2 : 0) : value}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-violet-500"
      />
    </label>
  );
}

function Toggle({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      onClick={() => onChange(!value)}
      className={`px-3 py-2 rounded-xl border text-left ${value ? "border-violet-400 bg-violet-950/60 text-violet-100" : "border-neutral-700 bg-neutral-900 text-neutral-200"}`}
    >
      {label}
    </button>
  );
}
