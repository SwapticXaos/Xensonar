#!/usr/bin/env node
import { readFileSync, existsSync } from 'node:fs';

function fail(message) {
  console.error(`[xensonar:light-cleanup-boundaries] ${message}`);
  process.exit(1);
}

function read(path) {
  return readFileSync(path, 'utf8');
}

const argBuildersPath = 'src/features/l3lab/canonicalForge/canonicalControllerArgBuilders.ts';
const sampleMenuPath = 'src/features/l3lab/canonicalForge/SampleInspectorMenu.tsx';
const sampleMenuHookPath = 'src/features/l3lab/canonicalForge/useSampleInspectorMenuPosition.ts';
const appHeaderPath = 'src/features/xensonar/layout/AppHeader.tsx';
const headerButtonPath = 'src/features/xensonar/layout/HeaderRecordingButton.tsx';

for (const path of [argBuildersPath, sampleMenuPath, sampleMenuHookPath, appHeaderPath, headerButtonPath]) {
  if (!existsSync(path)) fail(`missing expected file: ${path}`);
}

const argBuilders = read(argBuildersPath);
const repeatedParameterRefs = (argBuilders.match(/Parameters<typeof/g) ?? []).length;
if (repeatedParameterRefs > 8) {
  fail(`canonicalControllerArgBuilders.ts still has too many repeated Parameters<typeof...> references (${repeatedParameterRefs})`);
}
for (const alias of ['CanonicalSourceIntakeControllerArgs', 'CanonicalSourcePreviewControllerArgs', 'CanonicalMaterialTransferControllerArgs', 'CanonicalWorkspacePersistenceControllerArgs']) {
  if (!argBuilders.includes(`export type ${alias} = Parameters<typeof`)) fail(`missing exported controller args alias ${alias}`);
}
if (!argBuilders.includes('flattenCanonicalControllerArgGroups')) fail('missing generic controller arg-group flattener');
if (argBuilders.includes('buildCanonicalSourcePreviewControllerArgs')) fail('thin specialized controller arg builder should not return');

const sampleMenu = read(sampleMenuPath);
if (!sampleMenu.includes("useSampleInspectorMenuPosition")) fail('SampleInspectorMenu must use useSampleInspectorMenuPosition');
if (sampleMenu.includes('React.useLayoutEffect')) fail('SampleInspectorMenu should not own viewport positioning layout effect directly');
if (sampleMenu.includes('computeSampleInspectorMenuPosition')) fail('SampleInspectorMenu should not call computeSampleInspectorMenuPosition directly');

const sampleMenuHook = read(sampleMenuHookPath);
for (const token of ['useLayoutEffect', 'computeSampleInspectorMenuPosition', 'requestAnimationFrame', "addEventListener('resize'"]) {
  if (!sampleMenuHook.includes(token)) fail(`useSampleInspectorMenuPosition missing ${token}`);
}
for (const forbidden of ['onPreviewMelodicSampleReferencePitch', 'onRenameSample', 'audioEngine', 'localStorage']) {
  if (sampleMenuHook.includes(forbidden)) fail(`useSampleInspectorMenuPosition must stay positioning-only; found ${forbidden}`);
}

const appHeader = read(appHeaderPath);
if (!appHeader.includes('HeaderRecordingButton')) fail('AppHeader must use HeaderRecordingButton');
if (appHeader.includes('Master Aufnahme starten') || appHeader.includes('Aufnahme stoppen und zur Master Aufnahme springen')) {
  fail('recording button copy/styling should live in HeaderRecordingButton');
}

const headerButton = read(headerButtonPath);
for (const token of ['recordingActive', 'recordingDurationLabel', 'onToggleRecordingFromHeader', 'Master Aufnahme starten']) {
  if (!headerButton.includes(token)) fail(`HeaderRecordingButton missing ${token}`);
}
for (const forbidden of ['scheduleMasterRecordingRackScroll', 'useRecordingRuntimeBoundary', 'setRoom', 'audioEngine']) {
  if (headerButton.includes(forbidden)) fail(`HeaderRecordingButton must remain presentational; found ${forbidden}`);
}

console.log('[xensonar:light-cleanup-boundaries] OK');
