import type { Dispatch, SetStateAction } from "react";
import type { CarrierIntegralAuditionValueSource } from "../../integral/carrierIntegralAudition";
import {
  CARRIER_INTEGRAL_HARMONIC_XPLORE_PROFILES,
  CARRIER_INTEGRAL_SYNTH_LAB_PRESETS,
  isCarrierIntegralSynthLabParamExtreme,
  type CarrierIntegralBodySourceMode,
  type CarrierIntegralHarmonicXploreRenderConfig,
  type CarrierIntegralHarmonicXploreSelection,
  type CarrierIntegralHarmonicXploreSelectionPatch,
  type CarrierIntegralMachineId,
  type CarrierIntegralMachineParams,
  type CarrierIntegralPresetDefinition,
  type CarrierIntegralSelection,
  type CarrierIntegralSelectionPatch,
  type CarrierIntegralSynthLabParams,
  type CarrierIntegralSynthLabSelection,
} from "../../integral";
import { numberSlider } from "./CarrierIntegralNumberSlider";
import {
  bodySourceLabel,
  bodySourceScopeHint,
} from "./carrierIntegralMachineUi";
import { formatPercent } from "./carrierIntegralVerwaltenFormatters";

type CarrierIntegralDeviceLayer = "gestalt" | "synth";

type CarrierIntegralSynthLabPatch = Partial<
  Pick<CarrierIntegralSynthLabSelection, "presetId" | "paramsPatch" | "source">
>;

export type CarrierIntegralMachineEditorSectionProps = {
  auditionValueSource: CarrierIntegralAuditionValueSource;
  activeDeviceLayer: CarrierIntegralDeviceLayer;
  setActiveDeviceLayer: Dispatch<SetStateAction<CarrierIntegralDeviceLayer>>;
  selectedMachine: CarrierIntegralMachineId;
  selectedProjectAvailable: boolean;
  auditionBusyKey: string | null;
  selection: CarrierIntegralSelection;
  setCarrierIntegralSelection: (patch: CarrierIntegralSelectionPatch) => void;
  params: CarrierIntegralMachineParams;
  updateMachineParam: <K extends keyof CarrierIntegralMachineParams>(
    key: K,
    value: CarrierIntegralMachineParams[K],
  ) => void;
  shownBodySourceModes: readonly CarrierIntegralBodySourceMode[];
  selectedPresets: readonly CarrierIntegralPresetDefinition[];
  showLesartLab: boolean;
  setShowLesartLab: Dispatch<SetStateAction<boolean>>;
  synthLab: CarrierIntegralSynthLabSelection;
  synthParams: CarrierIntegralSynthLabParams;
  setCarrierIntegralSynthLab: (patch: CarrierIntegralSynthLabPatch) => void;
  updateSynthParam: <K extends keyof CarrierIntegralSynthLabParams>(
    key: K,
    value: CarrierIntegralSynthLabParams[K],
  ) => void;
  showSynthLab: boolean;
  setShowSynthLab: Dispatch<SetStateAction<boolean>>;
  harmonicXplore: CarrierIntegralHarmonicXploreSelection;
  harmonicXploreSummary: string;
  harmonicXploreDescriptor: string | null;
  harmonicXploreProfileSummary: string | undefined;
  harmonicXploreConfig: CarrierIntegralHarmonicXploreRenderConfig;
  updateHarmonicXplore: (patch: CarrierIntegralHarmonicXploreSelectionPatch) => void;
  onPreviewSelectedMachine: () => void;
  compactLayout?: boolean;
};

