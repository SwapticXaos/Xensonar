'use strict';

const fs = require('fs'), assert = require('assert/strict'), vm = require('vm'), ts = require('typescript'), {load: load} = require('./offline_runtime.cjs'), h = load(process.cwd());

const file = 'tests/fixtures/ui-refinement/nodal-kernel-before.js', source = fs.readFileSync(file, 'utf8'), ast = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true), factory = ast.statements.find(n => n.name?.text === 'createNodalSynthesisKernel');

vm.runInContext(factory.getText(ast).replace('function createNodalSynthesisKernel(', 'function createBeforeNodalKernel(') + ';const __BeforeNodalDSP=createBeforeNodalKernel();', h.context);

h.run(`globalThis.__envelopeField=(left,right)=>H5(H5(Yf(Dx(),'dynamic-fade'),'left',left),'right',right);`);

const zero = h.run('resolveNodalArticulationFields({volumeEnvelope:__envelopeField(-1,-1)}).volumeCurve');

assert(zero.every(v => v === 0), 'Nodal volume at the bottom must resolve to exact zero, without a 5% floor');

const neutral = h.run('resolveNodalArticulationFields({volumeEnvelope:__envelopeField(0,0)}).volumeCurve'), boost = h.run('resolveNodalArticulationFields({volumeEnvelope:__envelopeField(1,1)}).volumeCurve');

assert(neutral.every(v => v === 1));

assert(boost.every(v => v === 1.95));

const legacy = h.run('resolveNodalArticulationFields({volumeEnvelope:__envelopeField(-1,-1)},null,false).volumeCurve');

assert(legacy.every(v => Math.abs(v - .05) < 1e-12), 'other synthesis backends retain the legacy volume-field contract');

const rows = [];

for (const version of [ 1, 2 ]) for (const rate of [ 44100, 48e3, 96e3 ]) {
  h.context.__version = version;
  h.context.__rate = rate;
  const row = JSON.parse(h.run(`(()=>{const model=__XenNodalModel,base=nodalOpenStarter('hollow'),raw=__version===1?{...base,schemaVersion:1,kernelVersion:'coupled-modal-v1'}:base,duration=.3,make=(field)=>model.compile(model.normalize({...raw,articulation:{...raw.articulation,volumeEnvelope:field}}));const flat=make(__envelopeField(-1,-1)),silence=__XenNodalDSP.render(flat,{durationSec:duration},__rate);const fadePlan=make(__envelopeField(0,-1)),curve=fadePlan.articulation.volumeCurve,fade=__XenNodalDSP.render(fadePlan,{durationSec:duration},__rate),zeroIndex=curve.findIndex(v=>v===0),zeroFrame=Math.ceil(duration*zeroIndex/(curve.length-1)*__rate)+2;let early=0,tail=0;for(let i=0;i<fade.pcm.length;i++){if(i<zeroFrame)early=Math.max(early,Math.abs(fade.pcm[i]));else tail=Math.max(tail,Math.abs(fade.pcm[i]),Math.abs(fade.left?.[i]??0),Math.abs(fade.right?.[i]??0));}let maxDifference=0;for(const volumeCurve of [null,[1,1],[.25,.5,1,.4]]){const plan=make(null),options={durationSec:.08,volumeCurve},old=__BeforeNodalDSP.render(plan,options,__rate),now=__XenNodalDSP.render(plan,options,__rate);for(let i=0;i<old.pcm.length;i++)maxDifference=Math.max(maxDifference,Math.abs(old.pcm[i]-now.pcm[i]));}return JSON.stringify({version:__version,rate:__rate,silent:silence.pcm.every(v=>v===0),earlyPeak:early,tailPeak:tail,zeroFrame,maxDifference});})()`));
  assert(row.silent);
  assert(row.earlyPeak > 1e-4);
  assert.equal(row.tailPeak, 0, 'zero contour must also mute residual output-filter state');
  assert.equal(row.maxDifference, 0, 'no/positive contour DSP stays sample-identical');
  rows.push(row);
}

const worklet = JSON.parse(h.run(`(()=>{let Processor,frame=0;class Base{constructor(){this.port={postMessage(){}}}}nodalWorkletProcessorFactory(createNodalSynthesisKernel,(_,C)=>Processor=C,Base,48000,()=>frame);const processor=new Processor(),instrument=nodalOpenStarter('hollow'),plan=__XenNodalModel.compile(__XenNodalModel.normalize({...instrument,articulation:{...instrument.articulation,volumeEnvelope:__envelopeField(0,-1)}})),duration=.3,zeroFrame=Math.ceil(duration*plan.articulation.volumeCurve.findIndex(v=>v===0)/(plan.articulation.volumeCurve.length-1)*48000)+2;processor.port.onmessage({data:{type:'plan',id:'fade',plan}});processor.port.onmessage({data:{type:'note',id:'voice',planId:'fade',startSec:0,options:{frequency:220,durationSec:duration}}});let earlyPeak=0,tailPeak=0;const output=Array.from({length:2},()=>[new Float32Array(128),new Float32Array(128)]);for(let block=0;block<250;block++){processor.process([],output);for(let i=0;i<128;i++){const v=Math.max(Math.abs(output[0][0][i]),Math.abs(output[0][1][i]));if(frame+i<zeroFrame)earlyPeak=Math.max(earlyPeak,v);else tailPeak=Math.max(tailPeak,v);}frame+=128;}return JSON.stringify({earlyPeak,tailPeak,frames:frame});})()`));

assert(worklet.earlyPeak > 1e-4);

assert.equal(worklet.tailPeak, 0, 'serialized production Worklet must honour the same zero endpoint');

fs.writeFileSync('results/ui-refinement/envelope-zero.json', JSON.stringify({
  rows: rows,
  worklet: worklet,
  zeroGain: true,
  neutralGain: 1,
  maximumGain: 1.95,
  legacyFieldFloorRetained: true
}, null, 2) + '\n');

console.log('PASS Nodal V1/V2 envelope: exact-zero mapping and PCM tails at 44.1/48/96 kHz; no/positive contours sample-identical; other backend field semantics retained');
