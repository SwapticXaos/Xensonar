// ML-NOTECLIP-02: the Copy rectangle also loads pink-track notes (Spectral Forge -> Scattered / Fretless projection on the
// Melodic Loop); only the material import body is left out (it owns the slicing). Pasted copies are ordinary placed notes.
// Runs the real __mlNoteClip from the uncompacted build with the composer helpers stubbed (positions in grid units / channels).
const test=require('node:test'),assert=require('node:assert'),fs=require('fs'),vm=require('vm');
const file=fs.existsSync(__dirname+'/../dist/XenSonar_PLAIN.html')?__dirname+'/../dist/XenSonar_PLAIN.html':__dirname+'/../src/rooms/canonical.js';
const src=fs.readFileSync(file,'utf8');const i=src.indexOf('const __mlNoteClip=(()=>{');const j=src.indexOf('})();',i)+5;assert.ok(i>=0&&j>i,'note clip source found');
function load(){const ctx={structuredClone,crypto:require('crypto'),
  Xa:c=>c.total,Ra:c=>c.pitchLines.length,Ed:(c,u)=>Math.round(u),cn:(c,n)=>n.startUnit,wa:(c,n)=>n.channelIndex,yr:(c,n)=>n.durationUnits,pr:(c,n)=>n,
  T7:(c,n,b)=>n.channelIndex>=b.startChannelIndex&&n.channelIndex<=b.endChannelIndex&&n.startUnit>=b.startUnit&&n.startUnit<=b.endUnit,
  fs:n=>n.noteClass==='material-base'||n.noteClass==='material-fragment'};
 vm.createContext(ctx);vm.runInContext(src.slice(i,j)+';this.clip=__mlNoteClip;',ctx);return ctx.clip}
const lines=Array.from({length:12},(_,k)=>({id:'L'+k}));
const pink=(id,s,ch,extra={})=>({id,trackId:'carrier-integral-pink',noteClass:'carrier-fragment',startUnit:s,channelIndex:ch,durationUnits:2,carrierTransfer:{mode:'scattered'},...extra});
test('pink-track notes are copied and pasted; the material import body is not',()=>{
 const clip=load();
 const comp={total:64,pitchLines:lines,notes:[pink('a',2,3),pink('b',4,5,{pendingPitchAnchor:true,pendingGroup:'g1'}),pink('c',6,4),{id:'m',trackId:'material',noteClass:'material-base',startUnit:2,channelIndex:4,durationUnits:8}]};
 const r=clip.capture(comp,{startChannelIndex:0,endChannelIndex:11,startUnit:0,endUnit:10});
 assert.deepEqual({count:r.count,skipped:r.skipped},{count:3,skipped:1},'three pink notes loaded, import body skipped');
 assert.equal(clip.mode(),'paste','switches to Paste by itself');
 clip.hover(comp,{inGrid:true,rawUnit:20,channelIndex:6,geometry:{cellW:1}});
 const ghost=clip.ghostNotes(comp);assert.equal(ghost.length,3,'the figure is shown under the pointer');
 assert.deepEqual(ghost.map(n=>[n.startUnit,n.channelIndex]),[[20,6],[22,8],[24,7]],'figure keeps its shape at the pointer');
 let next=null,status='';const e={loopComposer:comp,mutateLoopComposer:(f,msg)=>{next=structuredClone(comp);f(next);status=msg},setSelectedLoopNoteIds:()=>{},setComposerSelectionBox:()=>{}};
 assert.equal(clip.place(e,{inGrid:true,rawUnit:20,channelIndex:6,geometry:{cellW:1}}),true);
 const added=next.notes.slice(4);assert.equal(added.length,3,status);
 for(const n of added){assert.ok(!['a','b','c'].includes(n.id),'new id');assert.equal(n.pendingPitchAnchor,undefined,'placed, not pending');assert.equal(n.pendingGroup,undefined,'not part of the original pending group');assert.equal(n.trackId,'carrier-integral-pink','stays on the pink track')}
 assert.deepEqual(comp.notes.map(n=>n.id),['a','b','c','m'],'originals unchanged');
});
test('a rectangle with only the import body loads nothing and says why',()=>{
 const clip=load();const comp={total:64,pitchLines:lines,notes:[{id:'m',noteClass:'material-base',startUnit:2,channelIndex:4,durationUnits:8}]};
 assert.deepEqual(clip.capture(comp,{startChannelIndex:0,endChannelIndex:11,startUnit:0,endUnit:10}),{count:0,skipped:1});assert.equal(clip.mode(),'off');
 assert.ok(src.includes('Only material import notes inside the rectangle'),'status names the reason');
});
