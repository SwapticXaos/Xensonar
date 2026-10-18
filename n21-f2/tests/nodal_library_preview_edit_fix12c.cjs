'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {load}=require('./offline_runtime.cjs');
const root=path.resolve(__dirname,'..'),bridge=require('./nodal_sources.cjs').readNodalSources(root),designer=fs.readFileSync(path.join(root,'src/nodal/07_sound_designer.js'),'utf8'),backend=fs.readFileSync(path.join(root,'src/nodal/05_installation_bridge.js'),'utf8'),css=fs.readFileSync(path.join(root,'styles/20_nodal_sound_designer.css'),'utf8');
assert.match(bridge,/function NodalLibraryManager\(/);
assert.match(bridge,/function nodalPreviewLibraryEntry\(/,'Library preview must have an audio path independent of selection');
assert.match(bridge,/function nodalEditLibraryEntry\(/,'Library edit must navigate with an instrument ID and revision');
assert.match(backend,/stopPreview,/, 'Backend must offer a preview-only stop, not general instrument stop');
assert.match(designer,/__NodalPendingLibraryEntry/, 'Designer must accept a library edit identity');
assert.match(designer,/libraryIdentity = P\.useRef\(initial\.libraryEntry/, 'Saving an edited library sound must update its identity');
assert.match(designer,/libraryEdit[\s\S]*Back to Melodic Loop/, 'Library edit must provide explicit return without adding a track');
assert.match(css,/\.nd-library-manager-content\{[^}]*position:absolute/,'Manage flyout must not displace the melody canvas');
const m=load(root);
const states=m.run(`(()=>{const entry=__XenNodalLibrary.save(nodalStarter('glass'));const before=__XenNodalLibrary.list().length;const data=nodalEditLibraryEntry(entry,{dispatchEvent:() => {}});return {before,after:__XenNodalLibrary.list().length,entryId:data.libraryEntry.id,revision:data.libraryEntry.revision,hasTarget:Object.hasOwn(data,'target')};})()`);
assert.equal(states.before,states.after);
assert(states.entryId&&states.revision===1&&!states.hasTarget,'Edit must navigate without creating notes or carrying stale block target');
assert.match(bridge,/onClick: \(\) => previewEntry\(entry\)/,'Preview must be independently clickable on each saved sound');
assert.match(bridge,/onClick: \(\) => editEntry\(entry\)/,'Edit must be independently clickable on each saved sound');
assert.match(bridge,/previewId === entry.id \? 'Stop' : 'Preview'/,'Preview button must expose a visible stop state');
assert.match(designer,/libraryEdit\s*\?\s*null\s*:\s*h\('button',\s*\{className:\s*'nd-send'/,'Library Edit must not append a track through Send');
// Exercise the actual audio buffer path without mounting Room III. That is exactly
// where library Preview needs to work: Melodic Loop is the active workspace.
(async () => {
  const result = await m.run(`(async()=>{
    let routed=0, audioStarted=0, released=0;
    const context={state:'running',sampleRate:48000,currentTime:2,
      createAnalyser:()=>({tag:'preview-analyser',connect(output){if(output.tag!=='shared-main-mix')throw Error('wrong master output');routed++},disconnect(){}}),
      createBuffer:(c,n,s)=>({copyToChannel:x=>{if(!x.some(y=>Math.abs(y)>0.005))throw Error('silent PCM')}}),
      createBufferSource:()=>({connect(output){if(output.tag!=='preview-analyser')throw Error('wrong analysis route')},start(){audioStarted++},stop(){this.onended?.()},disconnect(){},onended:null})};
    const nodeRef={current:{nodes:[{residentId:'a',x:40,y:40,freq:220}]}};
    const bridge=__XenNodalInstallation.attach(nodeRef,{width:100,height:100,referenceHz:220,
      audio:{ensureReady:async()=>{},getContext:()=>context,getOutput:()=>({tag:'shared-main-mix'}),acquire:()=>({release(){released++}})}});
    __XenNodalInstallation.activate(nodeRef,bridge);
    const before=JSON.stringify(__XenNodalLibrary.list());
    const entry=__XenNodalLibrary.list()[0];
    const handle=await nodalPreviewLibraryEntry(entry);
    const unchanged=JSON.stringify(__XenNodalLibrary.list())===before;
    bridge.stopPreview();
    __XenNodalInstallation.deactivate(nodeRef,bridge);
    return {routed,audioStarted,released,unchanged,offlinePreview:handle.offlinePreview};
  })()`);
  assert.equal(result.routed,1,'Preview must connect to shared audio output');
  assert.equal(result.audioStarted,1,'Preview must start audio without activating Room III');
  assert.equal(result.released,1,'Stop must release only preview voice');
  assert(result.unchanged,'Preview may not write to the Nodal library');
  assert(result.offlinePreview);
  console.log('PASS: Preview real PCM to shared output, independent of Room III, no storage mutation');
})().catch(e=>{console.error(e);process.exitCode=1});
console.log('PASS: Nodal library Preview/Edit control identity and overlay');
