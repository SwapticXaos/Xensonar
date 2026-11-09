#!/usr/bin/env node
import fs from 'node:fs';

const read = (path) => fs.readFileSync(path, 'utf8');
const fail = (message) => {
  console.error(`[xensonar][canonical-lifecycle-boundary] ${message}`);
  process.exit(1);
};
const assertIncludes = (content, needle, label) => {
  if (!content.includes(needle)) fail(`${label} missing: ${needle}`);
};
const assertNotIncludes = (content, needle, label) => {
  if (content.includes(needle)) fail(`${label} must not include: ${needle}`);
};

const wrapperPath = 'src/features/l3lab/canonicalForge/useCanonicalForgeLifecycleEffects.ts';
const handoffPath = 'src/features/l3lab/canonicalForge/useCanonicalForgeHandoffEffects.ts';
const previewPath = 'src/features/l3lab/canonicalForge/useCanonicalForgePreviewLifecycleEffects.ts';
const intakePath = 'src/features/l3lab/canonicalForge/useCanonicalForgeIntakeBridgeEffect.ts';
for (const path of [wrapperPath, handoffPath, previewPath, intakePath]) {
  if (!fs.existsSync(path)) fail(`expected file missing: ${path}`);
}

const wrapper = read(wrapperPath);
const handoff = read(handoffPath);
const preview = read(previewPath);
const intake = read(intakePath);

assertIncludes(wrapper, 'useCanonicalForgeHandoffEffects', 'wrapper');
assertIncludes(wrapper, 'useCanonicalForgePreviewLifecycleEffects', 'wrapper');
assertIncludes(wrapper, 'useCanonicalForgeIntakeBridgeEffect', 'wrapper');
assertNotIncludes(wrapper, 'consumeMicrotoMelodicLoopSeedHandoff', 'wrapper');
assertNotIncludes(wrapper, 'consumeForgeAudioHandoff', 'wrapper');
assertNotIncludes(wrapper, 'registerCanonicalIntakeEventBridge', 'wrapper');
assertNotIncludes(wrapper, 'reportXensonarPromiseFailure', 'wrapper');

assertIncludes(handoff, 'consumeMicrotoMelodicLoopSeedHandoff', 'handoff hook');
assertIncludes(handoff, 'consumeForgeAudioHandoff', 'handoff hook');
assertIncludes(handoff, 'commitMelodicPatternStores', 'handoff hook');
assertNotIncludes(handoff, 'registerCanonicalIntakeEventBridge', 'handoff hook');
assertNotIncludes(handoff, 'reportXensonarPromiseFailure', 'handoff hook');

assertIncludes(preview, 'reportXensonarPromiseFailure', 'preview lifecycle hook');
assertIncludes(preview, 'stopSelectionLoopPreview', 'preview lifecycle hook');
assertNotIncludes(preview, 'consumeForgeAudioHandoff', 'preview lifecycle hook');
assertNotIncludes(preview, 'registerCanonicalIntakeEventBridge', 'preview lifecycle hook');

assertIncludes(intake, 'registerCanonicalIntakeEventBridge', 'intake bridge hook');
assertNotIncludes(intake, 'consumeForgeAudioHandoff', 'intake bridge hook');
assertNotIncludes(intake, 'reportXensonarPromiseFailure', 'intake bridge hook');
for (const forbidden of ['AudioContext', 'requestAnimationFrame', 'window.addEventListener']) {
  if (handoff.includes(forbidden) || intake.includes(forbidden)) fail(`lifecycle split introduced forbidden runtime primitive: ${forbidden}`);
}

console.log('[xensonar][canonical-lifecycle-boundary] ok');
