'use strict';
const fs=require('node:fs');const path=require('node:path');const vm=require('node:vm');const assert=require('node:assert/strict');
const source=fs.readFileSync(path.join(__dirname,'../src/audio/entrophon/02_worklet_and_voice_backend.js'),'utf8');
const from=source.indexOf('function Wwe('),to=source.indexOf('function qwe(',from);
assert(from>=0&&to>from,'Wwe dispatcher boundary changed');
const code=source.slice(from,to)+'\nthis.dispatch=Wwe;';
async function check(sourceKind,expectedBody,expectedNoise){
  const events=[];
  const context={
    NF(){throw Error('not expected')},Hwe(){throw Error('not expected')},Vwe(){throw Error('not expected')},kH(){return{}},
    Pwe(){return Promise.resolve(true)}, Gwe(){return Promise.resolve(true)}
  };
  vm.createContext(context);vm.runInContext(code,context);
  const env={ctx:{},getMainOutput(){return{}},triggerBodyExciter(){events.push('body');return true},playNoiseAccent(){events.push('noise');return true},playScheduledTone(){events.push('intro');return true}};
  const req={sourceKind, synthTonePlan:{sitarBias:0,psyBias:0,introTones:[],mainTones:[],noiseAccentVolumeScale:.1},presetRoute:{kind:'sample',sampleId:'pcm'},axes:{},freq:220,volume:.5,transientPlan:{bodyScale:1},bodyVoiceBudget:1, when:0};
  context.dispatch(env,req);await new Promise(resolve=>setImmediate(resolve));
  assert.equal(events.includes('body'),expectedBody,`${sourceKind} sample body overlay`);
  assert.equal(events.includes('noise'),expectedNoise,`${sourceKind} sample noise overlay`);
}
(async()=>{await check('particle',false,false);await check('resident',true,true);console.log('OMEGA SAMPLE PURITY PASS: PCM particle is exclusive, resident remains hybrid');})().catch(e=>{console.error(e);process.exitCode=1});
