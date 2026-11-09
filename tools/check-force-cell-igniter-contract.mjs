#!/usr/bin/env node
import fs from 'node:fs';

const igniter = fs.readFileSync('src/features/xensonar/audio/forceCellIgniter.ts', 'utf8');
const app = fs.readFileSync('src/App.tsx', 'utf8');
const main = fs.readFileSync('src/main.tsx', 'utf8');
const fail = (message) => { console.error(`[force-cell-igniter] FAIL: ${message}`); process.exit(1); };

for (const forbidden of ['useState', 'setState', 'setStableMusicLane', 'getLiveMasterBus', 'buildStableMusicLaneSnapshot', 'useStableMusicLaneRuntimeBoundary']) {
  if (igniter.includes(forbidden)) fail(`igniter must not include ${forbidden}`);
}

for (const required of [
  'class XensonarForceCellProcessor extends AudioWorkletProcessor',
  'process(_inputs, outputs)',
  'channel[i] = this.running ? Math.sin(this.phase) * gain : 0',
  'new AudioWorkletNode(ctx, FORCE_CELL_PROCESSOR_NAME',
  'node.connect(gain)',
  'gain.connect(ctx.destination)',
  'ctx.audioWorklet.addModule(url)',
  'await ctx.resume()',
  'force-cell-start',
  'force-cell-stop',
  'installForceCellBodyButton',
  "document.body.appendChild(panel)",
  "button.addEventListener('click', activate",
]) {
  if (!igniter.includes(required)) fail(`missing required force-cell fragment: ${required}`);
}

if (app.includes('toggleForceCell') || app.includes('KRAFTSTROM TESTEN') || app.includes('data-xensonar-force-cell-igniter')) {
  fail('App.tsx must not render or own the ForceCell button in body-DOM branch');
}
if (!main.includes('installForceCellBodyButton')) fail('main.tsx must install the body-DOM force-cell button');
if (app.includes('<StableMusicLaneSpeakerProbeOverlay')) fail('StableMusicLaneSpeakerProbeOverlay must not be mounted in force-cell branch');
if (app.includes('useStableMusicLaneRuntimeBoundary({')) fail('force-cell branch must not run StableMusicLane runtime hook');

console.log('[force-cell-igniter] PASS');
