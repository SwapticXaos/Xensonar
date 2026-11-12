'use strict';
// ROOM5-07: Thunder Mode is switchable per input. thunderModeEnabled = Enter / Wave Starter (as before), thunderKeyboardEnabled = Keyboard;
// a state without thunderKeyboardEnabled (every saved state so far) behaves exactly as before: the keyboard follows thunderModeEnabled.
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const html=fs.readFileSync(process.argv[2]||require('path').join(__dirname,'..','dist','XenSonar_Standalone.html'),'utf8');
const i=html.indexOf('function __xenThunderLane(');assert(i>=0,'helper present');const j=html.indexOf('\n',i);
const ctx=vm.createContext({});vm.runInContext(html.slice(i,j)+';this.f=__xenThunderLane',ctx);const f=ctx.f;
for(const lane of['wellenstart','klaviatur']){assert.equal(f({},lane),true,'default on');assert.equal(f(undefined,lane),true,'no params: on')}
assert.equal(f({thunderModeEnabled:false},'wellenstart'),false);assert.equal(f({thunderModeEnabled:false},'klaviatur'),false,'old state: keyboard follows');
assert.equal(f({thunderModeEnabled:true},'klaviatur'),true);
assert.equal(f({thunderModeEnabled:true,thunderKeyboardEnabled:false},'wellenstart'),true,'Enter stays on');assert.equal(f({thunderModeEnabled:true,thunderKeyboardEnabled:false},'klaviatur'),false,'keyboard off alone');
assert.equal(f({thunderModeEnabled:false,thunderKeyboardEnabled:true},'wellenstart'),false,'Enter off alone');assert.equal(f({thunderModeEnabled:false,thunderKeyboardEnabled:true},'klaviatur'),true,'keyboard on alone');
// wiring: the keyboard key path and the Enter path ask for their own lane; the scheduler stays on while either lane is on
assert(/hpp=w&&__xenThunderLane\(a,"klaviatur"\)\?/.test(html),'keyboard path uses the keyboard lane');
assert(html.includes('L=(T,_)=>{if(!thunderOn("wellenstart"))')&&html.includes('B=(T,_)=>{if(!thunderOn("klaviatur"))'),'Enter / keyboard hold handlers use their own lane');
assert(html.includes('thunderModeEnabled:__xenThunderLane(et,"wellenstart")||__xenThunderLane(et,"klaviatur")'),'scheduler flag = either lane on');
console.log('PASS ROOM5-07 thunder lane split');
