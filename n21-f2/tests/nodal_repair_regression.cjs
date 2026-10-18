const assert=require('node:assert/strict'),path=require('node:path');
const {load}=require('./offline_runtime.cjs');
const r=load(path.resolve(__dirname,'..'));
const result=r.run(`(()=>{
 const instrument=nodalStarter('glass');
 const first=__XenNodalLibrary.save(instrument);
 for(let i=0;i<55;i++) __XenNodalLibrary.save(instrument);
 const count=__XenNodalLibrary.list().length;
 const revised=__XenNodalLibrary.save({...instrument,name:'Revision'}, {id:first.id,expectedRevision:first.revision});
 const deleted=__XenNodalLibrary.remove(revised.id,revised.revision);
 return {count,deleted,remaining:__XenNodalLibrary.list().length};
})()`);
assert.equal(result.count,1);assert.equal(result.deleted,true);assert.equal(result.remaining,0);
console.log('PASS repeated save does not exhaust library; revision and removal');

const transfers=r.run(`(()=>{OLe(Oqe({initialSession:null,externalLogicView:'melodic'}));
 const inst=nodalStarter('glass');for(let i=0;i<55;i++)nodalSendToMelodic(inst);
 const c=EQ().loopComposer, ids=c.tracks.map(t=>t.id), notes=c.notes.map(n=>n.id);
 return {sources:Object.keys(c.nodalInstruments).length,library:__XenNodalLibrary.list().length,unique:new Set(ids).size===ids.length&&new Set(notes).size===notes.length};})()`);
assert.equal(transfers.sources,1);assert.equal(transfers.library,1);assert.equal(transfers.unique,true);
console.log('PASS 55 transfers retain one source snapshot and unique track/note IDs');
