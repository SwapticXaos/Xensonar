import fs from 'node:fs';

const app = fs.readFileSync('src/App.tsx', 'utf8');
const main = fs.readFileSync('src/main.tsx', 'utf8');
const igniter = fs.readFileSync('src/features/xensonar/audio/forceCellIgniter.ts', 'utf8');

function fail(message) {
  console.error(`[force-cell-body-button] FAIL: ${message}`);
  process.exit(1);
}

if (app.includes('data-xensonar-force-cell-igniter')) {
  fail('ForceCell button must not be rendered inside App.tsx/React tree');
}
if (!main.includes('installForceCellBodyButton')) {
  fail('main.tsx must install the ForceCell body button outside AppShell');
}
for (const token of [
  'document.body.appendChild(panel)',
  "panel.dataset.xensonarForceCellPanel = 'true'",
  "button.dataset.xensonarForceCellIgniter = 'true'",
  "pointerEvents: 'auto'",
  "zIndex: '2147483647'",
  "button.addEventListener('click', activate",
  "void toggleForceCell(!forceCellState.running)",
  "node.connect(gain)",
  "gain.connect(ctx.destination)",
]) {
  if (!igniter.includes(token)) fail(`missing contract token: ${token}`);
}
if (igniter.includes('getLiveMasterBus') || igniter.includes('useStableMusicLane') || igniter.includes('stableMusicLaneWorklet') || igniter.includes('StableMusicLaneRuntime')) {
  fail('ForceCell igniter must not import or call Xensonar bus/StableMusicLane runtime code');
}
console.log('[force-cell-body-button] PASS');
