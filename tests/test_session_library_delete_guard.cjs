'use strict';
// Portable and deterministic contract for the M1 add-on: no UI, audio or IDB needed.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const src = fs.readFileSync(path.join(__dirname, '../src/sessions/v2-session-store.js'), 'utf8');
const KEY = 'xensonar.meta-sessions.v2';
const BOOT = 'xensonar.meta-sessions.m13.boot.v1';
const ref = (kind, id, instanceId) => ({kind,id,name:id,...(instanceId?{instanceId}:{} )});
const base = () => ({version:2,name:'Unchanged Draft',items:[ref('drum','A'),ref('bass','B')],
  colors:{'drum:A':{border:'#abcdef'},'bass:B':{background:'#eeeeee'}},roomSettings:null,loadedId:'s1',dirty:true,
  saved:[
   {id:'s1',name:'First',items:[ref('drum','A'),ref('drum','A'),ref('bass','B')],colors:{'drum:A':{border:'#abcdef'}},roomSettings:null},
   {id:'s2',name:'Second',items:[ref('drum','A'),ref('material','M')],colors:{'drum:A':{background:'#abcdef'}},roomSettings:null},
   {id:'s3',name:'Third',items:[ref('drum','Z')],colors:{},roomSettings:null}],
  activePalette:{id:'s1',name:'First',items:[ref('drum','A'),ref('bass','B')],colors:{'drum:A':{border:'#abcdef'}}}});
