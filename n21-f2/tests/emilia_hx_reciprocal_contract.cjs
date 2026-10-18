'use strict';
const assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const {harness,grid,rms,root}=require('./emilia3_harness.cjs');const {api,context,dsp}=harness();
vm.runInContext('globalThis.hxCalls=0;globalThis.originalHXCompiler=RR;RR=function(...args){hxCalls++;return originalHXCompiler(...args)}',context);
const compile=recipe=>{context.input=recipe;return vm.runInContext('compileEmiliaNetworkColor(input.model)',context)};
const base=api.snapshot(),plan=compile(base),hx=plan.emiliaWeave.hxSource;
assert.equal(context.hxCalls,2,'Emilia must call the real HX Direct source compiler');
assert.equal(hx.source,'harmonic-xplore-direct-carrier');assert(hx.operators.length>=6);
assert(hx.operators.some(op=>op.type==='sawtooth'||op.type==='square'));
assert(hx.operators.every(op=>op.type!=='sine'),'The new excitation must not be a shared plain sine');
assert(hx.rootReject>=.72);assert(hx.operators.filter((op,i)=>i%6===0).every(op=>op.ratio===1),'Carrier root anchors must follow the input frequency');
const args={frequency:220,held:true,expression:.7,velocity:.84,gain:.68,offlineDurationSec:2},sr=24000;
const render=p=>{const v=dsp.voice(p,args,sr),pcm=new Float32Array(sr);v.process(pcm);assert.equal(v.snapshot().faults,0);return pcm};
const normal=render(plan),unreturned=render({...plan,emiliaWeave:{...plan.emiliaWeave,hxSource:{...hx,feedback:0}}});
let difference=0,energy=0;for(let i=0;i<normal.length;i++){difference+=(normal[i]-unreturned[i])**2;energy+=normal[i]**2;}
assert(difference/energy>.1,'The reciprocal loop must affect the material, not just exist as metadata');
const noHX=render({...plan,emiliaWeave:{...plan.emiliaWeave,hxSource:undefined}});assert.notDeepEqual(normal,noHX);
assert(rms(normal)>.003);
(async()=>{
 const buffers=[];
 // Same ordinary painted Carrier, not a special oscillator-only preview.
 for(const x of [.06,.32,.64,.94]){
  const recipe=api.normalized({...base.model,nodes:base.model.nodes.map((n,i)=>({...n,ratio:1,x:x+[-.015,0,.015][i],y:[.2,.5,.8][i]}))});
  const result=await api.renderCarrier({grid:grid(120,768,[{hz:880,gain:.6}]),durationSec:1,instrument:recipe});
  assert(rms(result.getChannelData(0))>.003);buffers.push(result.getChannelData(0));
 }
 const report={engine:api.ENGINE,source:hx.source,sourceCompilerCalls:context.hxCalls,
  feedbackAblationRatio:difference/energy,checks:['Actual HX Direct compiler supplies the oscillator bank','Saw/square excitation feeds the node processors','Processed node output changes the upstream HX source','Carrier root control retained; strong variable root rejection; no added sine bypass','Four constellations play through the actual painted Carrier path'],limits:'These checks verify the requested integration and regressions. They do not establish musical quality.'};
 fs.writeFileSync(path.join(root,'results/hx_reciprocal_contract.json'),JSON.stringify(report,null,2));console.log(report.checks.join('\n'));
})().catch(e=>{console.error(e.stack);process.exitCode=1});
