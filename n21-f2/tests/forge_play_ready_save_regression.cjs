'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.join(__dirname, '..');
const read = p => fs.readFileSync(path.join(root, p), 'utf8');
const hearing = read('src/forge_and_melodic/10_audition_and_persistence.js');
const transport = read('src/forge/editor/07_composition_and_preview_ui.js');
const css = read('styles/08_forge_workflow.css');
const block = (text, start, end) => {
  const i=text.indexOf(start);
  assert(i>=0,`missing ${start}`);
  const j=text.indexOf(end,i+start.length);
  assert(j>i,`missing ${end}`);
  return text.slice(i,j);
};
const helpers=block(hearing,'function __f333HearingCacheKey(', 'function __f333Stop(');
const ctx={
 __f333HearingCache:new Map(),
 Ti:x=>JSON.stringify(x),ER:x=>x.signature,
 fractaliaDonorSnapshot:()=>({key:'donor-A'}),
 __Fractalia:{snapshot:()=>({}),semanticKey:x=>x.key},
 __Emilia:{snapshot:()=>({}),semanticKey:x=>x.key},
 xt:{getContext:()=>({sampleRate:48000})},
 IB:r=>({durationSec:r.snapshot.duration, auditionSelection:r.selection, synthLab:r.synthLab, harmonicXplore:r.harmonicXplore, previewPitchRatio:r.pitch||1}),
 __f3565PitchSemis:()=>0,
 __f333HearingRequest:s=>({machineId:s.machine,snapshot:s.snapshot,selection:s.selection,synthLab:s.synthLab,harmonicXplore:s.harmonicXplore,pitch:s.pitch}),
 OB:x=>x,
 __f333Route:s=>s.route,
 pe:{getState:()=>({})},
};
vm.createContext(ctx);vm.runInContext(helpers,ctx);
const base={route:'hearing',machine:'emilia-nodal-carrier',snapshot:{signature:'paint-A',duration:2,emiliaInstrument:{key:'net-A'}},selection:'selection-A',synthLab:'lab-A',harmonicXplore:'hx-A',pitch:1};
const req=ctx.__f333HearingRequest(base);
const key=ctx.__f333HearingCacheKey(req,ctx.IB(req));
assert.equal(ctx.__f333CachedPreviewReady(base),false,'unrendered mode is gray');
ctx.__f333HearingCache.set(key,{length:96000});
assert.equal(ctx.__f333CachedPreviewReady(base),true,'exact cached PCM is ready, even with no transport prewarm token');
assert.equal(ctx.__f333CachedPreviewReady({...base,snapshot:{...base.snapshot,signature:'paint-B'}}),false,'editing the canvas invalidates readiness');
assert.equal(ctx.__f333CachedPreviewReady({...base,snapshot:{...base.snapshot,emiliaInstrument:{key:'net-B'}}}),false,'new Emilia instrument cannot reuse old readiness');
assert.equal(ctx.__f333CachedPreviewReady({...base,pitch:1.15}),false,'changing tuning invalidates readiness');
assert.equal(ctx.__f333CachedPreviewReady({...base,route:'donor'}),false,'an unrelated donor route cannot steal cached hearing readiness');
ctx.__f333HearingCache.clear();
assert.equal(ctx.__f333CachedPreviewReady(base),false,'sleeping Forge drops cached PCM readiness');
assert.equal(ctx.__f333CachedPreviewReady({...base,route:'reference',sourceAsset:{monoSamples:new Float32Array(12)}}),true,'decoded reference audio is immediately playable');
assert.equal(ctx.__f333CachedPreviewReady({...base,route:'reference',sourceAsset:null}),false,'reference without source is not ready');
assert.match(hearing,/__f333CacheReadyNotify\(\)/,'cache mutations must notify the button');
assert.match(transport,/__f333CachedPreviewReady\(pe\.getState\(\)\)/,'transport reads the real audio cache');
assert.match(transport,/\bfn\s*=\s*t\s*===\s*"forge3"\s*\?\s*\([^;]+__f333PcmCached\)\s*:\s*un\.readyForImmediatePlay/,'current Forge requires exact cached PCM; legacy retains its session state');
assert.doesNotMatch(transport,/un\.readyForImmediatePlay\s*\|\|\s*__f333PcmCached/,'a stale local ready flag cannot make the current Forge green');
assert.match(css,/\.f31-play-rack \.f34-project-save-on-main \.f33-project-save\s*\{[^}]*grid-template-rows:\s*26px\s+8px\s+12px/s,'project name size preserved and save has its own extra vertical space');
assert.match(css,/\.f31-play-rack \.f34-project-save-on-main \.f33-project-save-button\s*\{[^}]*grid-row:\s*1\s*\/\s*3[^}]*height:\s*34px/s,'Save matches Play 34px height and centers vertically');
console.log('PASS Spectral Forge ready-from-cache / stale / source / Save geometry');
