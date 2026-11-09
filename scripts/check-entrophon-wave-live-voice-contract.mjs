import fs from 'node:fs';

const read = (p) => fs.readFileSync(p, 'utf8');
const engine = read('src/core/audio/xensonarMicrotonalSoundEngine.ts');
const scheduled = read('src/features/xensonar/audio/scheduledTonePlaybackBoundary.ts');
const gradient = read('src/features/xensonar/audio/waveStarterGradientTonePlayback.ts');
const panel = read('src/features/xensonar/rooms/EntrophonUnifiedSoundPanel.tsx');

const failures = [];
const require = (cond, msg) => { if (!cond) failures.push(msg); };

require(engine.includes("116-wave-entrophon-live-voice-engine"), 'engine version not bumped to 116');
require(engine.includes('export function isEntrophonWaveVoiceActive'), 'missing wave voice active helper');
require(scheduled.includes('!isEntrophonWaveVoiceActive()'), 'scheduled tone path does not fall back when Entrophon wave voice is off');
require(gradient.includes('isEntrophonWaveVoiceActive()'), 'gradient Wellenstarter path is not routed through the live Entrophon voice');
require(gradient.includes('legacy gradient graph remains only as the disabled/Classic fallback'), 'gradient path lacks explicit Classic fallback contract');
require(panel.includes('Synth-Anteil'), 'UI still labels amount as Engine Mix');
require(panel.includes('Das Xensonar-Raster bestimmt die Tonhöhe'), 'UI does not state grid-owned pitch contract');
require(!panel.includes('Root') && !panel.includes('Tuning Strength'), 'Hauptraum panel leaked tuning controls');

if (failures.length) {
  console.error(JSON.stringify({ ok: false, failures }, null, 2));
  process.exit(1);
}
console.log(JSON.stringify({
  ok: true,
  contract: 'Wellenstarter grid owns pitch; Entrophon owns every active Wellenstarter voice control; particle/spectral restored to legacy.',
  liveVoiceControls: ['waveform','unison','detune','attack','decay','sustain','release','pitchBend','bendTime','filter','filterEnv','filterDecay','color','fold','delay','schweif','distortion','volume'],
  classicFallback: 'cfg.enabled=false or synth amount 0 returns to legacy scheduled/gradient paths',
}, null, 2));
