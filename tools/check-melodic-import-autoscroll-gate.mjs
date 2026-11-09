#!/usr/bin/env node
import fs from 'node:fs';

const panelPath = 'src/features/l3lab/canonicalForge/melodicLoopPanel.tsx';
const panel = fs.readFileSync(panelPath, 'utf8');
function fail(msg) {
  console.error(`[melodic-import-autoscroll-gate] FAIL: ${msg}`);
  process.exit(1);
}
function requirePattern(pattern, label) {
  if (!pattern.test(panel)) fail(`missing ${label}`);
}

const scrollEffect = panel.match(/React\.useEffect\(\(\) => \{\n  if \(melodicImportRackFocusNonce[\s\S]*?\n\}, \[melodicImportRackFocusNonce, showMaterialImportMenu\]\);/);
if (!scrollEffect) fail('gated import-rack scroll effect block');
const block = scrollEffect[0];
if (!/!showMaterialImportMenu/.test(block)) fail('import-rack autoscroll must only run while import menu is open');
if (/setTimeout\s*\(/.test(block)) fail('import-rack autoscroll must not install delayed snap-back timer');
if (!/addEventListener\('wheel', cancel/.test(block) || !/addEventListener\('touchmove', cancel/.test(block) || !/addEventListener\('keydown', cancel/.test(block)) {
  fail('import-rack autoscroll must be cancellable by user scroll/touch/key input');
}
if (!/removeEventListener\('wheel', cancel, true/.test(block) || !/cancelAnimationFrame\(frame\)/.test(block)) {
  fail('import-rack autoscroll must clean up listeners and RAF');
}

const directBlock = panel.match(/const queueCarrierPinkExportForImportDialog = React\.useCallback\([\s\S]*?\n\}, \[[^\]]*\]\);/)?.[0] ?? '';
if (!directBlock) fail('carrier pink handoff queue block');
const successBlock = directBlock.match(/if \(previewResult\.applied\) \{[\s\S]*?\n  \}\n\n  setShowMaterialImportMenu\(true\)/)?.[0] ?? '';
if (!successBlock) fail('carrier pink success/fallback split');
if (/setMelodicImportRackFocusNonce/.test(successBlock)) fail('successful pink direct apply must not schedule import-rack autoscroll');
if (!/setShowMaterialImportMenu\(false\)/.test(successBlock)) fail('successful pink direct apply must close import menu');

requirePattern(/const previewDraft = cloneLoopComposerState\(loopComposer\);[\s\S]*?const previewResult = applyAudioPaintDetailToLoopDraft\(previewDraft, detail, carrierPinkVariant, anchorHz\);[\s\S]*?if \(!previewResult\.applied\)/, 'manual audio-paint import synchronous preview gate');
requirePattern(/const previewDraft = cloneLoopComposerState\(loopComposer\);[\s\S]*?const applyResult = applyAudioPaintDetailToLoopDraft\(previewDraft, rebuild\.detail \?\? null, carrierPinkVariant, anchorHz\);/, 'rebuilt audio-paint import synchronous preview gate');

console.log('[melodic-import-autoscroll-gate] OK');
