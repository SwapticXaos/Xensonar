// ML-ERASE-01: Erase shares the Copy rectangle: notes inside the box are deleted in one mutate (one undo step),
// the material import body stays, selection loses the deleted ids. Runs the real __mlNoteClip with helpers stubbed.
const test=require('node:test'),assert=require('node:assert');
const fs=require('fs'),vm=require('vm');
const file=fs.existsSync(__dirname+'/../dist/XenSonar_PLAIN.html')?__dirname+'/../dist/XenSonar_PLAIN.html':__dirname+'/../src/rooms/canonical.js';
const src=fs.readFileSync(file,'utf8');const i=src.indexOf('const __mlNoteClip=(()=>{');const j=src.indexOf('})();',i)+5;assert.ok(i>=0&&j>i,'note clip source found');
function load(){const ctx={structuredClone,queueMicrotask,crypto:require('crypto'),YM:()=>{},
  Xa:c=>c.total,Ra:c=>c.pitchLines.length,Ed:(c,u)=>Math.round(u),cn:(c,n)=>n.startUnit,wa:(c,n)=>n.channelIndex,yr:(c,n)=>n.durationUnits,pr:(c,n)=>n,
  T7:(c,n,b)=>n.channelIndex>=b.startChannelIndex&&n.channelIndex<=b.endChannelIndex&&n.startUnit>=b.startUnit&&n.startUnit<=b.endUnit,
  fs:n=>n.noteClass==='material-base'||n.noteClass==='material-fragment'};
 vm.createContext(ctx);vm.runInContext(src.slice(i,j)+';this.clip=__mlNoteClip;',ctx);return ctx.clip}
const note=(id,s,ch,extra={})=>({id,trackId:'t',startUnit:s,channelIndex:ch,durationUnits:2,...extra});
function env(comp){const log={calls:0,msg:'',sel:['a','x']};
 return {log,e:{loopComposer:comp,mutateLoopComposer:(f,msg)=>{log.calls++;log.msg=msg;f(comp)},setSelectedLoopNoteIds:f=>{log.sel=f(log.sel)}}}}
test('erase deletes the notes inside the rectangle in one mutate and keeps the import body',()=>{
 const clip=load(),comp={total:64,pitchLines:Array.from({length:12},(_,k)=>({id:'L'+k})),selectedNoteId:'a',
  notes:[note('a',2,3),note('b',4,5),note('far',40,5),note('m',3,4,{noteClass:'material-base'})]};
 const {e,log}=env(comp);
 const r=clip.erase(e,{startChannelIndex:0,endChannelIndex:11,startUnit:0,endUnit:10});
 assert.deepEqual({count:r.count,skipped:r.skipped},{count:2,skipped:1});
 assert.equal(log.calls,1,'one undo step');
 assert.deepEqual(comp.notes.map(n=>n.id),['far','m'],'only the notes inside the box are gone, import body stays');
 assert.equal(comp.selectedNoteId,null,'deleted selected note is deselected');
 assert.deepEqual(log.sel,['x'],'selection loses the erased ids');
 assert.equal(clip.snapshot().count,0,'erase never touches the clipboard');
});
test('an empty rectangle or a box without notes does nothing',()=>{
 const clip=load(),comp={total:64,pitchLines:[{id:'L0'}],notes:[note('a',2,0)]};const {e,log}=env(comp);
 assert.equal(clip.erase(e,null).count,0);
 assert.equal(clip.erase(e,{startChannelIndex:0,endChannelIndex:0,startUnit:30,endUnit:40}).count,0);
 assert.equal(log.calls,0,'no history entry');assert.equal(comp.notes.length,1);
});
test('Erase mode is a mode of the shared rectangle owner and switches off again',()=>{
 const clip=load();clip.setMode('erase');assert.equal(clip.mode(),'erase');assert.equal(clip.snapshot().mode,'erase');
 clip.setMode('off');assert.equal(clip.mode(),'off');
});
// ML-MARK-01: the marked notes (= selectedLoopNoteIds) are copied, erased or mirrored in place.
function bound(clip,comp,marked){const log={calls:0,msgs:[],sel:marked.slice()};
 clip.bind({loopComposer:comp,selectedLoopNoteIds:marked,mutateLoopComposer:(f,m)=>{log.calls++;f(comp)},setSelectedLoopNoteIds:f=>{log.sel=typeof f==='function'?f(log.sel):f},setStatus:m=>log.msgs.push(m)});clip.setMarked(marked);return log}
const mk=()=>({total:64,pitchLines:Array.from({length:12},(_,k)=>({id:'L'+k})),selectedNoteId:null,notes:[
 note('a',2,3,{fadeInUnits:1,fadeOutUnits:0,lineId:'L3'}),note('b',6,7,{lineId:'L7'}),note('far',40,5),note('m',3,4,{noteClass:'material-base'})]});
test('flipMarked h reverses the marked notes in time around the middle of the marking and swaps fades; others stay',()=>{
 const clip=load(),comp=mk(),log=bound(clip,comp,['a','b','m']);
 const r=clip.flipMarked('h');assert.equal(r.count,2,'import body is not mirrored');assert.equal(log.calls,1,'one undo step');
 const g=id=>comp.notes.find(n=>n.id===id);
 assert.equal(g('a').startUnit,6,'a (2..4) -> 4..8 mirrored = starts at 6');assert.equal(g('b').startUnit,2,'b (6..8) -> starts at 2');
 assert.equal(g('a').fadeInUnits,0);assert.equal(g('a').fadeOutUnits,1,'fades swapped');
 assert.equal(g('far').startUnit,40);assert.equal(g('m').startUnit,3);
});
test('flipMarked v inverts the pitch order inside the marking and follows the line ids',()=>{
 const clip=load(),comp=mk(),log=bound(clip,comp,['a','b']);
 clip.flipMarked('v');const g=id=>comp.notes.find(n=>n.id===id);
 assert.equal(g('a').channelIndex,7);assert.equal(g('a').lineId,'L7');assert.equal(g('b').channelIndex,3);assert.equal(g('b').lineId,'L3');
 assert.equal(g('far').channelIndex,5);
});
test('copyMarked loads the clipboard and clears the marking; eraseMarked deletes only the marked',()=>{
 const clip=load(),comp=mk(),log=bound(clip,comp,['a','b']);
 const c=clip.copyMarked();assert.equal(c.count,2);assert.equal(clip.mode(),'paste');assert.deepEqual(log.sel,[]);
 const comp2=mk(),log2=bound(clip,comp2,['b','far']);const r=clip.eraseMarked();
 assert.equal(r.count,2);assert.deepEqual(comp2.notes.map(n=>n.id),['a','m']);assert.equal(log2.calls,1);
 const comp3=mk(),log3=bound(clip,comp3,[]);assert.equal(clip.eraseMarked().count,0);assert.equal(log3.calls,0,'nothing marked, nothing happens');
});
test('a click that changes the selection drops the marking, so a lone clicked note never hijacks Copy',()=>{
 const clip=load(),comp=mk();bound(clip,comp,['a','b']);assert.equal(clip.snapshot().marked,2);
 clip.bind({loopComposer:comp,selectedLoopNoteIds:['far'],mutateLoopComposer(){},setSelectedLoopNoteIds(){},setStatus(){}});
 assert.equal(clip.copyMarked().count,0,'nothing marked any more');
});
