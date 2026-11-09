import fs from 'node:fs';

const app = fs.readFileSync('src/App.tsx', 'utf8');
const frame = fs.readFileSync('src/features/xensonar/audio/useAppDroneFrameMixSyncBoundary.ts', 'utf8');

const fail = (message) => {
  console.error(`[drone-hard-mute-contract] FAIL: ${message}`);
  process.exit(1);
};

if (!app.includes('const droneHardMuted = droneVolume <= 0.0005;')) fail('App frame loop must compute droneHardMuted from droneVolume');
for (const needle of [
  'gain.gain.setTargetAtTime(droneHardMuted ? 0.0001',
  'state.gainB.gain.setTargetAtTime(droneHardMuted ? 0.0001',
  'g.gain.setTargetAtTime(droneHardMuted ? 0',
  'state.delayFeedback.gain.setTargetAtTime(!droneHardMuted && p.echoOn',
  'state.myceliumFormantGain.gain.setTargetAtTime(droneHardMuted ? 0',
]) {
  if (!app.includes(needle)) fail(`App drone cursor-follow path must hard-mute: ${needle}`);
}
for (const needle of [
  'const droneHardMuted = droneVolume <= 0.0005;',
  'refs.droneRhythmGain.gain.setTargetAtTime(wovenRhythm',
  'const wovenRhythm = droneHardMuted ? 0',
  'refs.manualJiMaster.gain.setTargetAtTime(droneHardMuted ? 0.0001',
  'enabled: !droneHardMuted && !!nParamsUI.droneDriveOn',
  'refs.flangerWet.gain.setTargetAtTime(droneHardMuted ? 0',
  'const target = droneHardMuted ? 0',
]) {
  if (!frame.includes(needle)) fail(`Drone frame mix must hard-mute internal/fx path: ${needle}`);
}

console.log('[drone-hard-mute-contract] PASS');
