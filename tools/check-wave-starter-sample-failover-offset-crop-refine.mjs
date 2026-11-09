import fs from 'node:fs';
const report = 'src/features/xensonar/audio/waveStarterSampleFailoverOffsetCropRefine.ts';
const bridge = 'src/features/xensonar/audio/waveStarterWorkletPilotBridge.ts';
const ui = 'src/features/xensonar/performanceCrisis/ui/PerformanceCrisisManagementPanel.tsx';
for (const file of [report, bridge, ui]) if (!fs.existsSync(file)) throw new Error(`${file} missing`);
const r = fs.readFileSync(report, 'utf8');
for (const token of ['usesCropStartPlusOffset: true', 'clampsToCropWindow: true', 'loopStillDisabled: true', 'WAVE_STARTER_SAMPLE_FAILOVER_OFFSET_CROP_REFINE_GLOBAL']) {
  if (!r.includes(token)) throw new Error(`report missing ${token}`);
}
const b = fs.readFileSync(bridge, 'utf8');
for (const token of ['cropStartFrame + offsetFrames', 'cropEndFrame', 'Math.min(cropEndFrame - 1']) {
  if (!b.includes(token)) throw new Error(`bridge offset/crop refine missing ${token}`);
}
const u = fs.readFileSync(ui, 'utf8');
if (!u.includes('Wellenstarter Sample-Crop')) throw new Error('Sample-Crop UI line missing');
console.log('wave-starter sample offset/crop refine contract OK');
