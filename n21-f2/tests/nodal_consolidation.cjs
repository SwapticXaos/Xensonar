const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {load}=require('./offline_runtime.cjs');
const current=path.resolve(process.argv[3]||path.join(__dirname,'..')),baseline=process.argv[2]?path.resolve(process.argv[2]):null;
function inspect(root,options={}){const h=load(root,options);return h.run(`(()=>{
 const model=__XenNodalModel,library=__XenNodalLibrary;
 const instrument=nodalStarter('glass');
 const field=Zr(null);field.deformation.curve=Array.from({length:128},(_,i)=>Math.sin(i/20)*.6);field.enabled=true;
 const bodies=['glass','ember','breath'].map(name=>model.normalize({...nodalStarter(name),articulation:{...instrument.articulation,volumeEnvelope:field,pitchEnvelope:field}}));
 const pcm=bodies.flatMap(body=>[44100,48000].map(rate=>Array.from(__XenNodalDSP.render(model.compile(body),{frequency:220,durationSec:.15},rate).pcm)));
 const c=Oqe({initialSession:null,externalLogicView:'melodic'}).loopComposer,track=c.tracks[0],note=c.notes.find(n=>n.trackId===track.id),source={kind:'nodal',instrument:bodies[0],plan:model.compile(bodies[0])},step=lD({composer:c,bpm:120})/iD(c);
 for(const local of [null,field])pcm.push(Array.from(__XenNodalDSP.render(source.plan,nodalMelodicNoteOptions(c,{...note,localField:local},track,source,step),48000).pcm));
 const nt=performance.now();for(let i=0;i<200;i++)nodalMelodicNoteOptions(c,{...note,localField:null},track,source,step);const noteOptionsMs=performance.now()-nt;
 const begin=performance.now();for(let i=0;i<200;i++)model.compile(bodies[i%3]);const compileMs=performance.now()-begin;
 for(let i=0;i<24;i++)library.save({...instrument,name:'Library '+i},{id:'cache-'+i});
 const t=performance.now();for(let i=0;i<200;i++)library.list();const libraryMs=performance.now()-t;
 const first=library.list()[0];first.id='caller-mutated';const untouched=library.list()[0].id==='cache-0';
 const renamed=library.rename('cache-0',1,'Renamed');const fresh=library.list()[0].instrument.name==='Renamed';
 return {pcm,compileMs,libraryMs,noteOptionsMs,untouched,fresh};
})()`);}
const frozen=require('./fixtures/nodal_fix12c_manifest.json'),restore=require('./nodal_preservation.cjs').restoreFix12C;
const chunks=[fs.readFileSync(path.join(current,'template/head.html')),...frozen.files.map(f=>restore(f,fs.readFileSync(path.join(current,f)))),fs.readFileSync(path.join(current,'template/script-close.html'))];
for(const style of frozen.styles)chunks.push(Buffer.from(style.tag),fs.readFileSync(path.join(current,style.file)),Buffer.from('</style>'+style.after));
chunks.push(fs.readFileSync(path.join(current,'template/foot.html')));
assert.equal(crypto.createHash('sha256').update(Buffer.concat(chunks)).digest('hex'),frozen.sha256,'comparison reference must reproduce original Fix12C HTML exactly');
const before=baseline?inspect(baseline):inspect(current,{nodalFix12Baseline:true}),after=inspect(current);
for(let n=0;n<before.pcm.length;n++){assert.equal(after.pcm[n].length,before.pcm[n].length);let diff=0;for(let i=0;i<before.pcm[n].length;i++)diff=Math.max(diff,Math.abs(after.pcm[n][i]-before.pcm[n][i]));assert.equal(diff,0,'PCM must remain sample-exact for all bodies/rates/contours');}
assert(after.untouched&&after.fresh);
const h=load(current);const cache=h.run(`(()=>{
 const m=__XenNodalModel,i=nodalStarter('glass'),plan=m.compile(i);
 const raw=m.clone(i),first=m.normalize(raw);raw.nodes[0].ratio=1.37;const changed=m.normalize(raw);
 const storage=new Map(),l=createNodalInstrumentLibrary(m,()=>({getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,v)}));
 const saved=l.save(i,{id:'one'});const duplicate=l.save(i,{id:'one',expectedRevision:1});
 return {identity:m.normalize(i)===i,planIdentity:m.compile(i)===plan,mutableChanged:first.nodes[0].ratio!==changed.nodes[0].ratio,
 invalidRejected:(()=>{try{m.normalize(Object.freeze({...i,nodes:[]}));return false}catch{return true}})(),revision:duplicate.revision};
})()`);
assert(cache.identity&&cache.planIdentity,'owned immutable inputs should reuse normalization and prepared plans');
assert(cache.mutableChanged&&cache.invalidRejected,'untrusted/frozen inputs still require validation');
assert.equal(cache.revision,1,'unchanged explicit save must not create a phantom sound revision');
const report={checks:['8 DSP comparisons: three bodies/two sample rates plus note articulation with and without local field; sample-exact','caller mutation cannot alter cached library','rename observed immediately','mutable and foreign-frozen input still validated','unchanged save preserves revision'],before:{compileMs:before.compileMs,libraryMs:before.libraryMs,noteOptionsMs:before.noteOptionsMs},after:{compileMs:after.compileMs,libraryMs:after.libraryMs,noteOptionsMs:after.noteOptionsMs},pcmSha256:crypto.createHash('sha256').update(JSON.stringify(after.pcm)).digest('hex')};
fs.writeFileSync(path.join(current,'results/nodal_consolidation.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
