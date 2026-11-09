#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const repo = path.resolve(path.dirname(__filename), '..');

const read = (rel) => fs.readFileSync(path.join(repo, rel), 'utf8');
const exists = (rel) => fs.existsSync(path.join(repo, rel));

const files = {
  mainEntry: 'src/main.tsx',
  app: 'src/App.tsx',
  appHeader: 'src/features/xensonar/layout/AppHeader.tsx',
  appMainContent: 'src/features/xensonar/layout/AppMainContent.tsx',
  appRoomViewport: 'src/features/xensonar/rooms/AppRoomViewport.tsx',
  mainRoom: 'src/features/xensonar/rooms/MainRoom.tsx',
  xenpolarRoom: 'src/features/xensonar/rooms/XenpolarRoom.tsx',
  irrlichtArenaPanel: 'src/features/xensonar/rooms/IrrlichtArenaPanel.tsx',
  coreBuildProfile: 'src/features/xensonar/rooms/coreBuildProfile.ts',
  xenpolarExportActions: 'src/features/xenpolar/rooms/xenpolarExportActions.ts',
  xenpolarShortcut: 'src/features/xensonar/rooms/xenpolarShortcut.ts',
  roomProfiles: 'src/features/xensonar/rooms/roomBuildProfiles.ts',
  viteConfig: 'vite.config.ts',
  packageJson: 'package.json',
};

const missing = Object.values(files).filter((rel) => !exists(rel));
if (missing.length) {
  console.error(`core room audit failed: missing files\n${missing.map((rel) => `- ${rel}`).join('\n')}`);
  process.exit(1);
}

function has(rel, needle) {
  return read(rel).includes(needle);
}

function runtimeImportLines(rel) {
  return read(rel)
    .split(/\r?\n/)
    .filter((line) => /^import\s/.test(line.trim()) && !/^import\s+type\s/.test(line.trim()));
}

const viewportRuntimeImports = runtimeImportLines(files.appRoomViewport);
const viewportRuntimeExtraImports = viewportRuntimeImports.filter((line) =>
  /\.\/MainRoom|\.\/XenpolarRoom|\.\/IrrlichtArenaPanel/.test(line),
);

const profileRuntimeImports = runtimeImportLines(files.roomProfiles);
const profileHasHeavyImport = profileRuntimeImports.some((line) =>
  /family|xenpolar|Irrlicht|MainRoom|XenpolarRoom|IrrlichtArenaPanel|embeddedStandaloneApps|XensonarRefactorRoom/.test(line),
);

const handoffEvidence = {
  jumpRunJamSenderPreserved:
    has(files.xenpolarExportActions, 'acceptExternalLoopOffer') &&
    has(files.xenpolarExportActions, 'queueForgeAudioHandoff') &&
    has(files.xenpolarExportActions, 'queueMicrotoMelodicLoopSeedHandoff') &&
    has(files.xenpolarExportActions, "setRoom('L3LAB')"),
  externalDockShortcutPreserved:
    has(files.xenpolarShortcut, "writeLevel3LabMode('external')") &&
    has(files.xenpolarShortcut, "writeExternalDockView('microto')") &&
    has(files.xenpolarShortcut, "setRoom('L3LAB')"),
  materialschmiedeHostModePreserved:
    has(files.xenpolarShortcut, 'openMaterialschmiede') &&
    has(files.xenpolarShortcut, "writeExternalDockView('host')"),
  xensonarRefactorReceiverPreserved:
    has(files.mainRoom, 'XensonarRefactorRoom') &&
    has(files.mainRoom, 'SharedFieldController') &&
    has(files.mainRoom, 'sharedFieldController'),
};

const coreBoundaryEvidence = {
  viteDefinesCoreFlag: has(files.viteConfig, '__XENSONAR_CORE_TEST_BUILD__') && has(files.viteConfig, 'XENSONAR_CORE_TEST_BUILD'),
  coreBuildScriptExists: JSON.parse(read(files.packageJson)).scripts?.['build:core-test']?.includes('XENSONAR_CORE_TEST_BUILD=1') ?? false,
  viewportUsesLazyExtras: has(files.appRoomViewport, 'lazy(() => import("./MainRoom")') && has(files.appRoomViewport, 'lazy(() => import("./XenpolarRoom")') && has(files.appRoomViewport, 'lazy(() => import("./IrrlichtArenaPanel")'),
  viewportRuntimeExtrasImportFree: viewportRuntimeExtraImports.length === 0,
  headerHasCoreNavigationGate: has(files.appHeader, 'XENSONAR_CORE_TEST_BUILD') && has(files.appHeader, 'II. MATERIALSCHMIEDE') && has(files.appHeader, 'III.1 TOPOLOGICAL MANIFOLD'),
};

