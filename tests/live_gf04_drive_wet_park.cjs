'use strict';
// LIVE-GF-04: the drone drive wet chain is connected to the output only while its mix is above zero.
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),assert=require('node:assert/strict');
const src=fs.readFileSync(path.resolve(__dirname,'../src/runtime/01_instrument_state.js'),'utf8');
const a=src.indexOf('__xenDriveWetPark=(e,wet)=>{'),b=src.indexOf(',oJ=(e,t,n)=>{');assert(a>0&&b>a);
const timers=[];const box={setTimeout:(fn,ms)=>{timers.push({fn,ms});return timers.length},clearTimeout:id=>{if(timers[id-1])timers[id-1].fn=null}};
vm.createContext(box);vm.runInContext('var '+src.slice(a,b)+';globalThis.park=__xenDriveWetPark;',box);
const fire=()=>{const t=timers.filter(x=>x.fn);for(const x of t){const f=x.fn;x.fn=null;f()}return t.length};
const make=()=>{const log=[];const e={driveParked:true,driveParkTimer:0,driveOut:{id:'out'},driveWet:{gain:{value:0}},driveOutputGain:{connect:d=>log.push('connect:'+d.id),disconnect:d=>log.push('disconnect:'+d.id)}};return{e,log}};
// creation state: parked; a zero mix leaves it parked without timers
{const{e,log}=make();box.park(e,0);assert.deepEqual(log,[]);assert.equal(fire(),0);assert.equal(e.driveParked,true)}
// mix rises: connect immediately, exactly once
{const{e,log}=make();box.park(e,.4);box.park(e,.5);assert.deepEqual(log,['connect:out']);assert.equal(e.driveParked,false);
 // mix returns to zero: stays connected until the wet gain is inaudible
 e.driveWet.gain.value=.3;box.park(e,0);assert.deepEqual(log,['connect:out']);fire();assert.equal(e.driveParked,false,'still audible: not parked');
 e.driveWet.gain.value=5e-5;fire();assert.deepEqual(log,['connect:out','disconnect:out']);assert.equal(e.driveParked,true);
 // and back on
 box.park(e,.2);assert.deepEqual(log,['connect:out','disconnect:out','connect:out'])}
// mix comes back before the timer fires: never disconnected
{const{e,log}=make();box.park(e,.4);e.driveWet.gain.value=0;box.park(e,0);box.park(e,.3);fire();assert.deepEqual(log,['connect:out']);assert.equal(e.driveParked,false)}
// graphs without the flag (built before the patch) are left alone
{const log=[];box.park({driveOutputGain:{connect:()=>log.push(1),disconnect:()=>log.push(2)}},0);box.park({driveOutputGain:{connect:()=>log.push(1)}},1);assert.deepEqual(log,[])}
assert(/s\.connect\(g\),o\.connect\(n\)/.test(src)&&!/g\.connect\(o\),o\.connect\(n\)/.test(src),'drive graph is created parked');
assert(/__xenDriveWetPark\(e,y\),e\.driveDry\.gain/.test(src),'reconnect happens before the wet gain is automated');
console.log('PASS LIVE-GF-04 drone drive wet chain parks at zero mix and reconnects before fading in');
