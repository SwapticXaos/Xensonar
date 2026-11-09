#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const rendererPath = join(root, 'src/features/xensonar/rootFollow/rootFollowMaterialRenderer.ts');
const contractPath = join(root, 'src/features/xensonar/rootFollow/rootFollowRegressionContract.ts');
const settingsPath = join(root, 'src/features/xensonar/rootFollow/rootFollowGranularSettings.ts');
const renderer = readFileSync(rendererPath, 'utf8');
const contract = readFileSync(contractPath, 'utf8');
const settings = readFileSync(settingsPath, 'utf8');
const failures = [];

function requireContains(label, text, needle) {
  if (!text.includes(needle)) failures.push(`${label} missing ${JSON.stringify(needle)}`);
}

requireContains('contract', contract, 'flowing-is-not-whole-loop-pitch-stepping');
requireContains('contract', contract, 'loop-phase-continues-during-retune');
requireContains('renderer', renderer, 'flowing-live-anchor-slice');
requireContains('renderer', renderer, 'resolveRootFollowGranularSettings');
requireContains('renderer', renderer, 'buildRootFollowGranularRenderTuning');
requireContains('renderer', renderer, 'granularSettings.leadMs / 1000');
requireContains('renderer', renderer, 'granularSettings.stepMs / 1000');
requireContains('renderer', renderer, 'granularSettings.windowMs / 1000');
requireContains('renderer', renderer, 'granularSettings.startLeadMs / 1000');
requireContains('renderer', renderer, 'const rawLiveTargetHz = clamp(dynamicRefs.getCurrentRootHzRef.current(), 27.5, 3520)');
requireContains('renderer', renderer, 'smoothRootFollowMaterialTargetHz');
requireContains('renderer', renderer, 'previousHz: materialSmoothedRootHz');
requireContains('renderer', renderer, 'rawHz: rawLiveTargetHz');
requireContains('renderer', renderer, 'describeMaterialElasticPitch');
requireContains('renderer', renderer, "kind: 'retune-sample'");
requireContains('renderer', renderer, 'loopPhase = wrapModulo(nextSliceStart - transportAnchor, desiredLoopDur)');
requireContains('renderer', renderer, 'nextSliceStart += sliceStepSec');
requireContains('settings', settings, "preset: 'flowing'");
requireContains('settings', settings, "preset: 'smooth'");
requireContains('settings', settings, 'leadMs:');
requireContains('settings', settings, 'stepMs:');
requireContains('settings', settings, 'windowMs:');
requireContains('settings', settings, 'startLeadMs:');

const flowingStart = renderer.indexOf("if (granularSettings.qualityMode !== 'fragment')");
const fragmentStart = renderer.indexOf("markAudioTrafficEvent(refs.trafficRef?.current, {\n      subsystem: 'root-follow',\n      kind: 'grain-window'", flowingStart + 1);
const flowingBlock = flowingStart >= 0 && fragmentStart > flowingStart ? renderer.slice(flowingStart, fragmentStart) : '';
if (!flowingBlock) failures.push('could not isolate flowing Root Follow renderer block');
if (/nominalDur:\s*desiredLoopDur/.test(flowingBlock)) {
  failures.push('flowing block looks like whole-loop scheduling instead of live-anchor micro-slicing');
}
if (!/rawLiveTargetHz[\s\S]*smoothRootFollowMaterialTargetHz[\s\S]*describeMaterialElasticPitch/.test(flowingBlock)) {
  failures.push('flowing block does not preserve raw-live-root -> smoothing -> pitch-contract order');
}

if (failures.length) {
  console.error('[root-follow-contract] FAILED');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('[root-follow-contract] ok');
