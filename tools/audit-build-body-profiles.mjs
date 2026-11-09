#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const repo = path.resolve(path.dirname(__filename), '..');
const jsonMode = process.argv.includes('--json');
const failOnViolation = process.argv.includes('--check');

const profilePath = path.join(repo, 'src/features/xensonar/architecture/buildBodyProfiles.ts');
const packagePath = path.join(repo, 'package.json');
const vitePath = path.join(repo, 'vite.config.ts');

function fail(message) {
  console.error(`[build-body-profiles] ${message}`);
  process.exit(1);
}

function read(relOrAbs) {
  return fs.readFileSync(path.isAbsolute(relOrAbs) ? relOrAbs : path.join(repo, relOrAbs), 'utf8');
}

for (const abs of [profilePath, packagePath, vitePath]) {
  if (!fs.existsSync(abs)) fail(`missing ${path.relative(repo, abs)}`);
}

const profileText = read(profilePath);
const pkg = JSON.parse(read(packagePath));
const viteText = read(vitePath);

const requiredBodies = [
  'hot-realtime-core',
  'materialschmiede-workbench',
  'topology-myzel',
  'extras-family-xenpolar',
  'spectralforge-workbench',
  'syntheticforge-workbench',
  'large-data-assets',
  'shared-infrastructure',
];

const missingBodies = requiredBodies.filter((id) => !profileText.includes(`id: '${id}'`));

const requiredScripts = [
  'build:singlefile',
  'build:modular:full',
  'build:modular:core',
  'xensonar:audit-build-bodies',
  'xensonar:check-build-body-profiles',
  'xensonar:check-xenpolar-extras-bridge-profile',
];
const missingScripts = requiredScripts.filter((script) => !pkg.scripts?.[script]);

const viteContract = {
  singlefileToggle: viteText.includes('XENSONAR_SINGLEFILE') && viteText.includes('viteSingleFile()'),
  buildBodyDefine: viteText.includes('__XENSONAR_BUILD_BODY__') && viteText.includes('process.env.XENSONAR_BUILD_BODY'),
  coreDefinePreserved: viteText.includes('__XENSONAR_CORE_TEST_BUILD__') && viteText.includes('process.env.XENSONAR_CORE_TEST_BUILD'),
};

const sourceFiles = [];
function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name.startsWith('.')) continue;
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(abs);
    else if (/\.(ts|tsx|js|jsx|css|json|html|md)$/.test(entry.name)) sourceFiles.push(abs);
  }
}
walk(path.join(repo, 'src'));

const largeSourceFiles = sourceFiles
  .map((abs) => ({ rel: path.relative(repo, abs).replaceAll(path.sep, '/'), bytes: fs.statSync(abs).size }))
  .filter((file) => file.bytes >= 48 * 1024)
  .sort((a, b) => b.bytes - a.bytes)
  .slice(0, 20);

const criticalLargeFiles = largeSourceFiles.filter((file) => file.bytes >= 768 * 1024 && !file.rel.startsWith('src/features/xensonar/family/assets/'));
const knownLargeRuntimeFiles = largeSourceFiles.filter((file) => file.bytes >= 256 * 1024 && !file.rel.startsWith('src/features/xensonar/family/assets/'));
const embeddedStandaloneLoader = path.join(repo, 'src/features/xensonar/family/assets/embeddedStandaloneApps.ts');
const embeddedStandaloneAssetDir = path.join(repo, 'public/xensonar-family-standalone');
const embeddedStandaloneAssetsExternalized = fs.existsSync(embeddedStandaloneLoader)
  && fs.statSync(embeddedStandaloneLoader).size < 16 * 1024
  && fs.existsSync(path.join(embeddedStandaloneAssetDir, 'manifest.json'))
  && ['resonanzwerk', 'zone', 'strangeAttractors', 'melodieQuest'].every((key) => fs.existsSync(path.join(embeddedStandaloneAssetDir, `${key}.html.gz.b64`)));
const knownExternalizeCandidatePresent = largeSourceFiles.some((file) => file.rel === 'src/features/xensonar/family/assets/embeddedStandaloneApps.ts');

