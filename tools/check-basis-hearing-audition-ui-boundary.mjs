import fs from 'node:fs';

const boundaryPath = 'src/features/l3lab/spectralForge/components/harmonizerPanel/basisHearingAuditionUi.ts';
const hookPath = 'src/features/l3lab/spectralForge/components/harmonizerPanel/useBasisHearingAudition.ts';
const panelPath = 'src/features/l3lab/spectralForge/components/HarmonizerPanel.tsx';
const boundary = fs.readFileSync(boundaryPath, 'utf8');
const hook = fs.readFileSync(hookPath, 'utf8');
const panel = fs.readFileSync(panelPath, 'utf8');

for (const needle of ['resolveBasisHearingAuditionUi', 'visuallyActive', 'statusLabel', 'progressPercent']) {
  if (!boundary.includes(needle)) throw new Error(`basis hearing audition UI boundary missing ${needle}`);
}
if (!hook.includes("import {\n  resolveBasisHearingAuditionUi") && !hook.includes('resolveBasisHearingAuditionUi')) {
  throw new Error('useBasisHearingAudition must consume basisHearingAuditionUi boundary');
}
if (!panel.includes("import { useBasisHearingAudition }")) {
  throw new Error('HarmonizerPanel must consume useBasisHearingAudition boundary');
}
if (panel.includes("auditionForOption?.phase === 'playing'")) {
  throw new Error('HarmonizerPanel still owns inline status-label phase cascade');
}
console.log('[xensonar] basis hearing audition UI boundary green');