const remainingCoreStaticExtras = [
  { rel: files.app, evidence: './features/xenpolar/rooms/useXenpolarController', reason: 'kept for bridge telemetry/export controller until a no-op core bridge can be introduced safely' },
  { rel: files.app, evidence: './features/xenpolar/interpretation/xenpolarLoopInterpreter', reason: 'Irrlicht interpreter helpers are still used by App runtime and need a later extraction/no-op boundary' },
  { rel: files.app, evidence: './features/xenpolar/rooms/irrlichtArenaAudioPlayback', reason: 'Irrlicht active-run helpers remain static in App and are not removed in this patch' },
].filter((item) => has(item.rel, item.evidence));

const variantA = {
  name: 'A: real core import graph boundary',
  verdict: 'implemented as first boundary split',
  viable: !profileHasHeavyImport && Object.values(handoffEvidence).every(Boolean) && Object.values(coreBoundaryEvidence).every(Boolean),
  reason: 'The patch keeps the full build intact while the core build uses a compile-time flag and a real viewport import boundary. The heavy family/Xenpolar room components are no longer runtime-imported by AppRoomViewport; they are guarded lazy edges instead of broad stubs.',
  remainingWork: 'A later step can move the remaining Xenpolar controller/interpreter imports behind a no-op core bridge only after Jump-Run-Jam sender and Refactor receiver contracts are represented explicitly.',
};

const variantB = {
  name: 'B: Vite alias / broad stubs',
  verdict: 'not used',
  viable: false,
  reason: 'Broad aliases would be smaller in the short term but could accidentally erase Jump-Run-Jam sender semantics or the Xensonar Refactor receiver. This patch only uses the compile-time flag for the viewport boundary and leaves bridge modules intact.',
  blockers: remainingCoreStaticExtras,
};

const result = {
  profileVersion: '3.2.91.4.114.50-core-entry-boundary-split-1',
  coreRooms: ['RESONANCE', 'L3LAB', 'TOPOLOGY'],
  extrasRooms: ['MAIN', 'XENPOLAR', 'GAME', 'NEXUS'],
  handoffEvidence,
  coreBoundaryEvidence,
  profileHasHeavyImport,
  viewportRuntimeExtraImports,
  remainingCoreStaticExtras,
  variantA,
  variantB,
  recommendation: variantA.viable
    ? 'Use Variant A boundary split. Do not introduce broad Variant B aliases yet.'
    : 'Stop and repair the missing boundary or handoff evidence before building a reduced core profile.',
};

if (process.argv.includes('--json')) {
  console.log(JSON.stringify(result, null, 2));
} else {
  console.log(`Core room profile audit ${result.profileVersion}`);
  console.log(`- core rooms: ${result.coreRooms.join(', ')}`);
  console.log(`- extras rooms: ${result.extrasRooms.join(', ')}`);
  console.log(`- handoff evidence: ${Object.entries(handoffEvidence).map(([key, value]) => `${key}=${value ? 'ok' : 'missing'}`).join(', ')}`);
  console.log(`- viewport runtime Extras imports: ${viewportRuntimeExtraImports.length}`);
  console.log(`- remaining static Extras-adjacent controller imports: ${remainingCoreStaticExtras.length}`);
  for (const item of remainingCoreStaticExtras) console.log(`  · ${item.rel} imports ${item.evidence} (${item.reason})`);
  console.log(`- Variant A: ${variantA.verdict} (${variantA.viable ? 'viable' : 'not viable'})`);
  console.log(`- Variant B: ${variantB.verdict}`);
  console.log(`Recommendation: ${result.recommendation}`);
}

if (!variantA.viable) process.exit(1);
