import { MYZEL_POST_FX_GROUPS } from '../xensonar/architecture/machineRooms';
import { MYZEL_BALL_MODE_OPTIONS, MYZEL_NODE_MODE_OPTIONS, MYZEL_PATTERNS } from '../xensonar/domain/instrumentData';
import type { MyzelTopologyPanelProps } from './myzelTopologyPanelTypes';
import { MyzelRoom3SynthControls } from './MyzelRoom3SynthControls';

type Props = Pick<
  MyzelTopologyPanelProps,
  | 'postFxGroup'
  | 'onPostFxGroupChange'
  | 'postFxEnabled'
  | 'onTogglePostFxEnabled'
  | 'followForgeHandoff'
  | 'onFollowForgeHandoffChange'
  | 'postFxDepth'
  | 'onPostFxDepthChange'
  | 'postFxParallel'
  | 'onPostFxParallelChange'
  | 'activeGroupSummary'
  | 'activeGroupReceivesFrom'
  | 'activeGroupKeepsStableBy'
  | 'handoffSummary'
  | 'handoffBalanceCarrier'
  | 'myzelPattern'
  | 'onMyzelPatternChange'
  | 'myzelBallMode'
  | 'onMyzelBallModeChange'
  | 'myzelNodeMode'
  | 'onMyzelNodeModeChange'
  | 'myzelStep16ths'
  | 'onMyzelStep16thsChange'
  | 'myzelDriveEnabled'
  | 'onToggleMyzelDriveEnabled'
  | 'room3BodyEnabled'
  | 'onToggleRoom3BodyEnabled'
  | 'onResetEnhancerMix'
  | 'myzelInterpreterMix'
  | 'onMyzelInterpreterMixChange'
  | 'room3BodyControls'
  | 'onRoom3BodyControlsChange'
  | 'room3MaterialLabel'
  | 'myzelCentralColorMixer'
  | 'onMyzelCentralColorMixerChange'
  | 'nodalDeviceMatrix'
  | 'onNodalDeviceEnabledChange'
  | 'onNodalDeviceAmountChange'
  | 'onNodalDeviceTargetChange'
>;

