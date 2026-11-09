#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const target = join(root, 'src/features/l3lab/spectralForge/integral/carrierIntegralAuditionRoutes.ts');
const source = readFileSync(target, 'utf8');

const failures = [];

function assertContains(fragment, label) {
  if (!source.includes(fragment)) failures.push(`missing ${label}`);
}

assertContains('function resolveSyntheticPolytracePreviewBaseHz(rootFollowBaseHz: number)', 'synthetic polytrace baseHz helper');
assertContains('baseHz: resolveSyntheticPolytracePreviewBaseHz(rootFollowBuild.summary.baseHz)', 'Root-Follow baseHz handoff to synthetic polytrace preview');
assertContains('Using the display-axis anchor here pitches dense/high drawings upward', 'regression note for display-axis overpitch risk');
assertContains('rootHz: resolveCarrierIntegralDisplayAxisAnchorHz(spectralData, context.previewPitchRatio)', 'display-axis root remains available for HX/SpektralSynthese direct preview');

const syntheticSectionStart = source.indexOf('export async function prewarmCarrierIntegralSyntheticRootFollowRoute');
const syntheticSectionEnd = source.indexOf('await audioEngine.playRootFollowSynthPreview', syntheticSectionStart);
const syntheticSection = source.slice(syntheticSectionStart, syntheticSectionEnd);
if (syntheticSection.includes('baseHz: resolveCarrierIntegralDisplayAxisAnchorHz')) {
  failures.push('synthetic A/B/C polytrace preview still uses display-axis anchor for baseHz');
}

const expectedCount = (source.match(/baseHz: resolveSyntheticPolytracePreviewBaseHz\(rootFollowBuild\.summary\.baseHz\)/g) || []).length;
if (expectedCount !== 2) {
  failures.push(`expected exactly 2 synthetic polytrace Root-Follow baseHz handoffs, found ${expectedCount}`);
}

if (failures.length) {
  console.error('[spectralforge-polytrace-basehz-regression-7772] FAIL');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('[spectralforge-polytrace-basehz-regression-7772] PASS: Antonia/Bert/Cecilia polytrace previews use Root-Follow baseHz again; HX/SpektralSynthese display-axis root remains untouched.');
