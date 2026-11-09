#!/usr/bin/env node
import fs from 'node:fs';

function fail(message) {
  console.error(`[check-loop-upload-dedupe-and-drum-link] FAIL: ${message}`);
  process.exit(1);
}
function ok(message) {
  console.log(`[check-loop-upload-dedupe-and-drum-link] ${message}`);
}

const materialPath = 'src/features/xensonar/rooms/ResonanceMaterialLoopPanel.tsx';
const groovePath = 'src/features/xensonar/rooms/ResonanceGrooveBassPanel.tsx';
const material = fs.readFileSync(materialPath, 'utf8');
const groove = fs.readFileSync(groovePath, 'utf8');

const quickUsages = [...material.matchAll(/<QuickLoopUploadControls\b/g)].length;
if (quickUsages !== 2) fail(`expected QuickLoopUploadControls only for empty managers (2 usages), found ${quickUsages}`);
if (material.includes('Root Follow Steuerung</div>\n      <label') && material.includes('<QuickLoopUploadControls tone="root-follow"')) {
  const rootSection = material.slice(material.indexOf('const rootFollowManagerDetails'), material.indexOf('return (', material.indexOf('const rootFollowManagerDetails')));
  if (rootSection.includes('<QuickLoopUploadControls')) fail('rootFollowManagerDetails still contains inline upload controls');
}
const materialSection = material.slice(material.indexOf('const materialManagerDetails'), material.indexOf('const rootFollowManagerDetails'));
if (materialSection.includes('<QuickLoopUploadControls')) fail('materialManagerDetails still contains inline upload controls');
const rootSection = material.slice(material.indexOf('const rootFollowManagerDetails'), material.indexOf('return (', material.indexOf('const rootFollowManagerDetails')));
if (rootSection.includes('<QuickLoopUploadControls')) fail('rootFollowManagerDetails still contains inline upload controls');

if (!material.includes('Loop-Import')) fail('visible Loop-Import card label missing');
if (!material.includes('Takte für Loop Upload')) fail('non-empty manager import block lost bars control');
if (!material.includes('Audio Upload und Schneiden')) fail('audio upload/cut action missing');

if (!groove.includes('Eigenes Drum Pattern gestalten')) fail('drum pattern manager prompt missing');
if (!groove.includes('Zur Drum Machine')) fail('drum machine button missing');
if (!groove.includes('primeDrumMachineWorkspaceIntent')) fail('drum machine workspace priming missing');
if (!groove.includes("window.localStorage.setItem(LEVEL3LAB_MODE_KEY, 'canonical')")) fail('Drum Machine link does not prime SyntheticForge/canonical mode');
if (!groove.includes("window.localStorage.setItem(LEVEL3LAB_CANONICAL_VIEW_KEY, 'drums')")) fail('Drum Machine link does not prime drums view');
if (!groove.includes('onOpenTempWorkspace();')) fail('Drum Machine link does not leave Hauptraum for Materialschmiede');

ok('ok: upload block deduped; Drum Pattern manager links to Drum Machine.');
