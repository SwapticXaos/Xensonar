#!/usr/bin/env node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import ts from './typescript-runtime.mjs';

const root = process.cwd();
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'xensonar-impulsraster-'));

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

function transpileSource(relativePath, outFile, rewrite = (source) => source) {
  const input = path.join(root, relativePath);
  const source = rewrite(fs.readFileSync(input, 'utf8'));
  const result = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
      skipLibCheck: true,
      moduleResolution: ts.ModuleResolutionKind.Node10,
    },
    fileName: input,
    reportDiagnostics: true,
  });
  const diagnostics = result.diagnostics ?? [];
  const hardDiagnostics = diagnostics.filter((diagnostic) => diagnostic.category === ts.DiagnosticCategory.Error);
  assert(hardDiagnostics.length === 0, `TypeScript transpile diagnostics in ${relativePath}: ${hardDiagnostics.map((d) => d.messageText).join('; ')}`);
  fs.writeFileSync(path.join(tmp, outFile), result.outputText, 'utf8');
}

transpileSource('src/features/xensonar/rhythmSegmentPattern.ts', 'rhythmSegmentPattern.cjs');
transpileSource(
  'src/features/xensonar/rootFollow/rootFollowImpulseRasterPolicy.ts',
  'rootFollowImpulseRasterPolicy.cjs',
  (source) => source.replace('from "../rhythmSegmentPattern"', 'from "./rhythmSegmentPattern.cjs"'),
);

const requireFromTmp = createRequire(path.join(tmp, 'runtime-check.cjs'));
const policy = requireFromTmp('./rootFollowImpulseRasterPolicy.cjs');
const rhythm = requireFromTmp('./rhythmSegmentPattern.cjs');

const normalizedBypass = policy.normalizeRootFollowImpulseRasterPolicy({ cycleDiv: 1, counterDiv: 1, pattern: [1] });
assert(policy.isRootFollowImpulseRasterBypass(normalizedBypass), '1/1 [1] must be bypass.');
assert(!policy.isRootFollowImpulseRasterAllMuted(normalizedBypass), 'Bypass must not be all-muted.');

const allMuted = policy.normalizeRootFollowImpulseRasterPolicy({ cycleDiv: 4, counterDiv: 3, pattern: [0, 0, 0] });
assert(policy.isRootFollowImpulseRasterAllMuted(allMuted), 'All-zero pattern must be detected as all-muted.');
assert(!policy.isRootFollowImpulseRasterBypass(allMuted), 'All-zero pattern must not be bypass.');

const mixed = policy.normalizeRootFollowImpulseRasterPolicy({ cycleDiv: 4, counterDiv: 3, pattern: [0, 0, 1] });
assert(!policy.isRootFollowImpulseRasterAllMuted(mixed), 'Mixed pattern must not be all-muted.');
assert(policy.isRootFollowImpulseRasterSlotAudible({ globalSlot: 3, policy: mixed }), 'Third slot of [0,0,1] must be audible.');
assert(!policy.isRootFollowImpulseRasterSlotAudible({ globalSlot: 4, policy: mixed }), 'Fourth global slot of 3-over-4 [0,0,1] must drift back to muted.');

const preview = policy.previewRootFollowImpulseRasterCycleGroups({ cycleDiv: 4, counterDiv: 3, pattern: [0, 0, 1], cycles: 4 }).join(' | ');
assert(preview === '..X. | .X.. | X..X | ..X.', `3-over-4 grouped preview drift regression: ${preview}`);

const expanded = rhythm.resizeSegmentPatternPreservingMutedTail([0, 0, 1], 5);
assert(JSON.stringify(expanded) === JSON.stringify([0, 0, 1, 0, 0]), `Sync resize must preserve explicit slots and mute new tail, got ${JSON.stringify(expanded)}`);
const shrunk = rhythm.resizeSegmentPatternPreservingMutedTail([1, 0, 1, 0, 1], 3);
assert(JSON.stringify(shrunk) === JSON.stringify([1, 0, 1]), `Sync shrink must trim without rewriting existing slots, got ${JSON.stringify(shrunk)}`);

console.log('[xensonar] Root-Follow Impulsraster policy runtime: green');
console.log('[xensonar] 3-over-4 grouped preview:', preview);
