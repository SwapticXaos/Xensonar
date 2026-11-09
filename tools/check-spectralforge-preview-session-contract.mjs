import fs from 'node:fs';

const read = (path) => fs.readFileSync(path, 'utf8');
const types = read('src/features/l3lab/spectralForge/components/previewSession/spectralForgePreviewSessionTypes.ts');
const machine = read('src/features/l3lab/spectralForge/components/previewSession/spectralForgePreviewSessionMachine.ts');
const panel = read('src/features/l3lab/spectralForge/components/HarmonizerPanel.tsx');
const basisHearingHook = read('src/features/l3lab/spectralForge/components/harmonizerPanel/useBasisHearingAudition.ts');
const sessionHook = read('src/features/l3lab/spectralForge/components/previewSession/useSpectralForgePreviewSession.ts');
const transport = read('src/features/l3lab/spectralForge/components/TransportBar.tsx');

const requiredStates = ['idle', 'dirty', 'scheduled', 'prewarming', 'ready', 'playing', 'stale', 'error'];
for (const state of requiredStates) {
  if (!types.includes(`kind: '${state}'`)) throw new Error(`Preview session state missing ${state}`);
}
for (const event of ['markDirty', 'schedule', 'prewarmStart', 'prewarmProgress', 'ready', 'playStart', 'playEnd', 'staleResult', 'error']) {
  if (!types.includes(`type: '${event}'`)) throw new Error(`Preview session event missing ${event}`);
}
for (const needle of ['expectedKey && expectedKey !== event.requestKey', "kind: 'stale'", 'clampProgress']) {
  if (!machine.includes(needle)) throw new Error(`Preview session reducer missing guard: ${needle}`);
}
if (!sessionHook.includes('reduceSpectralForgePreviewSession')) throw new Error('useSpectralForgePreviewSession must own the session reducer');
if (!sessionHook.includes('SpectralForgePreviewSessionState')) throw new Error('useSpectralForgePreviewSession must hold typed preview session state');
if (!basisHearingHook.includes('useSpectralForgePreviewSession<')) throw new Error('useBasisHearingAudition must consume the preview session boundary hook');
if (!(basisHearingHook.includes('previewSessionDriver.schedule(previewRequest)') && basisHearingHook.includes("session: { type: 'ready'"))) throw new Error('useBasisHearingAudition must mirror basis-hearing events through the preview session driver');
if (!transport.includes('useSpectralForgePreviewSession')) throw new Error('TransportBar must consume the shared preview session hook');
if (!(transport.includes('previewSessionDriver,') && transport.includes('previewSessionDriver.schedule('))) throw new Error('TransportBar does not mirror preview events through the preview session driver yet');
if (!panel.includes('useBasisHearingAudition()')) throw new Error('HarmonizerPanel must consume the basis-hearing session boundary hook');
console.log('[xensonar] preview session contract probe green');
