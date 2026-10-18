'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict'),path=require('node:path');
const {load}=require('./offline_runtime.cjs');
const root=path.resolve(__dirname,'..');
const read=f=>fs.readFileSync(path.join(root,f),'utf8');
const bridge=require('./nodal_sources.cjs').readNodalSources(root);
const designer=read('src/nodal/07_sound_designer.js');
const noteEditor=read('src/forge_and_melodic/06_note_editor_and_material_tools.js');
const shell=read('src/app/forge/01_room_shell.js');
assert(bridge.includes('function nodalUpdateMelodicInstrument('),'Editing needs an in-place update path');
assert(bridge.includes('sourcePreset')&&bridge.includes('noteId')&&bridge.includes('trackId'),'Editing passes the original target identity, not just an instrument snapshot');
assert(designer.includes('Apply Changes')&&designer.includes('Back to Melodic Loop'),'Editor needs explicit apply/return actions');
assert(!designer.includes('Raum wird Stimme')&&!designer.includes('Organe verbinden. Gemeinsame Schwingungen entdecken.'),'Remove pseudo-poetic UI headline');
assert(noteEditor.includes('p==="synth-live"') && !noteEditor.includes('p==="synth-live"&&!isNodal'),'Nodal blocks must retain the normal block curve editor');
assert(shell.includes('__NodalPendingEditTarget='),'Navigation must keep the selected note target');
const harness=load(root);
const value=harness.run(`(()=>{
 OLe(Oqe({initialSession:null,externalLogicView:'melodic'}));
 const sent=nodalSendToMelodic(nodalStarter('glass'));
 const before=$n(EQ().loopComposer);
 const note=before.notes.find(n=>n.trackId===sent.trackId);
 const other=nodalSendToMelodic(nodalStarter('breath'));
 const starting=$n(EQ().loopComposer);
 const source=starting.nodalInstruments[sent.preset];
 const wanted={noteId:note.id,trackId:sent.trackId,sourcePreset:sent.preset};
 const edited=__XenNodalModel.normalize({...source,name:'Geänderter Körper',nodes:source.nodes.map((n,i)=>i===0?{...n,x:.61}:n)});
 const result=nodalUpdateMelodicInstrument(edited,wanted);
 const after=$n(EQ().loopComposer);
 const current=after.notes.find(n=>n.id===note.id);
 const editedPreset=yW(after.tracks.find(t=>t.id===sent.trackId),current);
 return {changed:result?.updated,oldTracks:starting.tracks.length,newTracks:after.tracks.length,oldNotes:starting.notes.length,newNotes:after.notes.length,
   noteUnchanged:current.id===note.id&&current.startUnit===note.startUnit&&current.durationUnits===note.durationUnits,
   selectedNoteId:after.selectedNoteId,originalNoteId:note.id,presetChanged:editedPreset!==sent.preset,editedName:after.nodalInstruments[editedPreset]?.name,
   otherTrackRetained:after.tracks.some(t=>t.id===other.trackId),otherUnchanged:after.tracks.find(t=>t.id===other.trackId)?.instrumentPreset===other.preset,
   noDuplicateSourceRebind:after.notes.filter(n=>n.id===note.id).length===1,
   sourceCount:Object.keys(after.nodalInstruments).length};
})()`);
assert(value.changed,'Update acknowledged');
assert.equal(value.newTracks,value.oldTracks,'Never create a new track while editing');
assert.equal(value.newNotes,value.oldNotes,'Never create a new note while editing');
assert(value.noteUnchanged,'Musical note geometry must survive');
assert.equal(value.selectedNoteId,value.originalNoteId,'Original note remains selected');
assert(value.presetChanged,'Edited body should have its own versioned source');
assert.equal(value.editedName,'Geänderter Körper');
assert(value.otherTrackRetained&&value.otherUnchanged&&value.noDuplicateSourceRebind);
assert.equal(value.sourceCount,2,'Obsolete embedded Nodal snapshots should not accumulate');
console.log('PASS: in-place Nodal sound edit preserves block identity, geometry, other tracks and sources');
const repeated=harness.run(`(()=>{
  const original=$n(EQ().loopComposer);
  const noteId=original.selectedNoteId, note=original.notes.find(n=>n.id===noteId);
  const lane=original.tracks.find(t=>t.id===note.trackId);
  const originalPreset=yW(lane,note);
  const snapshot=JSON.stringify(original);
  const cancelled=__XenNodalModel.normalize({...nodalFindInstrument(originalPreset,original),name:'Nicht übernommen'});
  if (!cancelled) throw new Error('Unable to edit test draft');
  const preserved=JSON.stringify($n(EQ().loopComposer))===snapshot;
  let target={noteId,trackId:lane.id,sourcePreset:originalPreset};
  let staleRejected=false;
  for(let i=0;i<14;i++) {
    const previous=nodalFindInstrument(target.sourcePreset,EQ().loopComposer);
    const result=nodalUpdateMelodicInstrument({...previous,name:'Bearbeitung '+i},target);
    target={...target,sourcePreset:result.preset};
  }
  try {nodalUpdateMelodicInstrument(cancelled,{...target,sourcePreset:originalPreset})} catch {staleRejected=true}
  const after=$n(EQ().loopComposer);
  return {preserved,staleRejected,sourceCount:Object.keys(after.nodalInstruments).length,
    trackCount:after.tracks.length,noteCount:after.notes.length, selectedNote:after.selectedNoteId===noteId,
    latestName:nodalFindInstrument(target.sourcePreset,after)?.name};
})()`);
assert(repeated.preserved, 'Exiting without Apply must not change the Melodic session');
assert(repeated.staleRejected, 'Stale edit targets must not overwrite another change');
assert.equal(repeated.sourceCount,2,'Repeated edits must not fill the Nodal source bank');
assert.equal(repeated.trackCount,value.newTracks);
assert.equal(repeated.noteCount,value.newNotes);
assert(repeated.selectedNote);
assert.equal(repeated.latestName,'Bearbeitung 13');
console.log('PASS: cancellation leaves composer intact; repeated edits are bounded; stale edit rejected');

