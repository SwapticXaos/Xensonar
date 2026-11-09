import fs from 'node:fs';

const roomPath = 'src/features/l3lab/canonicalForge/CanonicalForgeRoom.tsx';
const boundaryPath = 'src/features/l3lab/canonicalForge/canonicalForgeInitialState.ts';

const fail = (message) => {
  console.error(`[canonical-forge-initial-state-boundary] ${message}`);
  process.exit(1);
};

const room = fs.existsSync(roomPath) ? fs.readFileSync(roomPath, 'utf8') : fail(`missing ${roomPath}`);
const boundary = fs.existsSync(boundaryPath) ? fs.readFileSync(boundaryPath, 'utf8') : fail(`missing ${boundaryPath}`);

if (!room.includes("import { buildCanonicalForgeInitialState } from './canonicalForgeInitialState';")) {
  fail('CanonicalForgeRoom must import the initial-state boundary through buildCanonicalForgeInitialState.');
}

if (!room.includes('const initialState = useMemo(() => buildCanonicalForgeInitialState({ initialSession, externalLogicView }), [externalLogicView, initialSession]);')) {
  fail('CanonicalForgeRoom must create a memoized initialState from the unified boundary builder.');
}

if (room.includes('buildCanonicalForgeBootstrapContracts') || room.includes('bootstrapContracts.')) {
  fail('CanonicalForgeRoom must not keep a parallel bootstrapContracts path after initial-state unification.');
}

for (const forbidden of [
  'makeEmptySpectral()',
  'buildSpectralDataFromComposite(',
  'createRandomDemoMelodicComposer(',
  'RANDOM_DEMO_MELODIC_PROJECT_ID',
  'sanitizeGrooveMachineConfig(',
  'createEmptyDrumComputer(',
  'cloneDrumComputerState(',
  'buildInitialMaterialExport(',
  'DEFAULT_CANONICAL_TOOL',
  'DEFAULT_CANONICAL_SOURCE_PREVIEW_MODE',
  'DEFAULT_CANONICAL_WORKSPACE',
  'DEFAULT_CANONICAL_LOGIC_VIEW',
  'DEFAULT_CANONICAL_ROOM_STATUS',
]) {
  if (room.includes(forbidden)) {
    fail(`CanonicalForgeRoom still owns initial-state detail: ${forbidden}`);
  }
}

for (const required of [
  'export function buildCanonicalForgeInitialState',
  'buildInitialMaterialExport',
  'buildInitialSpectralData',
  'buildInitialGrooveMachine',
  'buildInitialDrumComputer',
  'buildInitialLoopComposerState',
  'buildInitialProxyBaselineSnapshot',
  'buildInitialActiveTool',
  'buildInitialSourcePreviewMode',
  'buildInitialLogicView',
  'buildInitialRoomStatus',
]) {
  if (!boundary.includes(required)) {
    fail(`boundary file is missing required builder: ${required}`);
  }
}

for (const forbidden of [
  'useState(',
  'useEffect(',
  'useMemo(',
  'audioEngine',
  'stopLoopComposerPreview',
  'createCanonicalMaterialTransferController',
  'window.addEventListener',
  'document.',
]) {
  if (boundary.includes(forbidden)) {
    fail(`initial-state boundary must stay pure/lifecycle-free; found: ${forbidden}`);
  }
}

const lineCount = room.split('\n').length;
if (lineCount > 1765) {
  fail(`CanonicalForgeRoom grew beyond the current initial-state boundary threshold (${lineCount} > 1765).`);
}

console.log(`[canonical-forge-initial-state-boundary] ok (${lineCount} CanonicalForgeRoom lines)`);