function spawn({initial=base(),seed=false,failWrite=false,working=null}={}){
 const map = new Map([[KEY,JSON.stringify(initial)]]);
 if(working)map.set('xensonar.working-session.v1',JSON.stringify({version:1,row:working}));
 if(seed)map.set(BOOT,JSON.stringify({version:1,archiveRows:7,count:initial.saved.length,activePalette:initial.activePalette}));
 const calls=[],quickRows=[ref('drum','A'),ref('bass','B')];
 const storage={getItem(k){calls.push(['get',k]);return map.get(k)??null},setItem(k,v){calls.push(['set',k]);if(failWrite&&k===KEY)throw Error('QuotaExceeded');map.set(k,String(v))},removeItem(k){map.delete(k)}};
 const quick={getItems:()=>JSON.parse(JSON.stringify(quickRows)),replaceItems:items=>{quickRows.splice(0,quickRows.length,...JSON.parse(JSON.stringify(items)));calls.push(['quick',items.length]);}};
 const ctx={console,storage,quick,crypto:{randomUUID:()=> 'x'},queueMicrotask,
 __XenSongKinds:['grid','material','rootFollow','drum','bass'],
 __xenMetaValidateItems:items=>{assert(Array.isArray(items));return items},
 __xenMetaValidateColors:(items,colors={})=>Object.fromEntries(Object.entries(colors||{}).filter(([key])=>items.some(i=>`${i.kind}:${i.id}`===key))),
 __xenGridKey:i=>`${i.kind}:${i.id}`,__xenMetaColorKey:i=>`${i.kind}:${i.id}`,
 __xenQuickGlobalRows:()=>7,__XenMainRoomSessionBridge:{safe:x=>x,available:()=>false},__xenBassTimbreClean:x=>x};
 vm.runInNewContext(src+'\n globalThis.myStore=__createXenMetaSessionStore(storage,quick);',ctx);
 const store=ctx.myStore;return {store,map,calls,quickRows,read:()=>JSON.parse(map.get(KEY))};
}
async function run(){
 // RED: no deletion method exists in current baseline; guard must protect *saved* sessions.
 let s=spawn(),usage=s.store.inspectLibraryReferences({kind:'drum',id:'A',name:'Kick A'});
 assert.equal(usage.savedProjectCount,2);
 assert.deepEqual(Array.from(usage.savedProjectNames),['First','Second']);
 assert.equal(usage.savedReferenceCount,3);
 let confirms=0,deletions=0;
 let r=await s.store.deleteReferencedLibraryEntry({kind:'drum',id:'A',name:'Kick A'},async()=>{deletions++;return true},()=>{confirms++;return false});
 assert.equal(r.status,'cancelled');assert.equal(confirms,1);assert.equal(deletions,0);assert.equal(s.read().saved[0].items.length,3);
 r=await s.store.deleteReferencedLibraryEntry({kind:'drum',id:'A',name:'Kick A'},async()=>{deletions++;return true},message=>{confirms++;assert.match(message,/2 Session-Projekt/);return true});
 assert.equal(r.status,'deleted');assert.equal(deletions,1);assert.equal(confirms,2);
 assert.deepEqual(s.read().saved.map(row=>row.items.map(item=>item.id)),[['B'],['M'],['Z']]);
 assert.deepEqual(s.read().items.map(item=>item.id),['B']);assert.deepEqual(s.read().activePalette.items.map(item=>item.id),['B']);
 assert.equal(s.read().saved[0].colors['drum:A'],undefined);assert.equal(s.read().dirty,true);
 assert.deepEqual(s.quickRows.map(item=>item.id),['B']);
 assert.equal(s.calls.filter(x=>x[0]==='set'&&x[1]===KEY).length,1,'all sessions saved with one archive commit');
 s=spawn();r=await s.store.deleteReferencedLibraryEntry({kind:'drum',id:'A'},()=>{throw Error('Delete failed')},()=>true);
 assert.equal(r.status,'failed');assert.deepEqual(s.read(),base(),'rollback after physical deletion error');
 assert.equal(s.quickRows.length,2,'quickrack restored');
 s=spawn({failWrite:true});r=await s.store.deleteReferencedLibraryEntry({kind:'drum',id:'A'},()=>{deletions++;return true},()=>true);
 assert.equal(r.status,'failed');assert.equal(deletions,1,'deletion not called when saving fails');assert.deepEqual(s.read(),base());
 s=spawn();let physicallyDeleted=false;
 r=await s.store.deleteReferencedLibraryEntry({kind:'drum',id:'A'},()=>{physicallyDeleted=true;return true},
  async()=>{s.map.set(KEY,JSON.stringify({...base(),name:'Changed in another tab'}));return true});
 assert.equal(r.status,'stale');assert.equal(physicallyDeleted,false,'no deletion after external archive update');
 assert.equal(s.read().name,'Changed in another tab');
 s=spawn();r=await s.store.deleteReferencedLibraryEntry({kind:'drum',id:'A'},()=>{
  s.map.set(KEY,JSON.stringify({...s.read(),name:'Concurrent external mutation'}));throw Error('Delete failed');},()=>true);
 assert.equal(r.status,'recovery-required');assert.equal(s.read().name,'Concurrent external mutation','rollback must not clobber another tab');
 s=spawn({seed:true});assert.equal(s.store.isDormant(),true);
 r=await s.store.deleteReferencedLibraryEntry({kind:'drum',id:'A'},()=>true,()=>true);
 assert.equal(r.status,'deleted');assert(!s.store.isDormant());assert.equal(s.read().saved[0].items.length,1);
 s=spawn();r=await s.store.deleteReferencedLibraryEntry({kind:'drum',id:'NOT_STORED'},()=>true,()=>{throw Error('Do not prompt')});
 assert.equal(r.status,'deleted');assert.equal(s.calls.filter(x=>x[0]==='set'&&x[1]===KEY).length,0,'no needless session writes');
 s=spawn();r=await s.store.deleteReferencedLibraryEntry({kind:'drum',id:'A'},()=>false,()=>true);
 assert.equal(r.status,'failed');assert.deepEqual(s.read(),base());
 s=spawn();assert.equal(s.store.inspectLibraryReferences({kind:'sample',id:'abc'}).savedProjectCount,0);
 r=await s.store.deleteReferencedLibraryEntry({kind:'sample',id:'abc'},()=>true,()=>true);
 assert.equal(r.status,'unsupported','unknown entry kinds must not silently bypass protection');
 // Schema-extension seam: future Wave Starter/Particle/Keyboard references
 // can be mapped without searching arbitrary JSON or editing this coordinator.
 s=spawn();const added=s.read();added.saved[0].roomSettings={wave:{preset:'wave-42'}};
 s.map.set(KEY,JSON.stringify(added));
 // Reload to hydrate revised stored archive and attach a schema codec.
 s=spawn({initial:added});
 s.store.registerLibraryReferenceCodec('waveStarter',{
  inspect:(state,entry)=>{const rows=state.saved.filter(row=>row.roomSettings?.wave?.preset===entry.id);
   return {savedProjectIds:rows.map(x=>x.id),savedReferenceCount:rows.length};},
  prune:(next,entry)=>{for(const row of next.saved)if(row.roomSettings?.wave?.preset===entry.id)row.roomSettings.wave.preset=null;}
 });
 assert.equal(s.store.inspectLibraryReferences({kind:'waveStarter',id:'wave-42'}).savedProjectCount,1);
 r=await s.store.deleteReferencedLibraryEntry({kind:'waveStarter',id:'wave-42'},()=>true,()=>true);
 assert.equal(r.status,'deleted');assert.equal(s.read().saved[0].roomSettings.wave.preset,null);
 // SP-P0 x LD1 integration: delete one material entry in two sessions and prune only its EQ/mix snapshot.
 const a=ref('material','M'),b=ref('material','N');
 const entry=(id,morph)=>({kind:'material',id,mix:{volume:.65,pan:.4,nudgeMode:'vinyl'},
  eq:{a:[.25],b:[-.1],morph,bands:12}});
 const initial=base();initial.items=[a,b];initial.saved=[
  {id:'s1',name:'First',items:[a,b],colors:{},roomSettings:null,
   songPerformance:{version:1,entries:[entry('M',.2),entry('N',.7)],sources:{waveStarter:{waveSoundPreset:'keep'}}}},
  {id:'s2',name:'Second',items:[a],colors:{},roomSettings:null,
   songPerformance:{version:1,entries:[entry('M',.3)],sources:{keyboard:{keyboardHoldEnabled:true}}}}
 ];
 initial.songPerformance={version:1,entries:[entry('M',.6),entry('N',.8)],sources:{particle:{particlePreset:'remain'}}};
 initial.activePalette={id:'s1',name:'First',items:[a,b],colors:{}};
 s=spawn({initial});
 assert.equal(s.store.inspectLibraryReferences({kind:'material',id:'M'}).savedProjectCount,2);
 r=await s.store.deleteReferencedLibraryEntry({kind:'material',id:'M'},()=>true,()=>true);
 assert.equal(r.status,'deleted');
 const after=s.read();
 assert.deepEqual(after.saved.map(row=>row.items.map(x=>x.id)),[['N'],[]]);
 assert.deepEqual(after.saved.map(row=>row.songPerformance.entries.map(x=>x.id)),[['N'],[]],
  'Saved song mixer and EQ envelopes must never retain a deleted library ID');
 assert.deepEqual(after.songPerformance.entries.map(x=>x.id),['N']);
 assert.equal(after.saved[0].songPerformance.entries[0].eq.morph,.7);
 assert.equal(after.saved[0].songPerformance.sources.waveStarter.waveSoundPreset,'keep');
 assert.equal(after.saved[1].songPerformance.sources.keyboard.keyboardHoldEnabled,true);
 assert.equal(after.songPerformance.sources.particle.particlePreset,'remain');
 assert.equal(s.calls.filter(x=>x[0]==='set'&&x[1]===KEY).length,1);
 // LD2: independently persisted Working Session, Grid clones, and a same-named
 // independent library ID. Deletion must not resurrect an invalid tile on reload.
 const grid=(id,instanceId,name='One Tuning')=>({kind:'grid',id,name,instanceId,gridProfile:{modeId:'chromatic'}});
 const ga=grid('tuning-A','clone-01'),gb=grid('tuning-A','clone-02'),foreign=grid('tuning-B','other-01');
 const working={id:null,name:'Working',items:[ga,gb,foreign],colors:{},roomSettings:null};
 const gridState=base();gridState.items=[ga,gb,foreign];gridState.saved=[
  {id:'s1',name:'Session One',items:[ga,gb,foreign],colors:{},roomSettings:null},
  {id:'s2',name:'Session Two',items:[ga],colors:{},roomSettings:null}
 ];gridState.activePalette={id:'s1',name:'Session One',items:[ga,gb,foreign],colors:{}};
 s=spawn({initial:gridState,working});
 let impact=s.store.inspectLibraryReferences({kind:'grid',id:'tuning-A',name:'One Tuning'});
 assert.equal(impact.savedProjectCount,2);assert.equal(impact.savedReferenceCount,3);
 assert.equal(impact.workingReferenceCount,2);
 r=await s.store.deleteReferencedLibraryEntry({kind:'grid',id:'tuning-A',name:'One Tuning'},()=>true,()=>false);
 assert.equal(r.status,'cancelled');assert.deepEqual(s.read(),gridState);
 assert.equal(JSON.parse(s.map.get('xensonar.working-session.v1')).row.items.length,3);
 r=await s.store.deleteReferencedLibraryEntry({kind:'grid',id:'tuning-A',name:'One Tuning'},()=>true,(_prompt,_entry,report)=>{assert.equal(report.workingReferenceCount,2);return true});
 assert.equal(r.status,'deleted');assert.equal(s.read().saved[0].items.length,1);
 assert.equal(s.read().saved[0].items[0].id,'tuning-B');
 assert.equal(JSON.parse(s.map.get('xensonar.working-session.v1')).row.items.length,1);
 assert.equal(JSON.parse(s.map.get('xensonar.working-session.v1')).row.items[0].id,'tuning-B');
 // The second independent serialization must also roll back when its owner fails.
 s=spawn({initial:gridState,working});
 r=await s.store.deleteReferencedLibraryEntry({kind:'grid',id:'tuning-A'},()=>{throw Error('failed IDB delete')},()=>true);
 assert.equal(r.status,'failed');assert.deepEqual(s.read(),gridState);
 assert.equal(JSON.parse(s.map.get('xensonar.working-session.v1')).row.items.length,3);
 // P2 Bass song snapshots are a second legitimate session source, even without
 // a Quickrack tile. They must be included in the warning and removal plan.
 const source=()=>({version:1,entries:[],sources:{bass:{version:1,mode:'clip',clipId:'clip-xyz',preset:'offbeat',
  timbre:{bassVoice:'sub'},clip:{id:'clip-xyz',events:[]}},drone:{version:1,params:{droneFixedHz:55},volume:.2}}});
 const bassState=base();bassState.items=[ref('drum','K')];bassState.saved=[
  {id:'s1',name:'Bass song',items:[ref('drum','K')],colors:{},roomSettings:null,songPerformance:source()},
  {id:'s2',name:'Other song',items:[ref('drum','K')],colors:{},roomSettings:null}
 ];bassState.activePalette={id:'s1',name:'Bass song',items:[]};
 bassState.songPerformance=source();
 s=spawn({initial:bassState,working:{id:null,name:'Working Bass',items:[],colors:{},roomSettings:null,songPerformance:source()}});
 impact=s.store.inspectLibraryReferences({kind:'bass',id:'clip:clip-xyz'});
 assert.equal(impact.savedProjectCount,1);assert.equal(impact.workingReferenceCount,1);
 r=await s.store.deleteReferencedLibraryEntry({kind:'bass',id:'clip:clip-xyz',name:'Bass Clip'},()=>true,()=>true);
 assert.equal(r.status,'deleted');assert.equal(s.read().songPerformance.sources.bass,null);
 assert.equal(s.read().saved[0].songPerformance.sources.bass,null);
 assert.equal(s.read().saved[0].songPerformance.sources.drone.volume,.2);
 assert.equal(JSON.parse(s.map.get('xensonar.working-session.v1')).row.songPerformance.sources.bass,null);
 // Legacy full-room snapshots are another separate path for a deleted Bass ID.
 const legacyRoom=base();legacyRoom.saved=[{id:'legacy',name:'Legacy Room',items:[],colors:{},roomSettings:{version:1,nParamsUI:{bassPatternMode:'clip',bassClipId:'clip-xyz',bassActive:true}}}];
 s=spawn({initial:legacyRoom});
 assert.equal(s.store.inspectLibraryReferences({kind:'bass',id:'clip:clip-xyz'}).savedProjectCount,1);
 r=await s.store.deleteReferencedLibraryEntry({kind:'bass',id:'clip:clip-xyz'},()=>true,()=>true);
 assert.equal(r.status,'deleted');
 assert.equal(s.read().saved[0].roomSettings.nParamsUI.bassPatternMode,'preset');
 assert.equal(s.read().saved[0].roomSettings.nParamsUI.bassClipId,'');
 assert.equal(s.read().saved[0].roomSettings.nParamsUI.bassActive,false);
 console.log('SESSION_LIBRARY_DELETE_GUARD_PASS');
}
run().catch(error=>{console.error(error);process.exitCode=1});
