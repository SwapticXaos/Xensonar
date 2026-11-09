#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { XENSONAR_ARCHITECTURE_LINE } from './xensonar-project-line.mjs';

const read = (path) => readFileSync(path, 'utf8');
const fail = (message) => {
  console.error(`[canonical-session-persistence-corridor] ${message}`);
  process.exit(1);
};
const requireText = (path, needle) => {
  const text = read(path);
  if (!text.includes(needle)) fail(`${path} missing ${needle}`);
};
const forbidText = (path, needle) => {
  const text = read(path);
  if (text.includes(needle)) fail(`${path} still contains forbidden ${needle}`);
};

const pkg = JSON.parse(read('package.json'));
if (String(pkg.version || '') !== XENSONAR_ARCHITECTURE_LINE) fail(`package.json version ${pkg.version} does not match architecture line ${XENSONAR_ARCHITECTURE_LINE}`);
if (pkg.scripts?.['typecheck:micro:canonical-session-persistence'] !== 'node tools/run-typecheck-matrix.mjs --set micro --chunk canonical-session-persistence') {
  fail('package.json missing canonical-session-persistence micro typecheck script');
}
if (pkg.scripts?.['xensonar:check-canonical-session-persistence-corridor'] !== 'node tools/check-canonical-session-persistence-corridor.mjs') {
  fail('package.json missing canonical session persistence guard script');
}

const matrix = JSON.parse(read('tools/typecheckChunkMatrix.json'));
const chunk = matrix.micro?.find((entry) => entry.name === 'canonical-session-persistence');
if (!chunk) fail('typecheckChunkMatrix.json missing canonical-session-persistence chunk');
if (chunk.project !== 'tsconfig.typecheck.micro-canonical-session-persistence.json') fail('canonical-session-persistence chunk points at wrong tsconfig');

const tsconfig = JSON.parse(read('tsconfig.typecheck.micro-canonical-session-persistence.json'));
const requiredIncludes = [
  'src/features/l3lab/canonicalForge/session.ts',
  'src/features/l3lab/canonicalForge/projectLibrary.ts',
  'src/features/l3lab/canonicalForge/projectHydrationActions.ts',
  'src/features/l3lab/canonicalForge/useCanonicalForgeSessionSync.ts',
  'src/features/l3lab/canonicalForge/loopDrumDomain.ts',
  'src/features/l3lab/canonicalForge/loopDrumDomainTypes.ts',
  'src/features/l3lab/canonicalForge/spectralWorkspaceUtils.ts',
  'src/vite-env.d.ts',
];
for (const include of requiredIncludes) {
  if (!tsconfig.include?.includes(include)) fail(`tsconfig missing include ${include}`);
}

requireText('src/features/l3lab/canonicalForge/loopDrumDomain.ts', 'LoopComposerHydrationState');
requireText('src/features/l3lab/canonicalForge/loopDrumDomainTypes.ts', 'export type LoopComposerHydrationState');
requireText('src/features/l3lab/canonicalForge/loopDrumDomain.ts', 'DrumComputerHydrationState');
requireText('src/features/l3lab/canonicalForge/loopDrumDomainTypes.ts', 'export type DrumComputerHydrationState');
requireText('src/features/l3lab/canonicalForge/loopDrumDomain.ts', 'export function cloneLoopComposerState(state: LoopComposerHydrationState): LoopComposerState');
requireText('src/features/l3lab/canonicalForge/loopDrumComputerDomain.ts', 'export function cloneDrumComputerState(state: DrumComputerHydrationState): DrumComputerState');

for (const path of [
  'src/features/l3lab/canonicalForge/session.ts',
  'src/features/l3lab/canonicalForge/projectLibrary.ts',
  'src/features/l3lab/canonicalForge/projectHydrationActions.ts',
  'src/features/l3lab/canonicalForge/useCanonicalForgeSessionSync.ts',
  'src/features/l3lab/canonicalForge/loopDrumDomain.ts',
  'src/features/l3lab/canonicalForge/loopDrumDomainTypes.ts',
  'src/features/l3lab/canonicalForge/loopDrumComputerDomain.ts',
]) {
  forbidText(path, ' as any');
}
forbidText('src/features/l3lab/canonicalForge/projectHydrationActions.ts', 'as DrumComputerState');
forbidText('src/features/l3lab/canonicalForge/projectHydrationActions.ts', 'as LoopComposerState');

console.log('[canonical-session-persistence-corridor] PASS: corridor script, tsconfig, matrix entry, and hydration clone contracts are present.');
