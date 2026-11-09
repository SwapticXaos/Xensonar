import assert from 'node:assert/strict';
import { createDonorHearingRuntime } from '../../src/features/l3lab/spectralForge/donorV2/donorHearingRuntime';
import type { AudioSourceAsset } from '../../src/features/l3lab/spectralForge/audio/AudioImporterTypes';
import type { DonorProjectionModel } from '../../src/features/l3lab/spectralForge/donorV2/donorProjection';
const source = (samples = new Float32Array(48000)) => ({ monoSamples: samples, importStartSec: 0, importDurationSec: 1 } as AudioSourceAsset);
const model = {} as DonorProjectionModel;
let passed = 0;
function test(name: string, run: () => void) { run(); passed++; console.log(`ok ${passed} - ${name}`); }
test('readiness needs the exact extraction generation, never a delayed old sample', () => {
 const runtime = createDonorHearingRuntime(), a = source(), b = source();
 assert.equal(runtime.selectDonor(), false);
 const first = runtime.beginExtraction(a), second = runtime.beginExtraction(b);
 assert.equal(runtime.commitExtraction(first,a,model),false);
 assert.equal(runtime.commitExtraction(second,b,model),true);
 assert.equal(runtime.selectDonor(),true);
});
test('window edits invalidate ready material even when PCM identity is unchanged', () => {
 const runtime=createDonorHearingRuntime(), a=source(); runtime.commitExtraction(runtime.beginExtraction(a),a,model); runtime.selectDonor();
 runtime.invalidateInput({...a}); assert.equal(runtime.getSnapshot().phase,'ready');
 runtime.invalidateInput(a,.2,.8); assert.equal(runtime.getSnapshot().phase,'missing'); assert.equal(runtime.selectDonor(),false);
 assert.equal(runtime.getSnapshot().selected,true); // Never silently fall back to a different hearing.
});
test('stop cancels a pending render and stale completion cannot mark it playing', () => {
 const runtime=createDonorHearingRuntime(), a=source(); runtime.commitExtraction(runtime.beginExtraction(a),a,model); runtime.selectDonor();
 const token=runtime.beginRender(); let stopped=0; runtime.setPlaybackStopHandler(()=>stopped++);
 runtime.stop(); runtime.markPlaying(token); assert.equal(stopped,1); assert.equal(runtime.getSnapshot().phase,'ready'); assert.equal(runtime.getSnapshot().selected,true);
 runtime.stop(); assert.equal(stopped,1);
});
test('choosing a carrier stops only the owned donor and removes donor routing', () => {
 const runtime=createDonorHearingRuntime(), a=source(); runtime.commitExtraction(runtime.beginExtraction(a),a,model); runtime.selectDonor();
 const token=runtime.beginRender(); runtime.markPlaying(token); let stopped=0; runtime.setPlaybackStopHandler(()=>stopped++);
 runtime.selectCarrier(); runtime.finish(token); assert.equal(stopped,1); assert.equal(runtime.getSnapshot().selected,false); assert.equal(runtime.getSnapshot().phase,'ready');
});
test('new extraction releases donor playback and cannot inherit the old model', () => {
 const runtime=createDonorHearingRuntime(), a=source(); runtime.commitExtraction(runtime.beginExtraction(a),a,model); runtime.selectDonor();
 let stopped=0; runtime.setPlaybackStopHandler(()=>stopped++); runtime.beginExtraction(source());
 assert.equal(stopped,1); assert.equal(runtime.getSnapshot().model,null); assert.throws(()=>runtime.beginRender());
});
test('ordinary transport stop during analysis does not strand analysis forever', () => {
 const runtime=createDonorHearingRuntime(),a=source(); const token=runtime.beginExtraction(a); runtime.stop(); assert.equal(runtime.commitExtraction(token,a,model),true);
});
test('changing a stereo channel invalidates material even if its mono preview is shared', () => {
 const runtime=createDonorHearingRuntime(),a={...source(),leftSamples:new Float32Array(8),rightSamples:new Float32Array(8),sampleRate:48000};
 runtime.commitExtraction(runtime.beginExtraction(a),a,model);
 runtime.invalidateInput({...a,rightSamples:new Float32Array(8)});
 assert.equal(runtime.getSnapshot().model,null);
});
test('choosing another hearing while extraction runs does not discard its completed material', () => {
 const runtime=createDonorHearingRuntime(),a=source(),token=runtime.beginExtraction(a);
 runtime.selectCarrier(); assert.equal(runtime.commitExtraction(token,a,model),true);
 assert.equal(runtime.getSnapshot().selected,false);
});
test('finished playback relinquishes stop ownership before another source starts', () => {
 const runtime=createDonorHearingRuntime(),a=source(); runtime.commitExtraction(runtime.beginExtraction(a),a,model);
 const token=runtime.beginRender(); let stopped=0; runtime.setPlaybackStopHandler(()=>stopped++);
 runtime.finish(token); runtime.selectCarrier(); assert.equal(stopped,0);
});
console.log(`${passed} donor routing/lifecycle tests passed`);
