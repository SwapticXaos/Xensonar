#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';

function fail(message) {
  console.error(`[xensonar:sample-library-readability-boundary] ${message}`);
  process.exit(1);
}

function read(path) {
  return readFileSync(path, 'utf8');
}

const panelPath = 'src/features/l3lab/canonicalForge/MelodicSampleLibraryPanel.tsx';
const headerPath = 'src/features/l3lab/canonicalForge/MelodicSampleLibraryHeader.tsx';
const cardPath = 'src/features/l3lab/canonicalForge/MelodicSampleCard.tsx';
const menuPath = 'src/features/l3lab/canonicalForge/SampleInspectorMenu.tsx';
const actionsPath = 'src/features/l3lab/canonicalForge/sampleInspectorMenuActions.ts';
const displayTextPath = 'src/features/l3lab/canonicalForge/sampleDisplayText.ts';

for (const path of [panelPath, headerPath, cardPath, menuPath, actionsPath, displayTextPath]) {
  if (!existsSync(path)) fail(`missing expected file: ${path}`);
}

const panel = read(panelPath);
const header = read(headerPath);
const card = read(cardPath);
const menu = read(menuPath);
const actions = read(actionsPath);
const displayText = read(displayTextPath);

for (const token of ['MelodicSampleLibraryHeader', 'MelodicSampleCard', 'SampleInspectorMenu']) {
  if (!panel.includes(token)) fail(`MelodicSampleLibraryPanel must compose ${token}`);
}
for (const leaked of ['sampleInputRef', 'dataTransfer.setData', 'describeMelodicSamplePitchAnchor(sample)', 'Samples hochladen</button>']) {
  if (panel.includes(leaked)) fail(`MelodicSampleLibraryPanel still owns extracted detail: ${leaked}`);
}
if (panel.split('\n').length > 215) fail(`MelodicSampleLibraryPanel grew past readability threshold (${panel.split('\n').length} lines)`);

for (const token of ['sampleInputRef', 'onUploadMelodicSamples', 'Samples hochladen', 'Materialspur importieren', 'Aus SpectralForge übernehmen']) {
  if (!header.includes(token)) fail(`MelodicSampleLibraryHeader missing ${token}`);
}
for (const forbidden of ['SampleInspectorMenu', 'onOpenSampleContextMenu', 'dataTransfer.setData', 'audioEngine']) {
  if (header.includes(forbidden)) fail(`MelodicSampleLibraryHeader must stay header-only; found ${forbidden}`);
}

for (const token of ['seedSampleDrag', 'dataTransfer.setData', 'application/xensonar-sample-id', 'formatMelodicSampleCardSummary', 'onOpenContextMenu']) {
  if (!card.includes(token)) fail(`MelodicSampleCard missing ${token}`);
}
for (const forbidden of ['MaterialImportDialog', 'SampleInspectorMenu', 'useState', 'audioEngine']) {
  if (card.includes(forbidden)) fail(`MelodicSampleCard must stay card-only; found ${forbidden}`);
}

for (const token of ['parseOptionalPositiveHzDraft', 'parsePositiveSecondsDraft', 'getSampleEnvelopeEditorCopy']) {
  if (!actions.includes(token)) fail(`sampleInspectorMenuActions missing ${token}`);
  if (!menu.includes(token)) fail(`SampleInspectorMenu must use ${token}`);
}
if (!displayText.includes('formatSampleTempoSummary')) fail('sampleDisplayText missing formatSampleTempoSummary');
if (!displayText.includes('formatMelodicSampleCardSummary')) fail('sampleDisplayText missing formatMelodicSampleCardSummary');
if (!menu.includes('formatSampleTempoSummary')) fail('SampleInspectorMenu must use formatSampleTempoSummary');
for (const forbidden of ['AudioContext', 'window.', 'document.', 'useState', 'useEffect']) {
  if (actions.includes(forbidden)) fail(`sampleInspectorMenuActions must stay pure; found ${forbidden}`);
}
if (menu.includes("Number(sampleDurationDraft.trim().replace(',', '.'))")) fail('SampleInspectorMenu still parses duration drafts inline');
if (menu.includes("sampleBaseHzDraft.trim().replace(',', '.')")) fail('SampleInspectorMenu still parses pitch drafts inline');

console.log('[xensonar:sample-library-readability-boundary] OK');
