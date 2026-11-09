import fs from 'node:fs';
const report = 'src/features/xensonar/audio/waveStarterSynthFailoverEnvelopeOvertoneRefine.ts';
const bridge = 'src/features/xensonar/audio/waveStarterWorkletPilotBridge.ts';
const ui = 'src/features/xensonar/performanceCrisis/ui/PerformanceCrisisManagementPanel.tsx';
for (const file of [report, bridge, ui]) if (!fs.existsSync(file)) throw new Error(`${file} missing`);
const r = fs.readFileSync(report, 'utf8');
for (const token of ['sourceAwareEnvelopeEnabled: true', 'prominenceAwareGainEnabled: true', 'overtoneGainBounded: true', 'mainThreadBodyExciterNotDuplicated: true']) {
  if (!r.includes(token)) throw new Error(`report missing ${token}`);
}
const b = fs.readFileSync(bridge, 'utf8');
for (const token of ['const source = tone.source', 'sourceGainScale', 'const attackSec', 'const releaseSec', 'voice.prominence = prominence']) {
  if (!b.includes(token)) throw new Error(`bridge synth refine missing ${token}`);
}
const u = fs.readFileSync(ui, 'utf8');
if (!u.includes('Wellenstarter Synth-Hüllkurve')) throw new Error('Synth-Hüllkurve UI line missing');
console.log('wave-starter synth envelope/overtone refine contract OK');
