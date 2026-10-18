'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),read=f=>fs.readFileSync(path.join(root,f),'utf8');
const baseline=path.join(root,'tests/fixtures/f446_prelink');
function extract(source,name){const start=source.indexOf('function '+name+'('),end=source.indexOf('function ',start+10);assert(start>=0&&end>start);return source.slice(start,end);}
const checks=[];
function exercise(qweSource,waveSource,kind='preset',allowed=true){
 const log=[],ctx={state:'running',currentTime:2},main={id:'main'},aux={id:'aux'},surfaceCalls=[];
 const sandbox={console,log,__XenNodalSurfaces:{note(...args){surfaceCalls.push(args);return{id:'note'};}},
  gwe:()=>log.push('particle-intent'),vwe:()=>({allowed,volume:.2}),
  xwe:()=>({}),Rwe:()=>log.push('particle-fx'),Cwe:()=>[aux],cwe:()=>({dispatchRequest:{presetRoute:{kind:'synth'}},bodyVoiceBudget:1,transientPlan:{intensity:1}}),bwe:()=>{},wwe:()=>({}),Wwe:()=>log.push('builtin-particle'),
  $w:()=>({kind,id:'nodal:test@1',presetId:'glass_ping'}),$W:x=>x.kind==='sample',pL:()=>({playbackFreq:330,volume:.3,waveGradient:{amount:0},microVoiceDemandMul:1}),
  __entCanPrepare:()=>true,Hd:()=>false,AL:()=>log.push('wave-fx'),xL:()=>({targets:[aux],prefixes:[]}),GW:()=>1,CAe:()=>0,nq:()=>log.push('builtin-wave'),kxe:()=>false,fr:()=>{},ixe:()=>1,XW:()=>log.push('builtin-sample')};
 vm.createContext(sandbox);vm.runInContext(extract(qweSource,'qwe')+'\n'+extract(waveSource,'Ixe')+'\n'+extract(waveSource,'Exe'),sandbox);
 const particle={ctx,guardState:{},getMainOutput:()=>main,getAuxTargets:()=>({}),fx:{},recordAudioPressureCount(){},particlePreset:kind==='nodal'?'nodal:test@1':'glass_ping'};
 const result=sandbox.qwe(particle,{freq:440,volume:.4,sustainExtended:true,sourceKind:'particle'});
 const wave={ctx,runtime:{enabled:true,preset:'glass_ping',volume:.3},transientRuntime:{canAdmitVoice:()=>allowed},baseFreq:440,cursor:{cursorX:20,cursorY:20},nexusSound:{},options:{},heldLong:true,fxRoutes:{},fxTargets:{},primeMyzelFromY:()=>log.push('prime'),getWaveOutput:()=>main,beginTransientEvent:()=>({bodyScale:1})};
 if(allowed){sandbox.Ixe(wave);sandbox.Exe(wave);}
 return{log,result:JSON.parse(JSON.stringify(result)),surfaceCalls,main,aux,ctx};
}
const particleFile='src/audio/entrophon/02_worklet_and_voice_backend.js',waveFile='src/audio/05_live_voice_runtime.js';
const beforeParticle=fs.readFileSync(path.join(baseline,particleFile),'utf8'),beforeWave=fs.readFileSync(path.join(baseline,waveFile),'utf8');
for(const kind of ['preset','sample']){
 const a=exercise(beforeParticle,beforeWave,kind),b=exercise(read(particleFile),read(waveFile),kind);assert.deepEqual(b.log,a.log);assert.deepEqual(b.result,a.result);assert.equal(b.surfaceCalls.length,0);
}
checks.push('existing preset/sample dispatch and FX order match the genuine pre-link baseline; neither uses Nodal');
const nodal=exercise(read(particleFile),read(waveFile),'nodal');assert.equal(nodal.surfaceCalls.length,3);
for(const [lane,id,options,ctx]of nodal.surfaceCalls){assert.equal(id,'nodal:test@1');assert.equal(options.output,nodal.main);assert.deepEqual(options.auxTargets,[nodal.aux]);assert.equal(options.held,true);assert.equal(ctx,nodal.ctx);assert(['wave','particle'].includes(lane));}
assert(nodal.log.includes('particle-fx'));assert.equal(nodal.log.filter(s=>s==='wave-fx').length,2);assert(!nodal.log.includes('builtin-particle')&&!nodal.log.includes('builtin-wave'));
checks.push('Nodal branches after the existing gate/FX setup, carrying the real main output, aux sends and hold into the correct lane');
const denied=exercise(read(particleFile),read(waveFile),'nodal',false);assert.equal(denied.surfaceCalls.length,0);assert(!denied.log.includes('particle-fx'));checks.push('denied particle stops before FX/preparation and creates no Nodal voice');
fs.writeFileSync(path.join(root,'results/f446-routing.json'),JSON.stringify({status:'PASS',checks},null,2)+'\n');console.log(checks);