export function CarrierIntegralMachineEditorSection({
  auditionValueSource,
  activeDeviceLayer,
  setActiveDeviceLayer,
  selectedMachine,
  selectedProjectAvailable,
  auditionBusyKey,
  selection,
  setCarrierIntegralSelection,
  params,
  updateMachineParam,
  shownBodySourceModes,
  selectedPresets,
  showLesartLab,
  setShowLesartLab,
  synthLab,
  synthParams,
  setCarrierIntegralSynthLab,
  updateSynthParam,
  showSynthLab,
  setShowSynthLab,
  harmonicXplore,
  harmonicXploreSummary,
  harmonicXploreDescriptor,
  harmonicXploreProfileSummary,
  harmonicXploreConfig,
  updateHarmonicXplore,
  onPreviewSelectedMachine,
  compactLayout = false,
}: CarrierIntegralMachineEditorSectionProps) {
  return (
<div
  className={compactLayout ? "rounded border border-neutral-800/70 bg-neutral-950/60 p-0" : "rounded-xl border border-neutral-800 bg-neutral-950/75 p-4"}
  data-xensonar-carrier-integral-device-rack="true"
  data-xensonar-carrier-integral-value-source={auditionValueSource}
  data-xensonar-carrier-integral-stored-entry-token="stored-entry"
>
  <div
    className={compactLayout ? "rounded border border-fuchsia-800/55 bg-black/35" : "mt-3 rounded-xl border border-fuchsia-800/55 bg-black/45 shadow-[0_0_18px_rgba(217,70,239,0.06)]"}
    data-xensonar-carrier-integral-layer-switcher="true"
    data-xensonar-carrier-integral-lab-switcher-highlight="true"
  >
    <div className="grid grid-cols-2 border-b border-neutral-800 bg-neutral-950/80">
      <button
        type="button"
        onClick={() => setActiveDeviceLayer("gestalt")}
        className={`flex items-center justify-between border-t-2 ${compactLayout ? "px-2 py-2 text-[10px] tracking-[0.12em]" : "px-3 py-4 text-[11px] tracking-[0.2em]"} text-left font-semibold uppercase transition ${activeDeviceLayer === "gestalt" ? "border-t-cyan-300 bg-cyan-950/35 text-cyan-50 shadow-[inset_0_0_18px_rgba(34,211,238,0.08)]" : "border-t-transparent text-cyan-200/55 hover:bg-cyan-950/20 hover:text-cyan-100"}`}
        data-xensonar-carrier-integral-lesart-lab-toggle="true"
      >
        <span>
          ∿ Gestalt-Interpretation
          <span className="sr-only"> Lesart-Gerät</span>
        </span>
        <span>{activeDeviceLayer === "gestalt" ? "▲" : "▼"}</span>
      </button>
      <button
        type="button"
        onClick={() => setActiveDeviceLayer("synth")}
        className={`flex items-center justify-between border-l border-neutral-800 border-t-2 ${compactLayout ? "px-2 py-2 text-[10px] tracking-[0.12em]" : "px-3 py-4 text-[11px] tracking-[0.2em]"} text-left font-semibold uppercase transition ${activeDeviceLayer === "synth" ? "border-t-fuchsia-300 bg-fuchsia-950/35 text-fuchsia-50 shadow-[inset_0_0_18px_rgba(217,70,239,0.08)]" : "border-t-transparent text-fuchsia-200/55 hover:bg-fuchsia-950/20 hover:text-fuchsia-100"}`}
        data-xensonar-carrier-integral-synth-lab-toggle="true"
      >
        <span>⌁ Synth-Labor</span>
        <span>{activeDeviceLayer === "synth" ? "▲" : "▼"}</span>
      </button>
    </div>

    <div className={compactLayout ? "p-2" : "p-3"}>
      {activeDeviceLayer === "gestalt" ? (
        <div
          className={compactLayout ? "rounded border border-cyan-900/50 bg-cyan-950/10 p-2" : "rounded-xl border border-cyan-900/50 bg-cyan-950/10 p-3"}
          data-xensonar-carrier-integral-liquid-selection="true"
        >
          <div className={compactLayout ? "flex items-center justify-end gap-2" : "flex items-start justify-between gap-2"}>
            {!compactLayout ? (
              <div>
                <div className="text-[10px] uppercase tracking-[0.22em] text-cyan-300/80">
                  Gestalt-Interpretation
                </div>
                <div className="mt-1 text-[11px] text-cyan-100/70">
                  direkt · Linie · Fenster · Körper.
                </div>
              </div>
            ) : null}
            <button
              type="button"
              onClick={() =>
                setCarrierIntegralSelection({
                  paramsPatch: {},
                  source: "user",
                })
              }
              className="rounded border border-cyan-800/70 px-2 py-1 text-[10px] text-cyan-100 hover:bg-cyan-950/40"
            >
              Preset zurück
            </button>
          </div>

          <div className="mt-3 space-y-2">
            <div className="text-[10px] uppercase tracking-[0.22em] text-neutral-500">
              {bodySourceScopeHint(selectedMachine)}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {shownBodySourceModes.length ? (
                shownBodySourceModes.map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() =>
                      setCarrierIntegralSelection({
                        bodySourceMode: mode,
                        source: "user",
                      })
                    }
                    className={`rounded border px-2 py-1 ${selection.bodySourceMode === mode ? "border-fuchsia-500 bg-fuchsia-500/10 text-fuchsia-100" : "border-neutral-800 text-neutral-300 hover:bg-neutral-900"}`}
                  >
                    {bodySourceLabel(mode)}
                  </button>
                ))
              ) : (
                <span className="rounded border border-neutral-800 bg-neutral-950/55 px-2 py-1 text-[10px] text-neutral-500">
                  fixiert · kein Donor-Timbre-Schalter
                </span>
              )}
            </div>
          </div>

          <div className="mt-3 space-y-2">
            <div className="text-[10px] uppercase tracking-[0.22em] text-neutral-500">
              Wertekombination
            </div>
            <div className="flex flex-wrap gap-1.5">
              {selectedPresets.length ? (
                selectedPresets.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() =>
                      setCarrierIntegralSelection({
                        presetId: preset.id,
                        paramsPatch: {},
                        source: "user",
                      })
                    }
                    className={`rounded border px-2 py-1 ${selection.presetId === preset.id ? "border-cyan-500 bg-cyan-500/10 text-cyan-100" : "border-neutral-800 text-neutral-300 hover:bg-neutral-900"}`}
                    title={preset.intendedCarrierUse}
                  >
                    {preset.label}
                  </button>
                ))
              ) : (
                <span className="text-neutral-600">
                  keine Wertekombinationen
                </span>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowLesartLab((value) => !value)}
            className="mt-3 w-full rounded border border-cyan-800/50 bg-cyan-950/20 px-3 py-1.5 text-left text-[10px] uppercase tracking-[0.18em] text-cyan-200 hover:bg-cyan-900/30"
          >
            {showLesartLab
              ? "Feinjustierung schließen ▲"
              : "Feinjustierung / Labor öffnen ▼"}
          </button>

          {showLesartLab ? (
            <div
              className={compactLayout ? "mt-2 grid gap-1.5 sm:grid-cols-2" : "mt-3 grid gap-2 sm:grid-cols-2"}
              data-xensonar-carrier-integral-lesart-lab="true"
            >
              {numberSlider({
                label: "Stimmenlimit",
                value: params.maxVoices,
                min: 1,
                max: 512,
                step: 1,
                warning: params.maxVoices > 180,
                onChange: (value) =>
                  updateMachineParam("maxVoices", value),
              })}
              {numberSlider({
                label: "Linienlimit",
                value: params.maxLines,
                min: 1,
                max: 512,
                step: 1,
                warning: params.maxLines > 180,
                onChange: (value) =>
                  updateMachineParam("maxLines", value),
              })}
              {numberSlider({
                label: "Fensterlimit",
                value: params.maxWindows,
                min: 1,
                max: 256,
                step: 1,
                warning: params.maxWindows > 72,
                onChange: (value) =>
                  updateMachineParam("maxWindows", value),
              })}
              {numberSlider({
                label: "Mindestdauer",
                value: params.minVoiceDurationBeats,
                min: 0,
                max: 2,
                step: 0.005,
                format: (value) => value.toFixed(3),
                warning: params.minVoiceDurationBeats <= 0.025,
                onChange: (value) =>
                  updateMachineParam("minVoiceDurationBeats", value),
              })}
              {numberSlider({
                label: "Dichte-Schutz",
                value: params.densityCompression,
                min: 0,
                max: 1,
                step: 0.01,
                format: formatPercent,
                warning:
                  params.densityCompression < 0.08 ||
                  params.densityCompression > 0.9,
                onChange: (value) =>
                  updateMachineParam("densityCompression", value),
              })}
              {numberSlider({
                label: "Cluster-Merge",
                value: params.clusterMergeStrength,
                min: 0,
                max: 1,
                step: 0.01,
                format: formatPercent,
                warning: params.clusterMergeStrength > 0.88,
                onChange: (value) =>
                  updateMachineParam("clusterMergeStrength", value),
              })}
              {numberSlider({
                label: "Mikroversatz",
                value: params.microOffsetStrength,
                min: 0,
                max: 1,
                step: 0.01,
                format: formatPercent,
                warning: params.microOffsetStrength > 0.84,
                onChange: (value) =>
                  updateMachineParam("microOffsetStrength", value),
              })}
              {numberSlider({
                label: "LocalField-Tiefe",
                value: params.localFieldDepth,
                min: 0,
                max: 1,
                step: 0.01,
                format: formatPercent,
                warning: params.localFieldDepth > 0.9,
                onChange: (value) =>
                  updateMachineParam("localFieldDepth", value),
              })}
              {numberSlider({
                label: "Stretch-Elastik",
                value: params.stretchElasticity,
                min: 0,
                max: 1,
                step: 0.01,
                format: formatPercent,
                warning: params.stretchElasticity > 0.9,
                onChange: (value) =>
                  updateMachineParam("stretchElasticity", value),
              })}
              {numberSlider({
                label: "Headroom",
                value: params.headroomDb,
                min: -36,
                max: 3,
                step: 0.5,
                format: (value) => `${value.toFixed(1)} dB`,
                warning: params.headroomDb > -3,
                onChange: (value) =>
                  updateMachineParam("headroomDb", value),
              })}
            </div>
          ) : (
            <div className="mt-3 rounded border border-neutral-800 bg-neutral-950/55 px-2 py-1.5 text-[10px] text-neutral-500">
              Labor eingeklappt · {params.maxVoices} Stimmen · Dichte{" "}
              {formatPercent(params.densityCompression)} · Headroom{" "}
              {params.headroomDb.toFixed(1)} dB
            </div>
          )}
        </div>
      ) : (
                                  <div
            className={compactLayout ? "rounded border border-fuchsia-900/50 bg-fuchsia-950/10 p-2" : "rounded-xl border border-fuchsia-900/50 bg-fuchsia-950/10 p-3"}
            data-xensonar-carrier-integral-synth-lab="true"
          >
            <div className={compactLayout ? "flex items-center justify-end gap-2" : "flex items-start justify-between gap-2"}>
              {!compactLayout ? (
                <div>
                  <div className="text-[10px] uppercase tracking-[0.22em] text-fuchsia-300/80">
                    Klangkörper
                  </div>
                  <div className="mt-1 text-[11px] text-fuchsia-100/70">
                    Timbre-Färbung · unabhängig von HarmonicXplorE-Reihe
                  </div>
                </div>
              ) : null}
              <button
                type="button"
                onClick={() =>
                  setCarrierIntegralSynthLab({
                    presetId: "neutral-body",
                    paramsPatch: {},
                    source: "user",
                  })
                }
                className="rounded border border-fuchsia-800/70 px-2 py-1 text-[10px] text-fuchsia-100 hover:bg-fuchsia-950/40"
              >
                Grundkörper
              </button>
            </div>
            <div className={compactLayout ? "mt-2 flex flex-wrap items-center gap-1" : "mt-3 flex flex-wrap items-center gap-1.5"} data-xensonar-carrier-integral-timbre-presets="true">
              {CARRIER_INTEGRAL_SYNTH_LAB_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() =>
                    setCarrierIntegralSynthLab({
                      presetId: preset.id,
                      paramsPatch: {},
                      source: "user",
                    })
                  }
                  className={`rounded border px-2 py-1 ${synthLab.presetId === preset.id ? "border-fuchsia-500 bg-fuchsia-500/10 text-fuchsia-100" : "border-neutral-800 text-neutral-300 hover:bg-neutral-900"}`}
                  title={preset.summary}
                >
                  {preset.label}
                </button>
              ))}
            </div>
            {selectedMachine === "harmonic-xplore-direct-carrier" ? (
              <div
                className="mt-3 rounded-xl border border-lime-900/60 bg-lime-950/10 p-3"
                data-xensonar-carrier-integral-harmonic-xplore-truth-split="true"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="text-[10px] uppercase tracking-[0.22em] text-lime-300/80">
                      HarmonicXplorE-Struktur
                    </div>
                    <div className="mt-1 text-[10px] text-lime-100/65">
                      {harmonicXploreSummary} · {harmonicXploreConfig.partials.length} Partials · Hash {harmonicXploreConfig.configHash}
                    </div>
                  </div>
                  <button
                    type="button"
                    data-xensonar-carrier-integral-synth-lab-inline-audition="true"
                    disabled={!selectedProjectAvailable || auditionBusyKey !== null}
                    onClick={onPreviewSelectedMachine}
                    className="rounded border border-emerald-800/70 bg-emerald-950/20 px-2 py-1 text-[10px] text-emerald-100 hover:bg-emerald-900/30 disabled:opacity-50"
                  >
                    Vorhören
                  </button>
                </div>
                <div className="mt-3 flex flex-wrap gap-1.5" data-xensonar-carrier-integral-harmonic-xplore-profiles="true">
                  {CARRIER_INTEGRAL_HARMONIC_XPLORE_PROFILES.map((profile) => (
                    <button
                      key={profile.id}
                      type="button"
                      onClick={() =>
                        updateHarmonicXplore({
                          profileId: profile.id,
                          seriesType: profile.seriesType,
                          phase: profile.phase,
                        })
                      }
                      className={`rounded border px-2 py-1 ${harmonicXplore.profileId === profile.id ? "border-lime-500 bg-lime-500/10 text-lime-100" : "border-neutral-800 text-neutral-300 hover:bg-neutral-900"}`}
                      title={profile.summary}
                    >
                      {profile.label}
                    </button>
                  ))}
                </div>
                <div className="mt-3 grid gap-2 sm:grid-cols-4">
                  {numberSlider({
                    label: "Anzahl Harmonics",
                    value: harmonicXplore.count,
                    min: 1,
                    max: 32,
                    step: 1,
                    format: (value) => `${Math.round(value)}`,
                    onChange: (value) => updateHarmonicXplore({ count: value }),
                  })}
                  {numberSlider({
                    label: "Dämpfung",
                    value: harmonicXplore.rolloff,
                    min: 0.35,
                    max: 2.25,
                    step: 0.01,
                    format: (value) => value.toFixed(2),
                    onChange: (value) => updateHarmonicXplore({ rolloff: value }),
                  })}
                  {numberSlider({
                    label: "Detaildichte",
                    value: harmonicXplore.detailDensity,
                    min: 0.2,
                    max: 1,
                    step: 0.01,
                    format: (value) => value.toFixed(2),
                    onChange: (value) => updateHarmonicXplore({ detailDensity: value }),
                  })}
                  <label className="grid gap-1 text-[10px] uppercase tracking-[0.14em] text-lime-100/60">
                    <span>Register</span>
                    <select
                      value={harmonicXplore.registerFold}
                      onChange={(event) => updateHarmonicXplore({ registerFold: event.target.value as typeof harmonicXplore.registerFold })}
                      className="rounded border border-lime-800/60 bg-black/35 px-2 py-1 text-lime-50 outline-none focus:border-lime-400"
                    >
                      <option value="compact">kompakt</option>
                      <option value="balanced">ausgewogen</option>
                      <option value="open">offen</option>
                    </select>
                  </label>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-1.5" data-xensonar-carrier-integral-harmonic-xplore-detail-density="true">
                  <span className="mr-1 text-[10px] uppercase tracking-[0.14em] text-lime-100/55">Detailmodus</span>
                  {([
                    ["balanced", "ausgewogen", "ruhigere 5.69-Lesung mit weniger kleinen Zwischenkandidaten"],
                    ["dense", "dicht", "höhere Carrier-Auflösung: kleinere gemalte Strukturen werden stärker mitgelesen"],
                  ] as const).map(([mode, label, title]) => (
                    <button
                      key={mode}
                      type="button"
                      title={title}
                      onClick={() => updateHarmonicXplore({ detailMode: mode, detailDensity: mode === "dense" ? Math.max(harmonicXplore.detailDensity, 0.86) : harmonicXplore.detailDensity })}
                      className={`rounded border px-2 py-1 text-[10px] ${harmonicXplore.detailMode === mode ? "border-lime-400 bg-lime-600/20 text-lime-50" : "border-lime-900/60 bg-black/25 text-lime-200/60 hover:bg-lime-950/35"}`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <div className="mt-2 rounded border border-lime-900/55 bg-black/25 px-2 py-1.5 text-[10px] text-lime-100/65" title={harmonicXploreDescriptor ?? harmonicXploreProfileSummary ?? "HarmonicXplorE"}>
                  Raw {harmonicXploreConfig.rawSeries.slice(0, 12).join(" : ")} · Render {harmonicXploreConfig.renderSeries.slice(0, 12).join(" : ")} · Details {harmonicXploreConfig.detailMode === "dense" ? "dicht" : harmonicXploreConfig.detailDensity.toFixed(2)}
                </div>
              </div>
            ) : null}
            <div className="mt-3 rounded border border-neutral-800 bg-neutral-950/55 px-2 py-1.5 text-[10px] text-neutral-500">
              Filter {Math.round(synthParams.filterFrequency)} Hz ·
              Drive {formatPercent(synthParams.drive)} · Ausgang {" "}
              {formatPercent(synthParams.outputGain)}
            </div>
          {!compactLayout ? (
            <button
              type="button"
              onClick={() => setShowSynthLab((value) => !value)}
              className="mt-3 w-full rounded border border-fuchsia-800/50 bg-fuchsia-950/20 px-3 py-1.5 text-left text-[10px] uppercase tracking-[0.18em] text-fuchsia-200 hover:bg-fuchsia-900/30"
            >
              {showSynthLab
                ? "Synth-Labor schließen ▲"
                : "Synth manuell formen ▼"}
            </button>
          ) : null}
          {showSynthLab || compactLayout ? (
            <div
              className={compactLayout ? "mt-2 grid gap-1.5 sm:grid-cols-2" : "mt-3 grid gap-2 sm:grid-cols-2"}
              data-xensonar-carrier-integral-synth-lab-advanced="true"
            >
              {numberSlider({
                label: "Sinus",
                value: synthParams.sine,
                min: 0,
                max: 1,
                step: 0.01,
                format: formatPercent,
                warning: isCarrierIntegralSynthLabParamExtreme(
                  "sine",
                  synthParams.sine,
                ),
                onChange: (value) => updateSynthParam("sine", value),
              })}
              {numberSlider({
                label: "Dreieck",
                value: synthParams.triangle,
                min: 0,
                max: 1,
                step: 0.01,
                format: formatPercent,
                warning: isCarrierIntegralSynthLabParamExtreme(
                  "triangle",
                  synthParams.triangle,
                ),
                onChange: (value) =>
                  updateSynthParam("triangle", value),
              })}
              {numberSlider({
                label: "Sägezahn",
                value: synthParams.sawtooth,
                min: 0,
                max: 1,
                step: 0.01,
                format: formatPercent,
                warning: isCarrierIntegralSynthLabParamExtreme(
                  "sawtooth",
                  synthParams.sawtooth,
                ),
                onChange: (value) =>
                  updateSynthParam("sawtooth", value),
              })}
              {numberSlider({
                label: "Rechteck",
                value: synthParams.square,
                min: 0,
                max: 1,
                step: 0.01,
                format: formatPercent,
                warning: isCarrierIntegralSynthLabParamExtreme(
                  "square",
                  synthParams.square,
                ),
                onChange: (value) =>
                  updateSynthParam("square", value),
              })}
              {numberSlider({
                label: "Sub",
                value: synthParams.sub,
                min: 0,
                max: 1,
                step: 0.01,
                format: formatPercent,
                warning: isCarrierIntegralSynthLabParamExtreme(
                  "sub",
                  synthParams.sub,
                ),
                onChange: (value) => updateSynthParam("sub", value),
              })}
              {numberSlider({
                label: "Obertöne",
                value: synthParams.overtone,
                min: 0,
                max: 1,
                step: 0.01,
                format: formatPercent,
                warning: isCarrierIntegralSynthLabParamExtreme(
                  "overtone",
                  synthParams.overtone,
                ),
                onChange: (value) =>
                  updateSynthParam("overtone", value),
              })}
              {numberSlider({
                label: "Detune",
                value: synthParams.detuneCents,
                min: -48,
                max: 48,
                step: 1,
                format: (value) => `${Math.round(value)} ct`,
                warning: isCarrierIntegralSynthLabParamExtreme(
                  "detuneCents",
                  synthParams.detuneCents,
                ),
                onChange: (value) =>
                  updateSynthParam("detuneCents", value),
              })}
              {numberSlider({
                label: "Harmonik-Spreizung",
                value: synthParams.harmonicSpread,
                min: 0,
                max: 1,
                step: 0.01,
                format: formatPercent,
                warning: isCarrierIntegralSynthLabParamExtreme(
                  "harmonicSpread",
                  synthParams.harmonicSpread,
                ),
                onChange: (value) =>
                  updateSynthParam("harmonicSpread", value),
              })}
              {numberSlider({
                label: "Filter",
                value: synthParams.filterFrequency,
                min: 160,
                max: 7200,
                step: 10,
                format: (value) => `${Math.round(value)} Hz`,
                warning: isCarrierIntegralSynthLabParamExtreme(
                  "filterFrequency",
                  synthParams.filterFrequency,
                ),
                onChange: (value) =>
                  updateSynthParam("filterFrequency", value),
              })}
              {numberSlider({
                label: "Filter-Q",
                value: synthParams.filterQ,
                min: 0.1,
                max: 8,
                step: 0.05,
                format: (value) => value.toFixed(2),
                warning: isCarrierIntegralSynthLabParamExtreme(
                  "filterQ",
                  synthParams.filterQ,
                ),
                onChange: (value) =>
                  updateSynthParam("filterQ", value),
              })}
              {numberSlider({
                label: "Attack",
                value: synthParams.attackScale,
                min: 0.005,
                max: 0.6,
                step: 0.005,
                format: (value) => value.toFixed(3),
                warning: isCarrierIntegralSynthLabParamExtreme(
                  "attackScale",
                  synthParams.attackScale,
                ),
                onChange: (value) =>
                  updateSynthParam("attackScale", value),
              })}
              {numberSlider({
                label: "Release",
                value: synthParams.releaseScale,
                min: 0.04,
                max: 1.4,
                step: 0.01,
                format: (value) => value.toFixed(2),
                warning: isCarrierIntegralSynthLabParamExtreme(
                  "releaseScale",
                  synthParams.releaseScale,
                ),
                onChange: (value) =>
                  updateSynthParam("releaseScale", value),
              })}
              {numberSlider({
                label: "Transient",
                value: synthParams.transientGain,
                min: 0,
                max: 0.45,
                step: 0.01,
                format: formatPercent,
                warning: isCarrierIntegralSynthLabParamExtreme(
                  "transientGain",
                  synthParams.transientGain,
                ),
                onChange: (value) =>
                  updateSynthParam("transientGain", value),
              })}
              {numberSlider({
                label: "Stereo-Breite",
                value: synthParams.panSpread,
                min: 0,
                max: 0.65,
                step: 0.01,
                format: formatPercent,
                warning: isCarrierIntegralSynthLabParamExtreme(
                  "panSpread",
                  synthParams.panSpread,
                ),
                onChange: (value) =>
                  updateSynthParam("panSpread", value),
              })}
              {numberSlider({
                label: "Drive",
                value: synthParams.drive,
                min: 0,
                max: 1,
                step: 0.01,
                format: formatPercent,
                warning: isCarrierIntegralSynthLabParamExtreme(
                  "drive",
                  synthParams.drive,
                ),
                onChange: (value) => updateSynthParam("drive", value),
              })}
              {numberSlider({
                label: "Ausgang",
                value: synthParams.outputGain,
                min: 0.18,
                max: 1,
                step: 0.01,
                format: formatPercent,
                warning: isCarrierIntegralSynthLabParamExtreme(
                  "outputGain",
                  synthParams.outputGain,
                ),
                onChange: (value) =>
                  updateSynthParam("outputGain", value),
              })}
            </div>
          ) : null}
        </div>
      )}
    </div>
  </div>
</div>
  );
}
