#!/usr/bin/env node
import fs from 'node:fs';

const read = (path) => fs.readFileSync(path, 'utf8');
const fail = (message) => {
  console.error(`[melodic-material-import-runtime-boundaries] FAIL: ${message}`);
  process.exit(1);
};

const gatewayPath = 'src/features/l3lab/canonicalForge/useMelodicMaterialImportGateway.ts';
const handoffPath = 'src/features/l3lab/canonicalForge/useCarrierMelodicImportHandoffRuntime.ts';
const focusPath = 'src/features/l3lab/canonicalForge/useMelodicImportRackFocusRuntime.ts';
const gateway = read(gatewayPath);
const handoff = read(handoffPath);
const focus = read(focusPath);

const gatewayLines = gateway.split(/\r?\n/).length;
if (gatewayLines > 285) fail(`gateway must stay <= 285 lines after lifecycle split, got ${gatewayLines}`);
if ((gateway.match(/React\.useEffect\(/g) ?? []).length > 4) fail('gateway may own at most selection/variant/dialog-request effects');
if (!gateway.includes('useCarrierMelodicImportHandoffRuntime({')) fail('gateway must delegate Carrier event/session handoff lifecycle');
if (!gateway.includes('useMelodicImportRackFocusRuntime({')) fail('gateway must delegate import-rack DOM/RAF lifecycle');
if (gateway.includes("listenXensonarEvent('carrierIntegralMelodicPinkExport'")) fail('gateway must not own Carrier pink event listener');
if (gateway.includes("listenXensonarEvent('carrierIntegralRawMaterialMelodicExport'")) fail('gateway must not own raw Carrier event listener');
if (gateway.includes("addEventListener('wheel', cancel")) fail('gateway must not own rack-focus user-cancel listeners');
if (gateway.includes('window.requestAnimationFrame(() => {\n      if (cancelledByUser')) fail('gateway must not own rack-focus RAF');

for (const marker of [
  "listenXensonarEvent('carrierIntegralMelodicPinkExport'",
  "listenXensonarEvent('carrierIntegralRawMaterialMelodicExport'",
  'CARRIER_INTEGRAL_PENDING_PINK_MELODIC_SESSION_KEY',
  'CARRIER_INTEGRAL_PENDING_RAW_MATERIAL_MELODIC_SESSION_KEY',
  'pendingRawCarrierMaterialHandoff',
]) {
  if (!handoff.includes(marker)) fail(`handoff owner missing ${marker}`);
}
if ((handoff.match(/React\.useEffect\(/g) ?? []).length !== 3) fail('handoff owner must contain exactly three effects: pink listener, raw listener, readiness reconciliation');
if (/requestAnimationFrame|addEventListener\('wheel'|scrollIntoView/.test(handoff)) fail('handoff owner must not acquire DOM focus/RAF ownership');

for (const marker of [
  "addEventListener('wheel', cancel",
  "addEventListener('touchmove', cancel",
  "addEventListener('keydown', cancel, true)",
  'window.requestAnimationFrame(',
  'scrollIntoView(',
  'window.cancelAnimationFrame(frame)',
]) {
  if (!focus.includes(marker)) fail(`focus owner missing ${marker}`);
}
if ((focus.match(/React\.useEffect\(/g) ?? []).length !== 1) fail('focus owner must contain exactly one lifecycle effect');
if (/sessionStorage|listenXensonarEvent|executeCarrierMelodicImport/.test(focus)) fail('focus owner must not acquire import/handoff transaction ownership');

console.log(JSON.stringify({
  ok: true,
  gatewayLines,
  gatewayEffects: (gateway.match(/React\.useEffect\(/g) ?? []).length,
  handoffEffects: (handoff.match(/React\.useEffect\(/g) ?? []).length,
  focusEffects: (focus.match(/React\.useEffect\(/g) ?? []).length,
}, null, 2));