export function MyzelEnhancerControls(props: Props) {
  const {
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
    room3BodyControls,
    onRoom3BodyControlsChange,
    room3MaterialLabel,
    myzelCentralColorMixer,
    onMyzelCentralColorMixerChange,
    nodalDeviceMatrix,
    onNodalDeviceEnabledChange,
    onNodalDeviceAmountChange,
    onNodalDeviceTargetChange,
  } = props;

  return (
    <div className="mt-6 space-y-5">
      <div className="grid gap-3 md:grid-cols-5">
        {MYZEL_POST_FX_GROUPS.map((group) => (
          <button
            key={group.id}
            type="button"
            onClick={() => onPostFxGroupChange(group.id)}
            className={`rounded border px-3 py-2 text-left text-xs transition-colors ${postFxGroup === group.id ? "border-fuchsia-500 bg-fuchsia-950/30 text-fuchsia-100" : "border-neutral-800 bg-neutral-950/40 text-neutral-300 hover:bg-neutral-900"}`}
          >
            <div className="uppercase tracking-[0.2em] text-[10px] text-fuchsia-300/80">{group.label}</div>
            <div className="mt-1 leading-relaxed text-neutral-400">{group.summary}</div>
          </button>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <div className="rounded border border-neutral-800 bg-neutral-950/50 px-3 py-2 text-[11px] text-neutral-400">
          <div className="uppercase tracking-[0.2em] text-neutral-500">Scoped Post-FX</div>
          <button
            type="button"
            onClick={onTogglePostFxEnabled}
            className={`mt-2 w-full rounded border px-3 py-2 text-left text-xs transition-colors ${postFxEnabled ? "border-fuchsia-500 bg-fuchsia-950/30 text-fuchsia-100" : "border-neutral-800 bg-neutral-950/40 text-neutral-400 hover:bg-neutral-900"}`}
          >
            {postFxEnabled ? "Post-FX aktiv" : "Post-FX bypass"}
          </button>
          <div className="mt-2 leading-relaxed">{activeGroupSummary}</div>
        </div>
        <div className="rounded border border-neutral-800 bg-neutral-950/50 px-3 py-2 text-[11px] text-neutral-400">
          <div className="uppercase tracking-[0.2em] text-neutral-500">Forge-Handoff</div>
          <label className="mt-2 flex items-center gap-2 text-xs text-neutral-300">
            <input type="checkbox" checked={followForgeHandoff} onChange={(event) => onFollowForgeHandoffChange(event.target.checked)} />
            Myzel folgt bevorzugter Forge-Gruppe
          </label>
          <div className="mt-2 leading-relaxed">{handoffSummary}</div>
          {handoffBalanceCarrier ? <div className="mt-2 text-neutral-500">Balance-Träger: {handoffBalanceCarrier}</div> : null}
        </div>
        <label className="block text-xs text-neutral-400">
          <span className="mb-1 block text-neutral-500">Fokustiefe {(postFxDepth * 100).toFixed(0)}%</span>
          <input type="range" min="0" max="1" step="0.01" value={postFxDepth} onChange={(event) => onPostFxDepthChange(parseFloat(event.target.value))} className="w-full cursor-pointer" />
        </label>
        <label className="block text-xs text-neutral-400">
          <span className="mb-1 block text-neutral-500">Parallel {(postFxParallel * 100).toFixed(0)}%</span>
          <input type="range" min="0" max="1" step="0.01" value={postFxParallel} onChange={(event) => onPostFxParallelChange(parseFloat(event.target.value))} className="w-full cursor-pointer" />
        </label>
        <div className="rounded border border-neutral-800 bg-neutral-950/50 px-3 py-2 text-[11px] text-neutral-400">
          <div className="uppercase tracking-[0.2em] text-neutral-500">Aktive Route</div>
          <div className="mt-2 leading-relaxed">nimmt auf: {activeGroupReceivesFrom}</div>
          <div className="mt-2 leading-relaxed text-neutral-500">stabilisiert durch: {activeGroupKeepsStableBy}</div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <div>
          <label className="mb-1 block text-xs text-neutral-500">Myzel Rhythmus</label>
          <select value={myzelPattern} onChange={(event) => onMyzelPatternChange(event.target.value as typeof myzelPattern)} className="w-full bg-neutral-950 border border-neutral-700 p-1 text-sm text-neutral-300">
            {MYZEL_PATTERNS.map((pattern) => <option key={pattern.value} value={pattern.value}>{pattern.label}</option>)}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs text-neutral-500">Ball-Deutung</label>
          <select value={myzelBallMode} onChange={(event) => onMyzelBallModeChange(event.target.value as typeof myzelBallMode)} className="w-full bg-neutral-950 border border-neutral-700 p-1 text-sm text-neutral-300">
            {MYZEL_BALL_MODE_OPTIONS.map((entry) => <option key={entry.value} value={entry.value}>{entry.label}</option>)}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs text-neutral-500">Node-Deutung</label>
          <select value={myzelNodeMode} onChange={(event) => onMyzelNodeModeChange(event.target.value as typeof myzelNodeMode)} className="w-full bg-neutral-950 border border-neutral-700 p-1 text-sm text-neutral-300">
            {MYZEL_NODE_MODE_OPTIONS.map((entry) => <option key={entry.value} value={entry.value}>{entry.label}</option>)}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs text-neutral-500">Myzel-Takt (16tel)</label>
          <select value={String(myzelStep16ths)} onChange={(event) => onMyzelStep16thsChange(parseInt(event.target.value, 10))} className="w-full bg-neutral-950 border border-neutral-700 p-1 text-sm text-neutral-300">
            {Array.from({ length: 9 }, (_, index) => index + 1).map((step) => <option key={step} value={step}>{step}</option>)}
          </select>
        </div>
      </div>

      <div className="rounded border border-neutral-800 bg-neutral-950/70 p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3 border-b border-neutral-800 pb-2">
          <div className="text-[10px] uppercase tracking-[0.24em] text-neutral-500">Enhancer-Parameter</div>
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={onToggleMyzelDriveEnabled} className={`px-2.5 py-1 text-[10px] uppercase tracking-widest border transition-colors ${myzelDriveEnabled ? "border-rose-400/70 text-rose-100 bg-rose-950/30 hover:bg-rose-900/40" : "border-neutral-700 text-neutral-300 hover:bg-neutral-900"}`}>Myzel Drive {myzelDriveEnabled ? "An" : "Aus"}</button>
            <button type="button" onClick={onToggleRoom3BodyEnabled} className={`px-2.5 py-1 text-[10px] uppercase tracking-widest border transition-colors ${room3BodyEnabled ? "border-cyan-400/70 text-cyan-100 bg-cyan-950/30 hover:bg-cyan-900/40" : "border-neutral-700 text-neutral-300 hover:bg-neutral-900"}`}>Körper {room3BodyEnabled ? "An" : "Aus"}</button>
            <button type="button" onClick={onResetEnhancerMix} className="px-2.5 py-1 text-[10px] uppercase tracking-widest border border-neutral-700 text-neutral-300 hover:bg-neutral-900">Reset Mix</button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-5">
          <label className="block text-xs text-neutral-400"><span className="mb-1 block text-neutral-500">Hybrid ↔ Woven {(myzelInterpreterMix.hybridBlend * 100).toFixed(0)}%</span><input type="range" min="0" max="1" step="0.01" value={myzelInterpreterMix.hybridBlend} onChange={(event) => onMyzelInterpreterMixChange("hybridBlend", parseFloat(event.target.value))} className="w-full cursor-pointer" /></label>
          <label className="block text-xs text-neutral-400"><span className="mb-1 block text-neutral-500">Woven Pull {(myzelInterpreterMix.weaveBlend * 100).toFixed(0)}%</span><input type="range" min="0" max="1" step="0.01" value={myzelInterpreterMix.weaveBlend} onChange={(event) => onMyzelInterpreterMixChange("weaveBlend", parseFloat(event.target.value))} className="w-full cursor-pointer" /></label>
          <label className="block text-xs text-neutral-400"><span className="mb-1 block text-neutral-500">Sternbild Direktheit {(myzelInterpreterMix.constellationBlend * 100).toFixed(0)}%</span><input type="range" min="0" max="1" step="0.01" value={myzelInterpreterMix.constellationBlend} onChange={(event) => onMyzelInterpreterMixChange("constellationBlend", parseFloat(event.target.value))} className="w-full cursor-pointer" /></label>
          <label className="block text-xs text-neutral-400"><span className="mb-1 block text-neutral-500">Myzel Drive {(myzelInterpreterMix.driveAmount * 100).toFixed(0)}%</span><input type="range" min="0" max="1" step="0.01" value={myzelInterpreterMix.driveAmount} onChange={(event) => onMyzelInterpreterMixChange("driveAmount", parseFloat(event.target.value))} className="w-full cursor-pointer" disabled={!myzelDriveEnabled} /></label>
          <label className="block text-xs text-neutral-400"><span className="mb-1 block text-neutral-500">Drive Reaktion {(myzelInterpreterMix.driveResponse * 100).toFixed(0)}%</span><input type="range" min="0" max="1" step="0.01" value={myzelInterpreterMix.driveResponse} onChange={(event) => onMyzelInterpreterMixChange("driveResponse", parseFloat(event.target.value))} className="w-full cursor-pointer" /></label>
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-5">
          <label className="block text-xs text-neutral-400"><span className="mb-1 block text-neutral-500">Körper-Kopplung {(room3BodyControls.coupling * 100).toFixed(0)}%</span><input type="range" min="0" max="1" step="0.01" value={room3BodyControls.coupling} onChange={(event) => onRoom3BodyControlsChange("coupling", parseFloat(event.target.value))} className="w-full cursor-pointer" /></label>
          <label className="block text-xs text-neutral-400"><span className="mb-1 block text-neutral-500">Materialachse {(room3BodyControls.material * 100).toFixed(0)}%</span><input type="range" min="0" max="1" step="0.01" value={room3BodyControls.material} onChange={(event) => onRoom3BodyControlsChange("material", parseFloat(event.target.value))} className="w-full cursor-pointer" /></label>
          <label className="block text-xs text-neutral-400"><span className="mb-1 block text-neutral-500">Luft / Noise {(room3BodyControls.air * 100).toFixed(0)}%</span><input type="range" min="0" max="1" step="0.01" value={room3BodyControls.air} onChange={(event) => onRoom3BodyControlsChange("air", parseFloat(event.target.value))} className="w-full cursor-pointer" /></label>
          <label className="block text-xs text-neutral-400"><span className="mb-1 block text-neutral-500">Rauheit {(room3BodyControls.roughness * 100).toFixed(0)}%</span><input type="range" min="0" max="1" step="0.01" value={room3BodyControls.roughness} onChange={(event) => onRoom3BodyControlsChange("roughness", parseFloat(event.target.value))} className="w-full cursor-pointer" /></label>
          <label className="block text-xs text-neutral-400"><span className="mb-1 block text-neutral-500">Resonanzfokus {(room3BodyControls.resonance * 100).toFixed(0)}%</span><input type="range" min="0" max="1" step="0.01" value={room3BodyControls.resonance} onChange={(event) => onRoom3BodyControlsChange("resonance", parseFloat(event.target.value))} className="w-full cursor-pointer" /></label>
        </div>

        <div className="mt-3 text-[11px] leading-relaxed text-neutral-500">
          Aktuelle Materialfamilie: <span className="text-cyan-200">{room3MaterialLabel}</span>
        </div>
      </div>

      <MyzelRoom3SynthControls
        myzelCentralColorMixer={myzelCentralColorMixer}
        onMyzelCentralColorMixerChange={onMyzelCentralColorMixerChange}
        nodalDeviceMatrix={nodalDeviceMatrix}
        onNodalDeviceEnabledChange={onNodalDeviceEnabledChange}
        onNodalDeviceAmountChange={onNodalDeviceAmountChange}
        onNodalDeviceTargetChange={onNodalDeviceTargetChange}
      />
    </div>
  );
}
