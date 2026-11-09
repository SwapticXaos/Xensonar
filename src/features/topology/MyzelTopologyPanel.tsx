import type { MyzelTopologyPanelProps } from './myzelTopologyPanelTypes';
import { MyzelEnhancerControls } from './MyzelEnhancerControls';
import { MyzelInstallationControls } from './MyzelInstallationControls';
import { TOPO_HEIGHT, TOPO_WIDTH } from "../xensonar/domain/instrumentData";
import type { MyzelTopologyMode } from "../resonance/refactorTopologySupport";
import { useMyzelResidentWorkbenchUiState } from "./useMyzelResidentWorkbenchUiState";
import {
  XENSONAR_VARIANTE_TOPOLOGY_LISTENING_EYEBROW,
  XENSONAR_VARIANTE_TOPOLOGY_MACHINE_EYEBROW,
  XENSONAR_VARIANTE_TOPOLOGY_ROOT_LABEL,
  XENSONAR_VARIANTE_TOPOLOGY_TOOL_COPY,
} from "../xensonar/family/refactor/refucktorPresentation";



const modeCopy: Record<MyzelTopologyMode, { label: string; eyebrow: string; description: string }> = {
  enhancer: {
    label: "Enhancer / Mastering Modus",
    eyebrow: XENSONAR_VARIANTE_TOPOLOGY_MACHINE_EYEBROW,
    description: "Myzel bleibt hier ein vernetztes Effekt- und Färbewerkzeug. Routing, Körper, Drive und Post-FX bleiben offen sichtbar.",
  },
  installation: {
    label: "Kunst-Installation Modus / Resident Constellations",
    eyebrow: XENSONAR_VARIANTE_TOPOLOGY_LISTENING_EYEBROW,
    description: "Die Root bleibt als ruhige Referenz stehen. Darüber zieht der Ball, und die Resident Nodes können als feste Klangkörper beobachtet, verschoben und in Classic wie Variante unterschiedlich angespielt werden.",
  },
};

