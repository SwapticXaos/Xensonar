'use strict';
const fs=require('fs'),vm=require('vm'),assert=require('assert/strict'),crypto=require('crypto');
const c=vm.createContext({Float32Array,Float64Array,console});
vm.runInContext(['src/forge/dsp/02_gestalt_tools.js','src/forge/analysis/04_audio_to_carrier.js'].map(f=>fs.readFileSync(f,'utf8')).join('\n')+';globalThis.analyzer=__audioCarrierAnalysisFactory(__forgeGestaltToolsFactory(2*Math.PI,{resamplingPhases:64},(v,a,b)=>Math.max(a,Math.min(b,v))));',c);
const checks=[],median=a=>[...a].sort((a,b)=>a-b)[a.length>>1],hash=a=>crypto.createHash('sha256').update(Buffer.from(a.buffer)).digest('hex');
function run(name,signal,expected,options={},rate=24000,duration=1){
 c.samples=Float32Array.from({length:rate*duration},(_,i)=>signal(i/rate));c.rate=rate;c.options=options;c.progress=[];const before=hash(c.samples),start=performance.now();
 const result=vm.runInContext('analyzer.analyze({samples,sampleRate:rate,options},p=>progress.push(p))',c),hz=result.notes.map(n=>median(n.pitchHz)).sort((a,b)=>a-b);
 assert.equal(hash(c.samples),before,'raw PCM preserved');assert.equal(hz.length,expected.length,name+': '+JSON.stringify(hz));
 expected.forEach((f,i)=>assert(Math.abs(1200*Math.log2(hz[i]/f))<18,name+' pitch error '+hz[i]));
 assert(c.progress.length>5&&c.progress.at(-1)===1);assert(c.progress.every((p,i)=>p>=0&&p<=1&&(!i||p>=c.progress[i-1])));
 result.notes.forEach(n=>assert(n.startSec>=0&&n.endSec<=duration&&n.endSec-n.startSec>=.08));
 checks.push({name,rate,duration,frequencies:hz,elapsedMs:Math.round(performance.now()-start)});return result;
}
const harmonic=(f,amps=[1,.5,.3,.2,.1])=>t=>amps.reduce((s,a,h)=>s+.15*a*Math.sin(2*Math.PI*f*(h+1)*t),0);
run('sine',harmonic(233.2,[1]),[233.2]);
run('dominant upper partials',harmonic(220,[.03,.7,.5,.3,.2,.1]),[220]);
run('missing fundamental, monophonic',harmonic(220,[0,.7,.5,.3,.2,.1]),[220],{voices:1});
const roots=[130.8128,164.8138,195.9977],chord=t=>roots.reduce((s,f,k)=>s+Array.from({length:9},(_,h)=>Math.exp(-t*(1+h*.2))*Math.sin(t*2*Math.PI*f*(h+1)*Math.sqrt(1+.00001*(h+1)**2)+k*.2)*.08/(h+1)).reduce((a,b)=>a+b),0);
run('three-note plucked guitar chord',chord,roots);
run('low guitar chord',t=>[82.4069,110,146.832].reduce((s,f)=>s+harmonic(f)(t)/3,0),[82.4069,110,146.832]);
for(const rate of [44100,48000,96000])run('native sample rate '+rate,harmonic(317.3),[317.3],{},rate);
run('silence',()=>0,[]);let seed=1;run('broadband noise',()=>{seed=(1664525*seed+1013904223)>>>0;return (seed/4294967296*2-1)*.2;},[]);
run('quiet tone gated',t=>.002*Math.sin(2*Math.PI*220*t),[]);
run('quiet tone with lower noise gate',t=>.002*Math.sin(2*Math.PI*220*t),[220],{noiseDb:-70});
run('short transient rejected',t=>t>.45&&t<.47?Math.sin(2*Math.PI*220*t)*.2:0,[]);
const vibrato=run('continuous vibrato',t=>.2*Math.sin(2*Math.PI*220*t-1.3*Math.cos(2*Math.PI*4*t)),[220]);assert(Math.max(...vibrato.notes[0].pitchHz)-Math.min(...vibrato.notes[0].pitchHz)>5,'continuous pitch retained');
c.options={strictness:NaN};assert.throws(()=>vm.runInContext('analyzer.analyze({samples,sampleRate:rate,options})',c),/Filter/);
fs.mkdirSync('results/audio-carrier',{recursive:true});fs.writeFileSync('results/audio-carrier/analysis.json',JSON.stringify({checks,limits:'Heuristic polyphony: exact octave doublings and dense/noisy mixtures remain ambiguous.'},null,2)+'\n');console.log('PASS '+checks.length+' signal fixtures: harmonics, chords, native rates, noise gate, continuous pitch and PCM preservation');
