const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const {parse}=require('./extract.cjs');
const root=path.resolve(__dirname,'..'),file=path.resolve(process.argv[2]||path.join(root,JSON.parse(fs.readFileSync(path.join(root,'source-manifest.json'))).entry));
const {map}=parse(file),fixture=path.join(__dirname,'fixtures/clean3_characterization.json');
const load=(ctx,names)=>{for(const name of names)if(map.has(name))vm.runInContext(map.get(name),ctx)};
const plain=v=>JSON.parse(JSON.stringify(v));
function sessionCase(initial={},failRead=false,failWrite=false){
 const rows=new Map(Object.entries(initial)),operations=[],notices=[];let stringifyCalls=0;
 const ctx=vm.createContext({console,JSON:{parse:JSON.parse,stringify(...args){stringifyCalls++;return JSON.stringify(...args)}},localStorage:{getItem(k){operations.push(['get',k]);if(failRead)throw Error('storage denied');return rows.get(k)??null},setItem(k,v){operations.push(['set',k,v]);if(failWrite)throw Error('storage denied');rows.set(k,v)}}});
 load(ctx,['__createF352Recipe','__F352Recipe','__createF352Session','__F352Session']);const session=vm.runInContext('__F352Session',ctx);
 const initialSnapshot=plain(session.getSnapshot());const unsubscribe=session.subscribe(()=>notices.push(plain(session.getSnapshot())));
 session.patch({enabled:true,amount:.514,mode:'spectral'});session.patch({amount:.514});session.patch({coupling:1.45,color:-.4,variantRevision:'original'});
 session.restore({recipe:{schema:'xensonar-forge-hybrid-v2',enabled:true,mode:'state',amount:.675,coupling:.335,color:NaN}});
 const request=plain(session.getRenderRequest({sampleRate:48000,token:'t'}));const exported=session.export();exported.mode='bad';
 session.restore({schema:'obsolete',enabled:true,mode:'invalid',amount:'0.9'});session.reset();unsubscribe();session.patch({color:.7});
 return {behavior:{initialSnapshot,notices,operations,request,final:plain(session.getSnapshot()),defaults:plain(session.defaults),modes:plain(session.modes),providers:plain(session.providers),frozen:Object.isFrozen(session.getSnapshot())&&Object.isFrozen(session.getSnapshot().recipe)},stringifyCalls};
}
function donorFieldCase(){
 const ctx=vm.createContext({console,Float32Array,Float64Array,Map,Set,setTimeout,clearTimeout,DOMException});load(ctx,['__f347DonorFieldFactory','__F35641Field']);
 const result=vm.runInContext(`(()=>{const sr=8000,model={sampleRate:sr,samples:new Float32Array(80000),sourceIndex:{windows:[{id:0,startSample:0,endSample:36000},{id:1,startSample:38000,endSample:79999}]},atlas:{nodes:Array.from({length:720},(_,i)=>({center:i*100,rms:.12+.06*Math.sin(i*.17),level:.5+.35*Math.sin(i*.11),pitchConfidence:.75,aperiodicity:.5+.4*Math.sin(i*.073),centroidHz:500+4000*(1+Math.sin(i*.019))/2,formantEnvelope:Array.from({length:24},(_,j)=>.15+Math.abs(Math.sin(i*.035+j*.31)))}))}};
 const field=__F35641Field.build(model),carrier={rootReferenceHz:220,bands:[{gainCurve:new Float32Array([0,.2,.7,.9,.6,.2,0]),centerRatioCurve:new Float32Array([1,1,1.1,1.25,1.2,1.1,1]),supportSigmaCurve:new Float32Array([.04,.04,.06,.07,.05,.03,.03])}]};
 const run={voice:0,startSample:100,endSample:1500,firstCell:1,lastCell:5,windowId:0,sourceStart:0,sourceEnd:35999,gestalt:{sourceCurve:new Float64Array(17),meanWidth:.4,meanGain:.6},workbenchRead:{}};
 const material={runs:[run],structuralPlan:{}};__F35641Field.plan(material,carrier,model,sr,.24,{gestaltMode:'weave',gestaltGesture:.7,gestaltMotion:.6,position:.27});
 const partial={runs:[{...run,gestalt:{...run.gestalt,sourceCurve:new Float64Array(17),meanWidth:NaN}}],structuralPlan:{}};
 __F35641Field.plan(partial,carrier,model,sr,.24,{gestaltMode:'weave',gestaltGesture:.7,gestaltMotion:.6,position:.27});
 return {field,summary:__F35641Field.summary(field),material,partialGesture:partial};})()`,ctx);
 return plain(result);
}
async function analysisCase(){
 const loads=[],ctx=vm.createContext({console,ArrayBuffer,Float32Array,DOMException,Map,Set,__F353SourceIdentity:{key:s=>s.id},__f353PrepareDonorBase:async s=>{loads.push(s.id);const samples=new Float32Array(s.frames);return {samples,alias:{samples},hybrid:{sourceGrains:{samples,atlas:{nodes:[{center:0},{center:1}]}}}}}});
 load(ctx,['__f353AnalysisSize','__createF353AnalysisCache','__F353AnalysisCache']);const cache=vm.runInContext('__F353AnalysisCache',ctx);
 const history=[];for(let i=0;i<10;i++){await cache.prepare({id:'s'+i,frames:16+i},()=>false);history.push(plain(cache.diagnostics()))}
 await cache.prepare({id:'s9',frames:25},()=>false);history.push(plain(cache.diagnostics()));await cache.prepare({id:'s0',frames:16},()=>false);history.push(plain(cache.diagnostics()));
 let cancelled;try{await cache.prepare({id:'cancel',frames:20},()=>true)}catch(e){cancelled={name:e.name,message:e.message}}
 const budgetHistory=[];
 for(let i=0;i<4;i++){await cache.prepare({id:'large'+i,frames:5*1024*1024},()=>false);budgetHistory.push(plain(cache.diagnostics()))}
 assert(cache.diagnostics().bytes<=64*1024*1024);assert.equal(cache.diagnostics().entries,3);
 await cache.prepare({id:'large0',frames:5*1024*1024},()=>false);budgetHistory.push(plain(cache.diagnostics()));
 let afterAwait=false,lateCancelled;
 ctx.__f353PrepareDonorBase=async()=>{afterAwait=true;return {samples:new Float32Array(16)}};
 const beforeLate=plain(cache.diagnostics());
 try{await cache.prepare({id:'cancel-after-await'},()=>afterAwait)}catch(e){lateCancelled={name:e.name,message:e.message}}
 assert.equal(lateCancelled.name,'AbortError');assert.deepEqual(plain(cache.diagnostics()),{...beforeLate,analyses:beforeLate.analyses+1});
 return {loads,history,cancelled,budgetHistory,lateCancelled};
}
(async()=>{
 const cases=[sessionCase(),sessionCase({'xensonar:forge:hybrid-session:v2':JSON.stringify({schema:'xensonar-forge-hybrid-v2',enabled:true,mode:'state',amount:.8})}),sessionCase({'xensonar:forge:combination-rack:v1':JSON.stringify({schema:'old',enabled:true,mode:'spectral'})}),sessionCase({},true,true)];
 const result={sessions:cases.map(c=>c.behavior),field:donorFieldCase(),analysis:await analysisCase()};
 if(process.argv.includes('--capture'))fs.writeFileSync(fixture,JSON.stringify({result,baselineStringifyCalls:cases.map(c=>c.stringifyCalls)},null,2)+'\n');
 const reference=JSON.parse(fs.readFileSync(fixture));assert.deepEqual(result,reference.result,'CLEAN3 behavior changed');
 const report={status:'PASS',sessionCases:cases.length,fieldEntries:result.field.field.entries.length,fieldStates:result.field.field.states.length,cacheLoadCases:result.analysis.loads.length,baselineStringifyCalls:reference.baselineStringifyCalls,currentStringifyCalls:cases.map(c=>c.stringifyCalls),sha256:crypto.createHash('sha256').update(JSON.stringify(result)).digest('hex')};
 fs.writeFileSync(path.join(root,'results/clean4_characterization.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
})().catch(e=>{console.error(e);process.exitCode=1});
