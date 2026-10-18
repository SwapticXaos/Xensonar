'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const R=path.join(__dirname,'..');
const melodic=require('./nodal_sources.cjs').readNodalSources(R);
const render=fs.readFileSync(path.join(R,'src/forge_and_melodic/04_render_cache_and_stems.js'),'utf8');
const actions=fs.readFileSync(path.join(R,'src/forge_and_melodic/05_preview_and_sample_intake.js'),'utf8');
// These contract assertions intentionally target the real UI routes, not a new unrelated helper.
assert.match(render,/if\(nodalHasMelodicNotes\(e\)\s*&&\s*e\.noteId\)return nodalPlayMelodic\(e\)/,
  'Direct note previews remain synthetic, but full compositions use the same complete polyphonic stem path as ordinary instruments');
assert.match(render,/rootFollowPreferred.*__mlNodalRflConfig\(e\.loopComposer\)/s,
  'Nodal composition must not be incorrectly declared as an unsupported legacy direct synth in RFL');
assert.match(actions,/handleLoopComposerExportToForge1:async\(\)=>\s*__mlContainsNodalTracks\(e\.loopComposer\)/,
  'Nodal mix transfer to Forge must select rendered audio, rather than carrier-only figures');
const {load}=require('./offline_runtime.cjs');const r=load(R);
const results=r.run(`(()=>{
  const c={tracks:[{id:'t1',enabled:true,instrumentPreset:'nodal:id@1'}],notes:[{id:'a',trackId:'t1'}],nodalInstruments:{'nodal:id@1':{}}};
  const yes=__mlContainsNodalTracks(c),conf=__mlNodalRflConfig(c);
  const no=__mlContainsNodalTracks({...c,notes:[]});
  const muted=__mlContainsNodalTracks({...c,tracks:[{...c.tracks[0],enabled:false}]});
  return {yes,sourceKind:conf.sourceKind,renderMode:conf.renderMode,hasSynthPattern:!!conf.synthPattern,no,muted};
})()`);
assert.equal(results.yes,true);assert.equal(results.sourceKind,'material');assert.equal(results.renderMode,'flowing');assert.equal(results.hasSynthPattern,false);assert.equal(results.no,false);assert.equal(results.muted,false);
console.log('PASS Nodal composition mix / Root Follow audio / Forge audio route contracts');
