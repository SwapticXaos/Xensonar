#!/usr/bin/env node
import fs from 'node:fs';

const read = (path) => fs.readFileSync(path, 'utf8');
const failures = [];
const room = read('src/features/l3lab/spectralForge/SpectralForgeRoom.tsx');
const workflow = read('src/features/l3lab/spectralForge/embodiment/carrierDonorV2EmbodimentWorkflow.ts');
const req = (label, text, needle) => { if (!text.includes(needle)) failures.push(`${label}: missing ${needle}`); };
const forbid = (label, text, needle) => { if (text.includes(needle)) failures.push(`${label}: forbidden ${needle}`); };

req('room', room, "runCarrierDonorV2EmbodimentWorkflow");
req('room', room, 'onEmbodyTimbre={handleEmbodyTimbreV2}');
for (const needle of [
  'extractSpectralSkeleton',
  'buildAnchorContinuityGraph',
  'buildAnchorRelativeTimbreTensor',
  'buildDonorTimbreAtlas',
  'buildMaterialAllocationPreview',
]) forbid('room', room, needle);

for (const needle of [
  'retargetAudioSourceAsset',
  'donorHearingRuntime.beginExtraction',
  'prepareDonorProjection',
  'extractSpectralSkeleton',
  'buildAnchorContinuityGraph',
  'buildGestaltField',
  'extractDonorAnchors',
  'buildAnchorRelativeTimbreTensor',
  'buildDonorTimbreAtlas',
  'buildMaterialField',
  'buildAnchorBindingPreview',
  'buildMaterialAllocationPreview',
  'buildV2EmbodimentField',
  'failCarrierSkeletonBuild(message)',
  'failMaterialAllocationBuild(message)',
]) req('workflow', workflow, needle);

const roomLines = room.split(/\r?\n/).length;
const workflowLines = workflow.split(/\r?\n/).length;
if (roomLines > 850) failures.push(`room: expected <=850 lines, got ${roomLines}`);
if (workflowLines > 280) failures.push(`workflow: expected <=280 lines, got ${workflowLines}`);

if (failures.length) {
  console.error('[spectralforge-carrier-donor-v2-embodiment-workflow-boundary] FAILED');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log(`[spectralforge-carrier-donor-v2-embodiment-workflow-boundary] OK · room ${roomLines} lines, workflow ${workflowLines} lines.`);
