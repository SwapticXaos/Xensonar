'use strict';const fs=require('fs'),path=require('path'),crypto=require('crypto'),assert=require('assert/strict');
const root=path.join(__dirname,'..'),reference=require('./fixtures/myzel_g2_g_reference.json'),manifest=require('../source-manifest.json');
const allowed=new Set(['src/audio/08_myzel_g_live.js','src/audio/09_myzel_g_dsp.js','src/audio/entrophon/02_worklet_and_voice_backend.js','src/rhythm/02_bass_and_rack.js','src/app/forge/01_room_shell.js','src/audio/03_recorder.js','src/runtime/instrument/09_monitoring_and_manual_patterns.js','src/runtime/instrument/08_library_and_tuning_editor.js','src/audio/01_voice_and_rfl_ownership.js']);
const changed=[];for(const x of reference.files){const hash=crypto.createHash('sha256').update(fs.readFileSync(path.join(root,x.file))).digest('hex');if(hash!==x.sha256){assert(allowed.has(x.file),'unexpected G change: '+x.file);changed.push(x.file);}}
assert.equal(changed.length,allowed.size);assert.deepEqual(manifest.styles,reference.manifest.styles,'all original graphics/styles remain exact');
assert.deepEqual(manifest.files.filter(x=>!reference.manifest.files.includes(x)),['src/myzel/01_effect_mapping.js','src/audio/07_myzel_g_geometry.js']);
const snapshot=fs.readFileSync(path.join(root,'src/audio/entrophon/02_worklet_and_voice_backend.js'),'utf8');
assert(snapshot.includes('frequency:s.freq,isCustomResident:!!s.isCustomResident,muted:!!s.residentMuted'));
assert(snapshot.includes('myzelAudioNodes:p.nodeConfigs,myzelAudioWidth:r,myzelAudioHeight:a'));
assert(fs.readFileSync(path.join(root,'src/app/forge/01_room_shell.js'),'utf8').includes('installationAudible:e!=="L3LAB"'));
// Subtract only the two reviewed G2 effect-mapping edits inside the protected rhythm seam.
// All other original Nodal integration code must still reconstruct byte-for-byte.
function removeNewOrganMappingFromRhythm(source) {
  const replaceOnce=(oldValue,newValue)=>{assert.equal(source.split(oldValue).length,2,'Reviewed organ mapping patch not found once');source=source.replace(oldValue,newValue)};
  replaceOnce('onResetLayout:e.onResetLayout,getMyzelEffectNodes:e.getMyzelEffectNodes,onSetMyzelEffect:e.onSetMyzelEffect,systemState:e.systemState','onResetLayout:e.onResetLayout,systemState:e.systemState');
  replaceOnce('onResetLayout:e.resetMyzelTopologyNodes,getMyzelEffectNodes:e.getMyzelEffectNodes,onSetMyzelEffect:e.onSetMyzelEffect,systemState:e.systemState','onResetLayout:e.resetMyzelTopologyNodes,systemState:e.systemState');
  replaceOnce('resetMyzelTopologyNodes:e.resetMyzelTopologyNodes,getMyzelEffectNodes:e.getMyzelEffectNodes,onSetMyzelEffect:e.onSetMyzelEffect,systemState:e.systemState','resetMyzelTopologyNodes:e.resetMyzelTopologyNodes,systemState:e.systemState');
  replaceOnce('const Gpe=(e,t,n)=>myzelRandomEffectAssignments(fc.map((r,a)=>','const Gpe=(e,t,n)=>fc.map((r,a)=>');
  replaceOnce('residentStepIndex:a,residentMuted:!1,isCustomResident:!1})));','residentStepIndex:a,residentMuted:!1,isCustomResident:!1}));');
  return source;
}
const {restoreFix13}=require('./nodal_preservation.cjs');
for(const entry of require('./fixtures/myzel_g2_fix13_seams.json')) {
  let source=fs.readFileSync(path.join(root,entry.file),'utf8');
  if(entry.file==='src/rhythm/02_bass_and_rack.js')source=removeNewOrganMappingFromRhythm(source);
  restoreFix13(entry.file,Buffer.from(source));
}
assert(!manifest.files.some(x=>x.includes('/emilia/')));
fs.writeFileSync(path.join(root,'results/myzel_g2_preservation.json'),JSON.stringify({changed,allStylesExact:true,added:['src/myzel/01_effect_mapping.js','src/audio/07_myzel_g_geometry.js'],fix13SeamsReconstruct:true,emiliaNotIntroduced:true},null,2)+'\n');
console.log('PASS G2 integration scope, genuine custom flags, full geometry, original graphics and reconstructable Fix13 seams');
