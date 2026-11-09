#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const root = process.cwd();
const rendererRel = 'src/features/xensonar/rootFollow/rootFollowMaterialRenderer.ts';
const policyRel = 'src/features/xensonar/rootFollow/rootFollowLaneOwnershipPolicy.ts';
const rendererPath = path.join(root, rendererRel);
const policyPath = path.join(root, policyRel);
const EXPECTED_RENDERER_SHA256 = '1ca422d7453bb113b61bb58035e41a49dec707bd47c5b8c0a109dd226455501e';

const failures = [];
if (!fs.existsSync(rendererPath)) failures.push(`${rendererRel} missing`);
if (!fs.existsSync(policyPath)) failures.push(`${policyRel} missing (reference/test boundary may remain, but live renderer must not import it)`);

if (fs.existsSync(rendererPath)) {
  const bytes = fs.readFileSync(rendererPath);
  const source = bytes.toString('utf8');
  const sha = crypto.createHash('sha256').update(bytes).digest('hex');
  if (sha !== EXPECTED_RENDERER_SHA256) {
    failures.push(`${rendererRel} SHA-256 drifted: ${sha}; expected known-good 132/149B ${EXPECTED_RENDERER_SHA256}`);
  }
  if (source.includes('rootFollowLaneOwnershipPolicy')) {
    failures.push(`${rendererRel} re-imports rootFollowLaneOwnershipPolicy; 149A/B live A/B proved this refactored hotpath regresses Raw Audio Root Follow`);
  }

  const requiredInlineOwners = [
    'function resolveRootFollowSafeVoiceEngineMode(',
    'function buildRootFollowStableLaneStatePlan(',
    'function resolveRootFollowStableLaneBlend(',
    'function shouldRelieveLegacyRootFollowMaterialSlice(',
  ];
  for (const needle of requiredInlineOwners) {
    if (!source.includes(needle)) failures.push(`${rendererRel} lost known-good inline owner: ${needle}`);
  }
}

// The policy module may remain for historical/reference tests, but must not become a live src dependency
// without an explicit new A/B proof against the known-good Raw Audio renderer.
const srcRoot = path.join(root, 'src');
const importingFiles = [];
function walk(dir) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const abs = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(abs);
    else if (/\.(?:ts|tsx|js|jsx|mjs)$/.test(ent.name) && abs !== policyPath) {
      const text = fs.readFileSync(abs, 'utf8');
      if (text.includes('rootFollowLaneOwnershipPolicy')) importingFiles.push(path.relative(root, abs));
    }
  }
}
if (fs.existsSync(srcRoot)) walk(srcRoot);
if (importingFiles.length) {
  failures.push(`live src imports rootFollowLaneOwnershipPolicy: ${importingFiles.join(', ')}`);
}

if (failures.length) {
  console.error('Root Follow Raw Audio goldline 150: FAIL');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Root Follow Raw Audio goldline 150: PASS');
console.log(`- renderer SHA-256: ${EXPECTED_RENDERER_SHA256}`);
console.log('- 132/149B material renderer stays inline');
console.log('- no live src import of rootFollowLaneOwnershipPolicy');
