'use strict';
// Acoustic/state regression against the complete N3 V2 voice, not an equation
// rewritten to mirror the candidate. Irregular frames cross all CV/fade edges.
const fs=require('node:fs'),assert=require('node:assert/strict'),read=p=>fs.readFileSync(p,'utf8');
const candidate=process.argv.find(a=>a.startsWith('--candidate=')),output=process.argv.find(a=>a.startsWith('--output='));
const common=read('src/nodal/01_instrument_model.js')+'\n'+read('src/nodal/07_sound_designer.js');
const load=file=>new Function(common+'\n'+read(file)+';return {model:__XenNodalModel,dsp:__XenNodalDSP,starter:nodalOpenStarter};')();
const engines=[load('tests/fixtures/p4c2_n3_baseline/02_synthesis_kernel.js'),load(candidate?candidate.slice(12):'src/nodal/02_synthesis_kernel.js')];
const variants=['hollow','reed','prism','mixed7','mixed12','singleImpulse'],rates=[44100,48000,96000],modes=['release','early','gate','gliss','curves','silent'];
let samples=0,cases=0,snapshots=0,blocks=0;
for(const name of variants)for(const rate of rates){
 let raw=engines[0].starter(name.startsWith('mixed')||name==='singleImpulse'?'hollow':name);
 if(name.startsWith('mixed'))raw={...raw,material:{...raw.material,body:name==='mixed12'?0:.48,natural:name==='mixed12'?1:.8,follow:.35,width:name==='mixed12'?0:1,register:name==='mixed12'?-2:1},nodes:Array.from({length:Number(name.slice(5))},(_,i)=>({...raw.nodes[i%3],id:'n'+i,ratio:1+i*.137,excitationKind:['tone','impulse','breath'][i%3]}))};
 if(name==='singleImpulse')raw={...raw,material:{...raw.material,natural:0,body:1,width:0},nodes:[{...raw.nodes[0],excitationKind:'impulse'}]};
 const plans=engines.map(e=>e.model.compile(e.model.normalize(raw)));
 for(const mode of modes){
  const frequency=name==='mixed12'?11000:name==='singleImpulse'?5:193.731;
  const options={frequency,velocity:mode==='silent'?0:.73,gain:mode==='silent'?0:.37,held:mode!=='gate',durationSec:.083,
   ...(mode==='early'?{attackSec:.1,releaseSec:0}:{}),...(mode==='curves'?{seed:91371,pitchCurve:[0,.371,-.419,.137],volumeCurve:[0,.8,.17,1]}:{})};
  // Exercise both direct construction and Worker-style preinstalled templates.
  if(mode==='release'||mode==='silent')for(let k=0;k<2;k++)engines[k].dsp.installPrepared(plans[k],structuredClone(engines[k].dsp.preparePacket(plans[k],[frequency],rate,true)),rate);
  const voices=engines.map((e,i)=>e.dsp.voice(plans[i],options,rate));
  const arrays=Array.from({length:4},()=>new Float32Array(263)),lengths=[1,15,16,17,127,128,129,255];
  const releaseAt=mode==='early'?1:Math.round(rate*.071),endAt=releaseAt+Math.round(rate*(Math.max(plans[0].tailSec,options.releaseSec??raw.articulation.releaseSec)+.05))+300;
  let elapsed=0,step=0,off=false;
  while(elapsed<endAt){
   if(!off&&mode!=='gate'&&elapsed>=releaseAt){voices.forEach(v=>v.noteOff());off=true;}
   if(mode==='gliss'&&step%7===0){const hz=[5,73.137,193.731,1700.37,11000,317.137][Math.floor(step/7)%6];voices.forEach(v=>v.setFrequency(hz));}
   const count=Math.min(lengths[step%lengths.length],endAt-elapsed),start=3,stereo=step%3,accumulate=step%2===0;
   for(let k=0;k<263;k++){const l=k%17===0?-0:(k-131)*.00017,r=k%13===0?-0:(131-k)*.00013;arrays[0][k]=arrays[2][k]=l;arrays[1][k]=arrays[3][k]=r;}
   for(let k=0;k<2;k++)voices[k].process(arrays[k*2],stereo===0?undefined:stereo===1?arrays[k*2]:arrays[k*2+1],start,count,accumulate);
   assert.deepEqual(arrays[2],arrays[0],name+'/'+rate+'/'+mode+'/left/'+elapsed);
   assert.deepEqual(arrays[3],arrays[1],name+'/'+rate+'/'+mode+'/right/'+elapsed);
   assert.equal(Object.is(arrays[2][0],arrays[0][0]),true);
   if(step%23===0){assert.deepEqual(voices[1].snapshot(),voices[0].snapshot());snapshots++;}
   samples+=count*(stereo===2?2:1);elapsed+=count;step++;blocks++;
  }
  assert.deepEqual(voices[1].snapshot(),voices[0].snapshot());snapshots++;assert(voices[1].ended,'the test must cross the complete natural tail');
  // Reuse after a complete tail; no state from a specialized phase may leak.
  voices.forEach(v=>v.reset({frequency:317.137,gain:.29,velocity:.6,held:true,seed:7143}));const a=new Float32Array(513),b=new Float32Array(513),c=new Float32Array(513),d=new Float32Array(513);voices[0].process(a,b);voices[1].process(c,d);assert.deepEqual(c,a);assert.deepEqual(d,b);assert.deepEqual(voices[1].snapshot(),voices[0].snapshot());samples+=1026;snapshots++;cases++;
 }
}
const report={cases,channelSampleValues:samples,irregularBlocks:blocks,snapshotComparisons:snapshots,baseline:'P4C2-N3',checks:['full release and natural tails','early release before attack','automatic gate','gliss after release','custom seed/pitch/volume curves','zero gain/velocity','3/7/12-node and single impulse','body 0/1, natural 0/1, width/register/follow','prepared templates and reset after completed tail','mono/alias/stereo, accumulate/overwrite, arbitrary offsets and frame sizes'],result:'bit-identical Float32 output and exact snapshots'};
fs.writeFileSync(output?output.slice(9):'results/p4c2-n4-sample-parity.json',JSON.stringify(report,null,2)+'\n');console.log('PASS N4',report);