const appText = fs.existsSync(path.join(repo, 'src/App.tsx')) ? read('src/App.tsx') : '';
const remainingStaticExtrasEdges = [
  './features/xenpolar/rooms/useXenpolarController',
  './features/xenpolar/interpretation/xenpolarLoopInterpreter',
  './features/xenpolar/rooms/irrlichtArenaAudioPlayback',
  './features/xenpolar/rooms/irrlichtArenaAudioMath',
  './features/xenpolar/rooms/irrlichtArenaState',
].filter((needle) => appText.includes(needle));
const xenpolarBridgeProfile = {
  appUsesBridge: appText.includes('@/features/xensonar/rooms/xenpolarExtrasBridge'),
  coreBridgePresent: fs.existsSync(path.join(repo, 'src/features/xensonar/rooms/xenpolarExtrasBridge.core.ts')),
  fullBridgePresent: fs.existsSync(path.join(repo, 'src/features/xensonar/rooms/xenpolarExtrasBridge.full.ts')),
  viteAliasesBridge: viteText.includes('xenpolarExtrasBridge.core.ts') && viteText.includes('xenpolarExtrasBridge.full.ts'),
};

const result = {
  version: pkg.version,
  profileVersion: /XENSONAR_BUILD_BODY_PROFILE_VERSION\s*=\s*'([^']+)'/.exec(profileText)?.[1] ?? null,
  missingBodies,
  missingScripts,
  viteContract,
  largeSourceFiles,
  criticalLargeFiles,
  knownLargeRuntimeFiles,
  knownExternalizeCandidatePresent,
  embeddedStandaloneAssetsExternalized,
  remainingStaticExtrasEdges,
  xenpolarBridgeProfile,
  verdict: missingBodies.length === 0 && missingScripts.length === 0 && Object.values(viteContract).every(Boolean) && criticalLargeFiles.length === 0 && remainingStaticExtrasEdges.length === 0 && Object.values(xenpolarBridgeProfile).every(Boolean)
    ? 'pass'
    : 'fail',
  nextMoves: [
    'Use build:modular:core for routine Hauptraum/Materialschmiede/Topology build diagnostics before producing a full singlefile artifact.',
    embeddedStandaloneAssetsExternalized
      ? 'Embedded standalone payloads are externalized; App-level Xenpolar/Irrlicht edges now pass through the explicit bridge seam.'
      : 'Externalize embeddedStandaloneApps.ts out of TypeScript when the Extras artifact line is touched again.',
    'Next build-pressure move: use the core/full bridge seam to measure routine-core builds against full/extras builds and only then move further Extras runtime behind the bridge.',
    'Treat large runtime files such as App.tsx as warnings for the next extraction steps, not as a failing build-body contract in this patch.',
  ],
};

if (jsonMode) {
  console.log(JSON.stringify(result, null, 2));
} else {
  console.log(`Build-body profile audit ${result.profileVersion ?? '(unknown profile)'}`);
  console.log(`- package version: ${result.version}`);
  console.log(`- bodies: ${missingBodies.length ? `missing ${missingBodies.join(', ')}` : 'ok'}`);
  console.log(`- scripts: ${missingScripts.length ? `missing ${missingScripts.join(', ')}` : 'ok'}`);
  console.log(`- vite singlefile toggle: ${viteContract.singlefileToggle ? 'ok' : 'missing'}`);
  console.log(`- vite build body define: ${viteContract.buildBodyDefine ? 'ok' : 'missing'}`);
  console.log(`- largest TS/TSX/CSS/JSON/HTML inputs:`);
  for (const file of largeSourceFiles.slice(0, 8)) console.log(`  · ${(file.bytes / 1024).toFixed(1)} KiB ${file.rel}`);
  if (remainingStaticExtrasEdges.length) {
    console.log(`- remaining App-level Extras edges: ${remainingStaticExtrasEdges.length}`);
    for (const edge of remainingStaticExtrasEdges) console.log(`  · ${edge}`);
  } else {
    console.log('- remaining App-level Extras edges: none');
  }
  console.log(`- xenpolar bridge profile: ${Object.values(xenpolarBridgeProfile).every(Boolean) ? 'ok' : 'incomplete'}`);
  console.log(`- embedded standalone assets externalized: ${embeddedStandaloneAssetsExternalized ? 'ok' : 'pending'}`);
  console.log(`- verdict: ${result.verdict}`);
}

if (failOnViolation && result.verdict !== 'pass') process.exit(1);
