#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const repoRoot = process.cwd();
const contractPath = path.join(
  repoRoot,
  'src/features/l3lab/spectralForge/integral/carrierDescriptorContract.ts',
);
const indexPath = path.join(
  repoRoot,
  'src/features/l3lab/spectralForge/integral/index.ts',
);

const assert = (condition, message) => {
  if (!condition) throw new Error(`[carrier-descriptor-contract] ${message}`);
};

const source = fs.readFileSync(contractPath, 'utf8');
const indexSource = fs.readFileSync(indexPath, 'utf8');

const withoutComments = source
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/\/\/.*$/gm, '');

const requireText = (needle, label = needle) => {
  assert(source.includes(needle), `missing ${label}`);
};

const requireCode = (needle, label = needle) => {
  assert(withoutComments.includes(needle), `missing code contract: ${label}`);
};

// Required public contract types.
for (const typeName of [
  'CarrierEnergyField',
  'CarrierSeamMeasure',
  'CarrierColumnMeasure',
  'CarrierMeasureSeries',
  'CarrierDescriptorHints',
  'CarrierDescriptor',
]) {
  requireCode(`export type ${typeName}`, typeName);
}

// Versioning and nullability rules.
requireCode('readonly contractVersion: 1;', 'literal contractVersion: 1');
requireCode('readonly centroid: number | null;', 'centroid nullability');
requireCode('readonly spread: number | null;', 'spread nullability');
requireCode('readonly hints: CarrierDescriptorHints | null;', 'nullable hints');

// Global-normalization and seam audit vocabulary.
requireCode('readonly globalEnergyMax: number;', 'globalEnergyMax audit field');
requireCode('readonly centroidDelta: number | null;', 'seam centroidDelta');
requireCode('readonly meanEnergyDelta: number;', 'seam meanEnergyDelta');
requireCode('readonly spreadDelta: number | null;', 'seam spreadDelta');
requireCode('readonly centroidSlopeMismatch: number | null;', 'seam centroidSlopeMismatch');

// Diagnostic hints accepted from the Claude/Gemini review.
requireCode('readonly centroidPathLengthNorm: number;', 'centroidPathLengthNorm hint');
requireCode('readonly spreadVariance: number;', 'spreadVariance hint');
requireCode('readonly emptinessRatio: number;', 'emptinessRatio hint');

// No hidden renderer/UI authority fields in the contract body.
const forbiddenIdentifierPatterns = [
  /\bbodyType\b/,
  /\bdominantBodyType\b/,
  /\bcontourConfidence\b/,
  /\bsuggestedRenderer\b/,
  /\bsuggestedMode\b/,
  /\bshouldLoop\b/,
  /\bwindowCount\b/,
  /\bisLine\b/,
  /\brendererHint\b/,
  /\buiLabel\b/,
  /\buiBadge\b/,
];
for (const pattern of forbiddenIdentifierPatterns) {
  assert(!pattern.test(withoutComments), `forbidden authority identifier leaked: ${pattern}`);
}

// This patch must remain type-only: no extractor, no audio path, no window/global wiring.
const forbiddenRuntimePatterns = [
  /\bfunction\b/,
  /\bexport\s+const\b/,
  /\bexport\s+function\b/,
  /\bwindow\s*\./,
  /\bAudioContext\b/,
  /\bsessionStorage\b/,
  /\bdispatchEvent\b/,
  /\bdocument\s*\./,
];
for (const pattern of forbiddenRuntimePatterns) {
  assert(!pattern.test(withoutComments), `runtime behavior leaked into type-only contract: ${pattern}`);
}

// Avoid probabilistic guards and accidental direct adapter tests in the contract script itself.
assert(!/Math\.random\s*\(/.test(source), 'Math.random must not appear in contract guard');
assert(
  indexSource.includes("export * from './carrierDescriptorContract';") ||
    indexSource.includes('export * from "./carrierDescriptorContract";'),
  'integral index does not export carrierDescriptorContract',
);

console.log('[xensonar] carrierDescriptorContract: Guard grün');
console.log('  contractVersion: literal 1');
console.log('  seamMeasure: centroidDelta / meanEnergyDelta / spreadDelta / centroidSlopeMismatch');
console.log('  hints: centroidPathLengthNorm / spreadVariance / emptinessRatio');
console.log('  keine Renderer-/UI-Autorität, kein Runtime-Wiring, kein Math.random');
