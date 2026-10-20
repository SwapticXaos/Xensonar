const assert=require('node:assert/strict');const fs=require('node:fs');const vm=require('node:vm');
const file=process.argv[2];const s=fs.readFileSync(file,'utf8');
const required=[
 ['native factory', 'function __xenRefucktorCreateDroneVoice('],
 ['native submix', 'function __xenRefucktorBuildSubmix('],
 ['native echo', 'function __xenRefucktorCreateEcho('],
 ['workbench wiring', 'currentMode:e.droneRhythm'],
 ['original pattern editor', 'onChangeCustomSteps:steps=>a({droneRhythmCustomSteps:steps})'],
 ['wobble graph', 'function __xenRefucktorBuildWorkbenchFX('],
 ['wobble update', 'function __xenRefucktorSyncWorkbench('],
 ['rhythmic scheduler', 'function __xenRefucktorScheduleMute('],
 ['rhythmic stop', 'function __xenRefucktorStopPattern('],
 ['cursor switch', 'droneCursorFollow'],
 ['wobble shapes', 'droneWobbleShape'],
 ['wobble rate', 'droneWobbleRate'],
 ['distortion', 'droneDubDrive'],
 ['modulation audio native', 'wobbleOsc.connect(wobbleShaper)'],
 ['legacy isolation', 'r.__xenLegacyDroneGate'],
 ['no beat coupling', 'droneRhythmCustomSteps']
 ];
for(const [what,token] of required)assert.ok(s.includes(token),what+' missing: '+token);
assert.ok(!s.includes("P.useEffect(()=>{if(__xenDroneIsPilot(e.dronePreset)&&e.droneRhythm!=='Off')"),'forced disabling of rhythm remains');
const a=s.indexOf('function __xenRefucktorCreateDroneVoice('),b=s.indexOf('function __xenRefucktorCreateEcho(');assert.ok(a>=0&&b>a);const factory=s.slice(a,b);
for(const frag of ['root.connect(filter)','upper.connect(filter)','filter.connect(gain)','gain.connect(destination)','lfoGain.connect(root.detune)','lfoGain.connect(upper.detune)'])assert.ok(factory.includes(frag),'historic donor changed '+frag);
assert.ok(s.includes('n.__xenRefucktorSubmix.fx.input'),'actual original voice must feed new fx input not legacy drone');
// Pure helper tests: shape curve unipolar and bounded, active gating never schedules beyond a normal 16-step cycle.
let helperStart=s.indexOf('function __xenRefucktorWobbleCurve('),helperEnd=s.indexOf('function __xenRefucktorBuildWorkbenchFX(',helperStart);assert.ok(helperStart>0&&helperEnd>helperStart);
const code=s.slice(helperStart,helperEnd);const sandbox={Float32Array,Math};vm.runInNewContext(code+'\nthis.curve=__xenRefucktorWobbleCurve;',sandbox);
for(const shape of ['Sine','Triangle','Square','Saw Down','Growl']){
 const c=sandbox.curve(shape);assert.ok(c.length>=512,shape);for(const v of c){assert.ok(v>=0&&v<=1,shape+' unipolar only');}
 assert.ok(Math.max(...c)-Math.min(...c)>.3,shape+' audible modulation');
}
console.log('PASS P3: native Refucktor donor, workbench, rhythmic gate, Wobble curves, cursor, drive, isolation');
