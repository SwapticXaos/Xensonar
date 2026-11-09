import { useEffect, useState } from "react";
import type { ResonanceState } from "../config/state";
import type { NexusRuntimeRefsRef } from "../resonanceRefs";
import {
  buildResonanceWaveTelemetry,
  type ResonanceWaveTelemetry,
} from "../resonanceWaveTelemetry";
import {
  findQuantizeMacroPresetForParams,
  type QuantizeMacroKind,
} from "../config/quantizePresets";
import { findResonanceSceneForState } from "../config/scenes";
import { formatQuantizeHudLabel } from "../../../shared/tuning/quantizeLabel";

type Props = {
  nParamsUI: ResonanceState;
  nexusRefs: NexusRuntimeRefsRef;
  /** Pointer-first: toggle echo without right-click (vision §7 pointer-only fallback). */
  onToggleEcho?: () => void;
};

function readTelemetry(
  nParamsUI: ResonanceState,
  nexusRefs: NexusRuntimeRefsRef,
): ResonanceWaveTelemetry {
  return buildResonanceWaveTelemetry({
    refs: nexusRefs.current,
    droneWaveform: nParamsUI.droneOvertoneWaveform,
    waveStartWaveform: nParamsUI.waveStartWaveform,
  });
}

export function ResonanceWaveStatusBlock({
  nParamsUI,
  nexusRefs,
  onToggleEcho,
}: Props) {
  const grooveKindHint: Record<QuantizeMacroKind, string> = {
    stable: "Stable grid",
    groove: "Groove",
    swing: "Swing feel",
    push: "Forward push",
    human: "Humanized",
    drift: "Drift / wash",
    polyrhythm: "Polyrhythm",
    bp: "Bohlen–Pierce",
  };
  const [telemetry, setTelemetry] = useState<ResonanceWaveTelemetry>(() =>
    readTelemetry(nParamsUI, nexusRefs),
  );

  useEffect(() => {
    setTelemetry(readTelemetry(nParamsUI, nexusRefs));
    const intervalId = window.setInterval(() => {
      setTelemetry(readTelemetry(nParamsUI, nexusRefs));
    }, 90);
    return () => window.clearInterval(intervalId);
  }, [nParamsUI.droneOvertoneWaveform, nParamsUI.waveStartWaveform, nexusRefs]);

  const octaveLabel =
    telemetry.octaveMode === "latched"
      ? "Oct+1 Latched"
      : telemetry.octaveMode === "hold"
        ? "Oct+1 Hold"
        : "Base";

  const gridLabel =
    nParamsUI.gridOn && nParamsUI.gridTuning
      ? `${nParamsUI.gridTuning.toUpperCase()} grid`
      : "Free cursor";

  const quantizeLabel = (() => {
    if (!nParamsUI.quantizeOn) {
      return formatQuantizeHudLabel({
        quantizeOn: false,
        quantizeBpm: nParamsUI.quantizeBpm,
        quantizeSubdivision: nParamsUI.quantizeSubdivision,
      });
    }

    const preset = findQuantizeMacroPresetForParams({
      quantizeSubdivision: nParamsUI.quantizeSubdivision,
      quantizeMicroTightness: nParamsUI.quantizeMicroTightness,
      harmonyCascadeSteps: nParamsUI.harmonyCascadeSteps,
    });

    const baseLabel = formatQuantizeHudLabel({
      quantizeOn: true,
      quantizeBpm: nParamsUI.quantizeBpm,
      quantizeSubdivision: nParamsUI.quantizeSubdivision,
    });
    if (!preset) {
      return baseLabel;
    }

    const kindSuffix =
      preset.kind && grooveKindHint[preset.kind]
        ? ` · ${grooveKindHint[preset.kind]}`
        : "";

    return `${baseLabel} · ${preset.label}${kindSuffix}`;
  })();

  const scene = findResonanceSceneForState(nParamsUI);

  return (
    <div className="border border-neutral-800 bg-black p-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <div className="border border-neutral-800 bg-neutral-950/70 p-3">
        <p className="text-[11px] uppercase tracking-[0.18em] text-neutral-500">Drone Wave</p>
        <p className="mt-2 text-sm text-emerald-200 font-mono">{telemetry.droneWaveform}</p>
      </div>
      <div className="border border-neutral-800 bg-neutral-950/70 p-3">
        <p className="text-[11px] uppercase tracking-[0.18em] text-neutral-500">Wave Start</p>
        <p className="mt-2 text-sm text-amber-200 font-mono">{telemetry.waveStartWaveform}</p>
      </div>
      <div className="border border-neutral-800 bg-neutral-950/70 p-3">
        <p className="text-[11px] uppercase tracking-[0.18em] text-neutral-500">Octave State</p>
        <p className={`mt-2 text-sm font-mono ${telemetry.octaveBoostActive ? "text-yellow-200" : "text-sky-200"}`}>
          {octaveLabel}
        </p>
      </div>
      <div className="border border-neutral-800 bg-neutral-950/70 p-3">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[11px] uppercase tracking-[0.18em] text-neutral-500">Wave Drive</p>
          <span className="text-xs font-mono text-rose-200">x{telemetry.driveGain.toFixed(2)}</span>
        </div>
        <div className="mt-3 h-3 w-full bg-neutral-900 border border-neutral-800 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-sky-400 via-fuchsia-400 to-rose-400 transition-[width] duration-75"
            style={{ width: `${Math.round(telemetry.driveLevel * 100)}%` }}
          />
        </div>
      </div>
      <div className="border border-neutral-800 bg-neutral-950/70 p-3">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[11px] uppercase tracking-[0.18em] text-neutral-500">Echo</p>
          {onToggleEcho && (
            <button
              type="button"
              onClick={onToggleEcho}
              className={`px-2 py-0.5 text-[11px] font-mono border rounded transition-colors ${
                nParamsUI.echoOn
                  ? "border-fuchsia-500/60 bg-fuchsia-500/20 text-fuchsia-200"
                  : "border-neutral-600 bg-neutral-800/80 text-neutral-400 hover:border-neutral-500"
              }`}
              title="Toggle echo (also: right-click on canvas)"
            >
              {nParamsUI.echoOn ? "On" : "Off"}
            </button>
          )}
        </div>
        <p className="mt-1 text-xs font-mono text-neutral-400">
          Delay: {Math.round(nParamsUI.echoTempo)} ms
        </p>
      </div>
      <div className="border border-neutral-800 bg-neutral-950/70 p-3 md:col-span-2 lg:col-span-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[11px] uppercase tracking-[0.18em] text-neutral-500">Root</p>
            <p className="mt-1 text-xs font-mono text-violet-200">{Math.round(nParamsUI.gridBase)} Hz</p>
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-[0.18em] text-neutral-500">Grid</p>
            <p className="mt-1 text-xs font-mono text-sky-200">{gridLabel}</p>
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-[0.18em] text-neutral-500">Quantize</p>
            <p className="mt-1 text-xs font-mono text-amber-200">{quantizeLabel}</p>
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-[0.18em] text-neutral-500">Scene</p>
            <p className="mt-1 text-xs font-mono text-neutral-200">
              {scene ? scene.label : "Custom"}
            </p>
          </div>
        </div>
        {scene?.practiceTip && (
          <p
            className="mt-3 text-[11px] text-neutral-400 italic border-l-2 border-violet-500/40 pl-3"
            title="Practice tip for this scene"
          >
            {scene.practiceTip}
          </p>
        )}
      </div>
    </div>
  );
}
