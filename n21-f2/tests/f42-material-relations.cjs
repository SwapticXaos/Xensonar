'use strict';
const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict'),create=require('../src/forge/fractalia/05_relational_core.js');
const ctx={console,setTimeout,DOMException};vm.createContext(ctx);
for(const f of ['src/forge/dsp/01_material_tools.js','src/forge/fractalia/09_material_atlas.js','src/forge/fractalia/10_material_render.js'])vm.runInContext(fs.readFileSync(f,'utf8'),ctx);
vm.runInContext('globalThis.engine=createFractaliaMaterialEngine();globalThis.render=renderFractaliaMaterialJob;',ctx);
const core=create(),donor={mode:'tile',reading:'material-relations',revision:2,amount:.9,warp:1,exchange:.8,axis:'energy',pitchReference:'measured',evolutionSec:3};
function drawing(kind){return {width:48,height:256,getColumn:x=>Float32Array.from({length:256},(_,y)=>{
 let a,b;if(kind==='split'){a=140-Math.max(0,x-15)*1.6;b=140+Math.max(0,x-15)*1.6}else{a=95+x*.8;b=185-x*.8}
 const lines=[a,b,60+7*Math.sin(x*.24),205-4*Math.sin(x*.31)];return Math.min(1,lines.reduce((s,c)=>s+.65*Math.exp(-.5*((y-c)/1.5)**2),0)+.08*Math.exp(-.5*((y-128)/20)**2)*(x>28&&x<39?1:0));})}}
