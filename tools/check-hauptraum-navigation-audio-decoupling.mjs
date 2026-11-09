#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const checks = [];
const ok = (name, pass, detail = '') => checks.push({ name, pass, detail });

const nav = read('src/features/xensonar/layout/hauptraumNavigationContract.ts');
const shell = read('src/features/xensonar/layout/appShellProps.ts');
const viewport = read('src/features/xensonar/rooms/appRoomViewportProps.ts');
const app = read('src/App.tsx');
const warmup = read('src/features/xensonar/audio/silentAudioWarmup.ts');

ok('navigation contract exists', nav.includes('HAUPTRAUM_NAVIGATION_AUDIO_CONTRACT') && nav.includes('enterXensonarHauptraumRoute'));
ok('navigation contract declares audio forbidden', nav.includes("audioSideEffects: 'forbidden'"));
for (const forbidden of ['ensureAudioReady', 'prewarmAudioRuntime', 'spawnNexusRipple', 'previewWaveStarterPresetSelection', 'previewParticlePresetSelection']) {
  const executableNavBody = nav.split('export function enterXensonarHauptraumRoute')[1] ?? '';
  ok(`route helper does not call ${forbidden}`, !executableNavBody.includes(`${forbidden}(`));
}
ok('header Hauptraum button uses route helper', shell.includes('enterXensonarHauptraumRoute({') && !shell.includes("args.setRoom('RESONANCE');"));
ok('room viewport Hauptraum entries use route helper', viewport.includes('enterXensonarHauptraumRoute({') && !viewport.includes("args.setRoom('RESONANCE');"));
ok('App auxiliary return uses route helper', app.includes('enterXensonarHauptraumRoute({ setRoom, setFamilyRequestedActive })'));
ok('legacy inline audible warmup helper removed from App', !app.includes('scheduleSilentWarmTone') && !app.includes('linearRampToValueAtTime(0.00012'));
ok('warmup helper is zero-output', warmup.includes('outputGain: 0') && warmup.includes('setValueAtTime(SILENT_AUDIO_WARMUP_CONTRACT.outputGain'));
ok('warmup helper documents no Hauptraum-navigation coupling', warmup.includes('Hauptraum navigation') && warmup.includes('room tab click'));

const failed = checks.filter((entry) => !entry.pass);
for (const entry of checks) {
  console.log(`${entry.pass ? 'ok' : 'FAIL'} - ${entry.name}${entry.detail ? ` :: ${entry.detail}` : ''}`);
}
if (failed.length > 0) {
  console.error(`
Hauptraum navigation/audio decoupling failed: ${failed.length}/${checks.length}`);
  process.exit(1);
}
console.log(`
Hauptraum navigation/audio decoupling passed: ${checks.length}/${checks.length}`);
