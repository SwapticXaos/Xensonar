const assert=require('node:assert/strict');
const fs=require('node:fs');const vm=require('node:vm');
const html=fs.readFileSync(process.argv[2]||'/mnt/data/XenSonar_N21_F2_Refucktor_Drone_Pilot_Test.html','utf8');
const archive=fs.readFileSync('/mnt/data/refucktor_transplant/refucktor_factory_original.ts','utf8');
assert.match(html,/function __xenRefucktorCreateDroneVoice\(/,'original graph factory is NOT transplanted');
assert.match(html,/function __xenRefucktorSync\(/,'standalone Refucktor lifecycle controller missing');
assert.match(html,/r\.__xenLegacyDroneGate/,'old drone graph is not isolated');
assert.match(html,/r\.droneVolumeBus/,'Refucktor not routed to shared drone volume bus');
assert.doesNotMatch(html,/__xenDronePilotRuntime/,'old synthetic imitation remains active');
assert.doesNotMatch(html,/__xenDroneHaloWave/,'derived spectral preset still active');
assert.match(html,/function __xenRefucktorCreateEcho\(/,'donor echo graph not transplanted');
assert.match(html,/function __xenRefucktorBuildSubmix\(/,'donor master/compressor graph not transplanted');
for(const fragment of ['delayA.delayTime.value = 0.27','delayB.delayTime.value = 0.41','feedback.connect(delayA)','echo.feedback.gain.value=.32','echo.wet.gain.value=.24','compressor.threshold.value=-22','compressor.ratio.value=4','compressor.attack.value=.003','compressor.release.value=.18','output.gain.value=.92'])assert.ok(html.includes(fragment),'donor submix not faithfully reproduced: '+fragment);
assert.match(html,/__xenRefucktorCreateDroneVoice\(ctx,n\.__xenRefucktorSubmix\.echo\.input,hz,preset\)/,'voice does not feed genuine Refucktor echo input');
// Copy-proof: the body of the archived 2026-05-18 createDroneVoice is preserved inside the implementation.
for(const fragment of ['filter.frequency.value = 1800','lfo.frequency.value = 0.11','lfoGain.gain.value = 14','lfoGain.connect(root.detune)','lfoGain.connect(upper.detune)','root.connect(filter)','upper.connect(filter)','filter.connect(gain)','gain.connect(destination)','case "dark_sub":','case "ethereal_halo":','gain.gain.exponentialRampToValueAtTime(targetGain, startAt + 0.28)','root.stop(t + 0.7)']){
 assert.ok(archive.includes(fragment),'missing evidence in donor: '+fragment);
 assert.ok(html.includes(fragment),'transplant diverged from donor: '+fragment);
}
const p=html.indexOf('function __xenRefucktorCreateDroneVoice('),q=html.indexOf('function __xenRefucktorSync(',p);
assert.ok(p>0 && q>p);const code=html.slice(p,q);
let events=[];const parameter=(name,v=0)=>({value:v,setTargetAtTime(x,t,c){this.value=x;events.push(['target',name,x]);},cancelScheduledValues(){},setValueAtTime(x){this.value=x;},exponentialRampToValueAtTime(x,t){this.value=x;}});
let oscCount=0;
const node=(kind)=>({kind,connections:[],connect(dst){this.connections.push(dst);return dst;},disconnect(){this.connections.length=0;},start(t){events.push(['start',kind,t]);},stop(t){events.push(['stop',kind,t]);},gain:parameter('gain'),frequency:parameter('frequency'),detune:parameter('detune'),Q:parameter('Q')});
const ctx={currentTime:1,createOscillator(){oscCount++;return node('oscillator')},createGain(){return node('gain')},createBiquadFilter(){return node('biquad')}};
const isolated={Math,console};vm.runInNewContext(`${code}\nthis.make=__xenRefucktorCreateDroneVoice;`,isolated);
const output=node('output');const voice=isolated.make(ctx,output,55,'dark_sub');
assert.equal(oscCount,3,'Refucktor must own exactly root, upper, slow LFO');
assert.equal(voice.root.type,'sine');assert.equal(voice.upper.type,'triangle');
assert.equal(voice.root.frequency.value,55);assert.equal(voice.upper.frequency.value,82.5);
assert.equal(voice.lfo.frequency.value,.11);assert.equal(voice.lfoGain.gain.value,14);
assert.equal(voice.filter.frequency.value,700);assert.equal(voice.gain.connections[0],output);
assert.ok(voice.lfoGain.connections.includes(voice.root.detune)&&voice.lfoGain.connections.includes(voice.upper.detune));
assert.equal(voice.root.connections[0],voice.filter);assert.equal(voice.upper.connections[0],voice.filter);
voice.stop();assert.equal(events.filter(e=>e[0]==='stop').length,3);
console.log('PASS: original Refucktor DSP graph, provenance, bus routing, isolated Legacy output, lifecycle');