const sr=16000,duration=1.4,source=Float32Array.from({length:sr},(_,i)=>{const t=i/sr;return [220,440,660,881,1139,1618,2200,3420].reduce((s,f,j)=>s+.10/(1+j*.3)*Math.sin(2*Math.PI*f*t+.06*Math.sin(2*Math.PI*(2+j*.1)*t)),0)});
const model={samples:source,sampleRate:sr,sourceIndex:{windows:[{id:0,startSample:0,endSample:source.length-1}]}};
(async()=>{
 const atlas=await ctx.engine.analyze(model),mapping=[];assert(atlas.peaks.length>=6&&atlas.frames.length>=30);assert(atlas.richness>.5);
 for(const kind of ['near','split']){const instrument=core.settings({version:4,compilerRevision:3,donor,params:{motion:1}}),a=await core.compile({grid:drawing(kind),instrument});assert.equal(a.states,undefined);assert.equal(a.kind,'material-relations-only');mapping.push(ctx.engine.prepare(a.material,a.relations,atlas,donor));}
 const event={id:'microtone',startSec:.05,endSec:1.3,pitch:[233.123,247.8,260.27],gain:[.6,.6,0,0,.6,.6]},job={model,mapping:mapping[0],recipe:{donor,params:{motion:1}},sampleRate:sr,durationSec:duration,events:[event]};
 const dry=await ctx.render({...job,diagnostics:{bypass:true}}),wet=await ctx.render(job),other=await ctx.render({...job,mapping:mapping[1]});
 assert(wet.left.every(Number.isFinite));assert.equal(wet.report.events.length,1);assert.equal(wet.report.events[0].phaseStarts,1,'gain holes cannot restart the note');
 const rms=a=>Math.sqrt(a.reduce((s,v)=>s+v*v,0)/a.length),match=(a,b)=>{const g=rms(a)/rms(b);return Math.sqrt(a.reduce((s,v,i)=>s+(v-b[i]*g)**2,0)/a.reduce((s,v)=>s+v*v,0))};
 assert(match(dry.left,wet.left)>.1);assert(match(wet.left,other.left)>.1);
 const frame=ctx.engine.frame(mapping[0],job.recipe,.8,sr/2048,1025),branch=ctx.engine.frame(mapping[1],job.recipe,.8,sr/2048,1025);
 const noNear=ctx.engine.frame(mapping[0],job.recipe,.8,sr/2048,1025,{disableNear:true}),noSplit=ctx.engine.frame(mapping[1],job.recipe,.8,sr/2048,1025,{disableSplit:true});
 assert(frame.ratios.some((v,i)=>Math.abs(v-noNear.ratios[i])>1e-3),'near coupling independently changes spacing');assert(branch.ratios.some((v,i)=>Math.abs(v-noSplit.ratios[i])>1e-3),'split independently changes spacing');
 const spacingOnly=ctx.engine.frame(mapping[0],job.recipe,.8,sr/2048,1025,{disableDistribution:true}),distributionOnly=ctx.engine.frame(mapping[0],job.recipe,.8,sr/2048,1025,{disableWarp:true});assert(spacingOnly.gains.every(v=>v===1));assert(distributionOnly.ratios.every(v=>Math.abs(v-1)<1e-10));
 assert(frame.ratios.some(v=>Math.abs(v-1)>.01));assert(frame.gains.some(v=>Math.abs(v-1)>.01));assert.notDeepEqual([...frame.ratios],[...branch.ratios]);
 const uniform={...job.recipe,donor:{...donor,amount:0}},zero=await ctx.render({...job,recipe:uniform});assert.deepEqual([...dry.left],[...zero.left]);
 const sine=Float32Array.from({length:sr},(_,i)=>.3*Math.sin(2*Math.PI*220*i/sr)),sa=await ctx.engine.analyze({...model,samples:sine});assert.equal(sa.richness,0);const sm=ctx.engine.prepare((await core.compile({grid:drawing('split'),instrument:core.settings({version:4,compilerRevision:3,donor})})).material,(await core.compile({grid:drawing('split'),instrument:core.settings({version:4,compilerRevision:3,donor})})).relations,sa,donor);
 const sf=ctx.engine.frame(sm,job.recipe,.5,8,1025);assert(sf.ratios.every(v=>Math.abs(v-1)<1e-10));assert(sf.gains.every(v=>v===1));
 let calls=0;await assert.rejects(ctx.render(job,{check:()=>{if(++calls>5)throw new DOMException('cancel','AbortError')}}));
 const steady={...job,events:[{id:'steady',startSec:0,endSec:1.4,pitch:[220],gain:[.6]}]},plain=await ctx.render({...steady,diagnostics:{bypass:true}}),shaped=await ctx.render(steady);
 vm.runInContext('globalThis.fft=__forgeMaterialToolsFactory().complexFFT;',ctx);
 const spectralPeak=(pcm,lo,hi)=>{const size=8192,re=Float64Array.from({length:size},(_,i)=>pcm[4000+i]*Math.sin(Math.PI*(i+.5)/size)),im=new Float64Array(size);ctx.fft(re,im);let at=Math.ceil(lo*size/sr),best=-1;for(let k=at;k<=Math.floor(hi*size/sr);k++){const m=re[k]**2+im[k]**2;if(m>best){best=m;at=k}}return at*sr/size;};
 const anchorDifferenceHz=Math.abs(spectralPeak(plain.left,190,250)-spectralPeak(shaped.left,190,250)),upperPartialDifferenceHz=Math.abs(spectralPeak(plain.left,1100,1180)-spectralPeak(shaped.left,1000,1180));assert(anchorDifferenceHz<4);assert(upperPartialDifferenceHz>20);
 const fineCore=create({resolution:'fine'}),fine=await fineCore.compile({grid:drawing('split'),instrument:core.settings({version:4,compilerRevision:3,donor})});assert.equal(fine.material.rows,256);assert.equal(fine.states,undefined);
 const poly=await ctx.render({...job,mapping:ctx.engine.prepare(fine.material,fine.relations,atlas,donor),durationSec:2.2,events:Array.from({length:8},(_,i)=>({id:'poly-'+i,startSec:.02*i,endSec:2+.01*i,pitch:[180*2**(i/13),240*2**(i/13)],gain:[.08,.08]}))});assert(poly.left.every(Number.isFinite));assert.equal(poly.report.events.length,8);assert(poly.report.events.every(e=>e.phaseStarts===1));
 const result={fineRows:fine.material.rows,polyphony:poly.report.events.length,anchorDifferenceHz,upperPartialDifferenceHz,sourcePeaks:atlas.peaks.length,temporalFrames:atlas.frames.length,richness:atlas.richness,gainMatchedDifferenceDryWet:match(dry.left,wet.left),gainMatchedDifferenceNearSplit:match(wet.left,other.left),near:{near:frame.near,split:frame.split,ratioRange:[Math.min(...frame.ratios),Math.max(...frame.ratios)]},branch:{near:branch.near,split:branch.split,ratioRange:[Math.min(...branch.ratios),Math.max(...branch.ratios)]},event:wet.report.events[0],sineRichness:sa.richness};
 fs.writeFileSync('results/f42-material-relations.json',JSON.stringify(result,null,2));console.log(result);
})().catch(e=>{console.error(e);process.exitCode=1});