export function MyzelTopologyPanel({
  mode,
  onModeChange,
  myzelEnabled,
  onToggleMyzel,
  onResetLayout,
  systemState,
  rootHz,
  statusLine,
  canvasRef,
  onCanvasMouseDown,
  onCanvasMouseMove,
  onCanvasMouseUp,
  onCanvasMouseLeave,
  onCanvasContextMenu,
  tParams,
  onTParamChange,
  postFxGroup,
  onPostFxGroupChange,
  postFxEnabled,
  onTogglePostFxEnabled,
  followForgeHandoff,
  onFollowForgeHandoffChange,
  postFxDepth,
  onPostFxDepthChange,
  postFxParallel,
  onPostFxParallelChange,
  activeGroupSummary,
  activeGroupReceivesFrom,
  activeGroupKeepsStableBy,
  handoffSummary,
  handoffBalanceCarrier,
  myzelPattern,
  onMyzelPatternChange,
  myzelBallMode,
  onMyzelBallModeChange,
  myzelNodeMode,
  onMyzelNodeModeChange,
  myzelStep16ths,
  onMyzelStep16thsChange,
  myzelDriveEnabled,
  onToggleMyzelDriveEnabled,
  room3BodyEnabled,
  onToggleRoom3BodyEnabled,
  onResetEnhancerMix,
  myzelInterpreterMix,
  onMyzelInterpreterMixChange,
  myzelCentralColorMixer,
  onMyzelCentralColorMixerChange,
  nodalDeviceMatrix,
  onNodalDeviceEnabledChange,
  onNodalDeviceAmountChange,
  onNodalDeviceTargetChange,
  room3BodyControls,
  onRoom3BodyControlsChange,
  installationMix,
  onInstallationMixChange,
  room3MaterialLabel,
  installationFieldConfig,
  particleSoundsMuted,
  onToggleInstallNomadAttractor,
  onToggleInstallResidents,
  onSetInstallResidentVolume,
  onSetInstallResidentSystem,
  onSetInstallResidentMode,
  onToggleInstallResidentWaveExcitation,
  onToggleInstallResidentBallCoupling,
  onSetParticleSoundMode,
  onSetInstallationResidentSound,
  onSetInstallationResidentElasticPitch,
  customResidentSoundPreset,
  customResidentElasticPitch,
  onSetCustomResidentSound,
  onSetCustomResidentElasticPitch,
  onPreviewPendingCustomResident,
  selectedResidentLabel,
  selectedResidentFrequencyHz,
  residentRootHz,
  residentAddFrequencyHz,
  onResidentAddFrequencySliderChange,
  onAddResident,
  residentConstellationName,
  onResidentConstellationNameChange,
  savedResidentConstellations,
  onSaveResidentConstellation,
  onLoadResidentConstellation,
  onDeleteResidentConstellation,
  onOpenClassicField,
  onOpenRefactorField,
}: MyzelTopologyPanelProps) {
  const copy = modeCopy[mode];
  const {
    residentSoundMenuGroups,
    residentWorkbenchSendConfirmed,
    markResidentWorkbenchSent,
  } = useMyzelResidentWorkbenchUiState();

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="border border-neutral-800 bg-black p-6">
        <div className="flex flex-col gap-4 border-b border-neutral-800 pb-4">
          <div className="space-y-2">
            <div className="text-[10px] uppercase tracking-[0.28em] text-fuchsia-300">{copy.eyebrow}</div>
            <h2 className="text-2xl text-white">III. Nodal Installation</h2>
            <p className="max-w-4xl text-sm leading-relaxed text-neutral-400">{copy.description}</p>
          </div>

          <div className="rounded border border-cyan-900/40 bg-cyan-950/10 px-3 py-3 text-xs text-cyan-100">
            <div className="uppercase tracking-[0.2em] text-cyan-300">{XENSONAR_VARIANTE_TOPOLOGY_ROOT_LABEL}</div>
            <div className="mt-1 text-lg text-white">{rootHz.toFixed(1)} Hz</div>
            <div className="mt-1 leading-relaxed text-cyan-100/70">Keine Raum-I-Automatik, keine Beat-Kopplung – nur die ruhige Referenzwurzel als Stütze.</div>
          </div>

          <div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_auto_auto] md:items-center">
            <div className="grid gap-2 md:grid-cols-2">
              {([
                ["enhancer", "Enhancer / Mastering Modus"],
                ["installation", "Kunst-Installation Modus"],
              ] as const).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => onModeChange(value)}
                  className={`min-h-[3.25rem] rounded border px-4 py-3 text-sm font-semibold tracking-[0.08em] transition-colors ${mode === value ? "border-fuchsia-400 bg-fuchsia-950/30 text-fuchsia-100" : "border-neutral-700 text-neutral-300 hover:bg-neutral-900"}`}
                >
                  {label}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={onToggleMyzel}
              className={`rounded border px-4 py-3 text-sm font-semibold tracking-[0.08em] transition-colors ${myzelEnabled ? "border-amber-500 bg-amber-950/30 text-amber-100" : "border-neutral-700 text-neutral-300 hover:bg-neutral-900"}`}
            >
              {myzelEnabled ? "Myzel aktiv" : "Myzel offline"}
            </button>
            <button
              type="button"
              onClick={onResetLayout}
              className="rounded border border-neutral-700 px-4 py-3 text-sm font-semibold tracking-[0.08em] text-neutral-300 hover:bg-neutral-900"
            >
              Layout Reset
            </button>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-neutral-400">
            <div className="text-sm tracking-wide text-amber-300">{systemState}</div>
            <div className="max-w-4xl text-right leading-relaxed text-neutral-500">{statusLine}</div>
          </div>
        </div>

        <div className="mt-5 space-y-4">
          <div className="relative border border-neutral-800 bg-neutral-950 overflow-hidden" style={{ height: TOPO_HEIGHT }}>
            {myzelEnabled ? (
              <canvas
                ref={canvasRef}
                width={TOPO_WIDTH}
                height={TOPO_HEIGHT}
                className="w-full h-full cursor-grab active:cursor-grabbing"
                onMouseDown={onCanvasMouseDown}
                onMouseMove={onCanvasMouseMove}
                onMouseUp={onCanvasMouseUp}
                onMouseLeave={onCanvasMouseLeave}
                onContextMenu={onCanvasContextMenu}
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-neutral-700">[ OFFLINE ]</div>
            )}
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <label className="block text-xs text-neutral-400">
              <span className="mb-1 block text-neutral-500">Semantische Spannung {(tParams.tension * 100).toFixed(0)}%</span>
              <input type="range" min="0" max="1" step="0.01" value={tParams.tension} onChange={(event) => onTParamChange("tension", parseFloat(event.target.value))} className="w-full cursor-pointer" />
            </label>
            {mode === "enhancer" ? (
              <>
                <label className="block text-xs text-neutral-400">
                  <span className="mb-1 block text-neutral-500">Layer-Slimness {(tParams.slimLayers * 100).toFixed(0)}%</span>
                  <input type="range" min="0" max="1" step="0.01" value={tParams.slimLayers} onChange={(event) => onTParamChange("slimLayers", parseFloat(event.target.value))} className="w-full cursor-pointer" />
                </label>
                <label className="block text-xs text-neutral-400">
                  <span className="mb-1 block text-neutral-500">Rohe Realität {(tParams.rawReality * 100).toFixed(0)}%</span>
                  <input type="range" min="0" max="1" step="0.01" value={tParams.rawReality} onChange={(event) => onTParamChange("rawReality", parseFloat(event.target.value))} className="w-full cursor-pointer" />
                </label>
              </>
            ) : (
              <>
                <label className="block text-xs text-neutral-400">
                  <span className="mb-1 block text-neutral-500">Root-Referenz {(installationMix.rootLevel * 100).toFixed(0)}%</span>
                  <input type="range" min="0" max="1" step="0.01" value={installationMix.rootLevel} onChange={(event) => onInstallationMixChange("rootLevel", parseFloat(event.target.value))} className="w-full cursor-pointer" />
                </label>
                <label className="block text-xs text-neutral-400">
                  <span className="mb-1 block text-neutral-500">Node-Präsenz {(installationMix.nodeLevel * 100).toFixed(0)}%</span>
                  <input type="range" min="0" max="1" step="0.01" value={installationMix.nodeLevel} onChange={(event) => onInstallationMixChange("nodeLevel", parseFloat(event.target.value))} className="w-full cursor-pointer" />
                </label>
              </>
            )}
          </div>
        </div>

        {mode === "installation" ? (
            <MyzelInstallationControls
              installationFieldConfig={installationFieldConfig}
              particleSoundsMuted={particleSoundsMuted}
              onToggleInstallNomadAttractor={onToggleInstallNomadAttractor}
              onToggleInstallResidents={onToggleInstallResidents}
              onSetInstallResidentVolume={onSetInstallResidentVolume}
              onSetInstallResidentSystem={onSetInstallResidentSystem}
              onSetInstallResidentMode={onSetInstallResidentMode}
              onToggleInstallResidentWaveExcitation={onToggleInstallResidentWaveExcitation}
              onToggleInstallResidentBallCoupling={onToggleInstallResidentBallCoupling}
              onSetParticleSoundMode={onSetParticleSoundMode}
              onSetInstallationResidentSound={onSetInstallationResidentSound}
              onSetInstallationResidentElasticPitch={onSetInstallationResidentElasticPitch}
              customResidentSoundPreset={customResidentSoundPreset}
              customResidentElasticPitch={customResidentElasticPitch}
              onSetCustomResidentSound={onSetCustomResidentSound}
              onSetCustomResidentElasticPitch={onSetCustomResidentElasticPitch}
              onPreviewPendingCustomResident={onPreviewPendingCustomResident}
              selectedResidentLabel={selectedResidentLabel}
              selectedResidentFrequencyHz={selectedResidentFrequencyHz}
              residentRootHz={residentRootHz}
              residentAddFrequencyHz={residentAddFrequencyHz}
              onResidentAddFrequencySliderChange={onResidentAddFrequencySliderChange}
              onAddResident={onAddResident}
              residentConstellationName={residentConstellationName}
              onResidentConstellationNameChange={onResidentConstellationNameChange}
              savedResidentConstellations={savedResidentConstellations}
              onSaveResidentConstellation={onSaveResidentConstellation}
              onLoadResidentConstellation={onLoadResidentConstellation}
              onDeleteResidentConstellation={onDeleteResidentConstellation}
              onOpenClassicField={onOpenClassicField}
              onOpenRefactorField={onOpenRefactorField}
              installationMix={installationMix}
              onInstallationMixChange={onInstallationMixChange}
              tParams={tParams}
              onTParamChange={onTParamChange}
              myzelCentralColorMixer={myzelCentralColorMixer}
              onMyzelCentralColorMixerChange={onMyzelCentralColorMixerChange}
              nodalDeviceMatrix={nodalDeviceMatrix}
              onNodalDeviceEnabledChange={onNodalDeviceEnabledChange}
              onNodalDeviceAmountChange={onNodalDeviceAmountChange}
              onNodalDeviceTargetChange={onNodalDeviceTargetChange}
              residentSoundMenuGroups={residentSoundMenuGroups}
              residentWorkbenchSendConfirmed={residentWorkbenchSendConfirmed}
              onMarkResidentWorkbenchSent={markResidentWorkbenchSent}
            />
          ) : (
            <MyzelEnhancerControls
              postFxGroup={postFxGroup}
              onPostFxGroupChange={onPostFxGroupChange}
              postFxEnabled={postFxEnabled}
              onTogglePostFxEnabled={onTogglePostFxEnabled}
              followForgeHandoff={followForgeHandoff}
              onFollowForgeHandoffChange={onFollowForgeHandoffChange}
              postFxDepth={postFxDepth}
              onPostFxDepthChange={onPostFxDepthChange}
              postFxParallel={postFxParallel}
              onPostFxParallelChange={onPostFxParallelChange}
              activeGroupSummary={activeGroupSummary}
              activeGroupReceivesFrom={activeGroupReceivesFrom}
              activeGroupKeepsStableBy={activeGroupKeepsStableBy}
              handoffSummary={handoffSummary}
              handoffBalanceCarrier={handoffBalanceCarrier}
              myzelPattern={myzelPattern}
              onMyzelPatternChange={onMyzelPatternChange}
              myzelBallMode={myzelBallMode}
              onMyzelBallModeChange={onMyzelBallModeChange}
              myzelNodeMode={myzelNodeMode}
              onMyzelNodeModeChange={onMyzelNodeModeChange}
              myzelStep16ths={myzelStep16ths}
              onMyzelStep16thsChange={onMyzelStep16thsChange}
              myzelDriveEnabled={myzelDriveEnabled}
              onToggleMyzelDriveEnabled={onToggleMyzelDriveEnabled}
              room3BodyEnabled={room3BodyEnabled}
              onToggleRoom3BodyEnabled={onToggleRoom3BodyEnabled}
              onResetEnhancerMix={onResetEnhancerMix}
              myzelInterpreterMix={myzelInterpreterMix}
              onMyzelInterpreterMixChange={onMyzelInterpreterMixChange}
              room3BodyControls={room3BodyControls}
              onRoom3BodyControlsChange={onRoom3BodyControlsChange}
              room3MaterialLabel={room3MaterialLabel}
              myzelCentralColorMixer={myzelCentralColorMixer}
              onMyzelCentralColorMixerChange={onMyzelCentralColorMixerChange}
              nodalDeviceMatrix={nodalDeviceMatrix}
              onNodalDeviceEnabledChange={onNodalDeviceEnabledChange}
              onNodalDeviceAmountChange={onNodalDeviceAmountChange}
              onNodalDeviceTargetChange={onNodalDeviceTargetChange}
            />
          )}

        <div className="mt-6 rounded border border-neutral-800 bg-neutral-950/50 px-4 py-3 text-sm leading-relaxed text-neutral-400">
          {mode === "enhancer"
            ? XENSONAR_VARIANTE_TOPOLOGY_TOOL_COPY
            : "Hier soll man zuerst hören: Root unten, Ball darüber, Resident Nodes als feste hörbare Intervalle. Sonar-Wellen und Ball-Reaktion lassen sich nun getrennt verschalten, damit aus der Installation allmählich ein Instrument wird."}
        </div>
      </div>
    </div>
  );
}
