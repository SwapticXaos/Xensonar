import fs from 'node:fs';
const read = p => fs.readFileSync(p,'utf8');
const app = read('src/App.tsx');
const hook = read('src/features/xensonar/browserImplant/useBrowserWaveStarterImplant.ts');
const proc = read('src/features/xensonar/browserImplant/generated/xensonar-c11-worklet.bundle.js');
const host = read('src/features/xensonar/browserImplant/worklet/browserC11Host.ts');
const entrophonHook = read('src/features/xensonar/browserImplant/useBrowserEntrophonImplant.ts');
const scheduled = read('src/features/xensonar/audio/scheduledTonePlaybackBoundary.ts');
const checks = {
  browserOwnerBeforeNative: app.indexOf('browserWaveStarterImplant.tryAttack') >= 0 && app.indexOf('browserWaveStarterImplant.tryAttack') < app.indexOf('nativeWaveStarterPilot.tryAttack'),
  browserOwnerBeforeLegacyRenderer: app.indexOf('browserWaveStarterImplant.tryAttack') < app.indexOf('emitWaveStarterAttack({'),
  onlyDirectPresetGate: app.indexOf('browserWaveStarterImplant.tryAttack') > app.indexOf("if (options?.legacy9061DirectGate === true)"),
  existingMasterUsed: hook.includes("getLiveMasterBusRuntime(ctx, args.liveMasterBusRuntimeRefs, 'main')"),
  noSecondAudioContext: !hook.includes('new AudioContext('),
  compiledWasmOnMainThread: hook.includes('WebAssembly.compile(bytes)'),
  noExternalWasmFetch: !hook.includes('fetch(') && !host.includes('fetch('),
  workletCallsRealKernel: proc.includes('xen_wasm_render') && proc.includes('xen_wasm_submit_record'),
  directCompatibilitySubmitExportRetained: read('tools/browser-implant/wasm/xen_wasm_bridge.c').includes('xen_wasm_submit_tone_record'),
  entrophonUsesSiblingProfile: entrophonHook.includes('new XensonarBrowserC11Host(ctx, destination, 1)'),
  entrophonCutBeforeLegacyGraph: scheduled.indexOf('submitEntrophonC11(deps.ctx') >= 0 && scheduled.indexOf('submitEntrophonC11(deps.ctx') < scheduled.indexOf('const graph = createScheduledToneGraph();', scheduled.indexOf('export function playScheduledToneWithLifecycle')),
  entrophonNoTopLevelLegacyBypassLabel: !app.includes("noteLegacyBypass('entrophon-active'"),
  entrophonHeldSpecialPreserved: scheduled.includes('if (deps.heldLong)') && scheduled.includes('held-special-path'),
  noJsSynthInWorklet: !/(createOscillator|OscillatorNode|BiquadFilterNode|createBiquadFilter|AudioBufferSourceNode|createBufferSource)/.test(proc),
  noWorkletMusicScheduler: !/(setTimeout|setInterval|requestAnimationFrame)/.test(proc),
  messagePortAndSabAdaptive: hook.includes('XensonarBrowserC11Host') && proc.includes('SharedArrayBuffer'),
  staleAgePreserved: hook.includes('requestedAtMs - nowMs'),
};
const failed = Object.entries(checks).filter(([,v])=>!v).map(([k])=>k);
console.log(JSON.stringify({pass:failed.length===0, checks, failed}, null, 2));
if (failed.length) process.exit(1);
