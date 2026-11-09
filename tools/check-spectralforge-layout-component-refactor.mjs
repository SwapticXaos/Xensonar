import { readFileSync } from 'node:fs';

const room = readFileSync('src/features/l3lab/spectralForge/SpectralForgeRoom.tsx', 'utf8');
const header = readFileSync('src/features/l3lab/spectralForge/components/SpectralForgeFunctionalHeader.tsx', 'utf8');
const sidebar = readFileSync('src/features/l3lab/spectralForge/components/SpectralForgeWorkbenchSidebar.tsx', 'utf8');

function assert(condition, message) {
  if (!condition) {
    console.error(`spectralforge-layout-component-refactor check failed: ${message}`);
    process.exit(1);
  }
}

assert(room.includes("import SpectralForgeFunctionalHeader from './components/SpectralForgeFunctionalHeader';"), 'room does not import extracted functional header');
assert(room.includes("import SpectralForgeWorkbenchSidebar from './components/SpectralForgeWorkbenchSidebar';"), 'room does not import extracted workbench sidebar');
assert(room.includes('<SpectralForgeFunctionalHeader'), 'room no longer mounts extracted functional header');
assert(room.includes('<SpectralForgeWorkbenchSidebar'), 'room no longer mounts extracted workbench sidebar');
assert(!room.includes('function SpectralForgeMeterNumberControl'), 'meter input implementation still lives in SpectralForgeRoom');
assert(!room.includes('function clampSpectralMeterValue'), 'meter clamping helper still lives in SpectralForgeRoom');
assert(!room.includes('<ProjectLibraryPanel />'), 'sidebar internals still live in SpectralForgeRoom');
assert(!room.includes('data-xensonar-spectralforge-functional-header="true"'), 'functional header DOM contract should be owned by extracted header component');
assert(!room.includes('data-xensonar-spectralforge-sidebar-compact-workbench="true"'), 'sidebar DOM contract should be owned by extracted sidebar component');

for (const required of [
  'data-xensonar-spectralforge-functional-header="true"',
  'label="Takte"',
  'label="Taktsegmente"',
  'Bild importieren',
  'clampSpectralMeterValue',
]) {
  assert(header.includes(required), `functional header lost contract token: ${required}`);
}

for (const required of [
  'data-xensonar-spectralforge-sidebar-compact-workbench="true"',
  '<ProjectLibraryPanel />',
  '<CarrierIntegralPanel',
  '<CustomStampLibraryPanel',
  '<InlineSynthLabPanel />',
]) {
  assert(sidebar.includes(required), `workbench sidebar lost contract token: ${required}`);
}

console.log('spectralforge-layout-component-refactor check passed');
