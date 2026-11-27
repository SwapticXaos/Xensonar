'use strict';
// DRUM-ECHO-LANES-01 (real app): the Dub Echo body is structured (Which drums · Scenes · Send & sound · Time), every drum lane
// has a tick; all ticked = the whole processed drum bus feeds the echo (as before), a selection switches the echo input to
// the per-hit lane tap and only ticked lanes get a tap. English UI.
// Usage: node tests/e2e/drum_echo_lanes.cjs dist/XenSonar_PROBE.html
const {chromium}=require('playwright');const assert=require('node:assert/strict');const path=require('node:path');
const html=path.resolve(process.argv[2]||'dist/XenSonar_PROBE.html');
(async()=>{
 const b=await chromium.launch({args:['--autoplay-policy=no-user-gesture-required']});
 const p=await(await b.newContext({viewport:{width:1500,height:1000}})).newPage();
 const errs=[];p.on('pageerror',e=>errs.push(e.message));
 await p.goto('file://'+html);
 await p.waitForFunction(()=>window.__xenProbe&&__xenProbe.bridge.available(),null,{timeout:60000});
 await p.getByRole('button',{name:'Power'}).click();await p.waitForTimeout(1200);
 const E=x=>p.evaluate(s=>window.__xenProbe.draw.evalInBundle(s),x);
 await p.evaluate(()=>window.dispatchEvent(new Event('xensonar:open-drum-pattern-manager')));
 await p.waitForSelector('[data-drum-echo-panel]',{timeout:10000});
 await p.locator('[data-drum-echo-collapse]').click();await p.waitForSelector('[data-drum-echo-lanes]');
 assert.equal(await p.locator('[data-drum-echo-collapse]').innerText(),'▾ Less');
 const titles=await p.locator('.xen-echo-section-title b').allInnerTexts();
 assert.deepEqual(titles.map(t=>t.toUpperCase()),['WHICH DRUMS','SCENES','SEND & SOUND','TIME'],'sections: '+titles);
 assert.equal(await p.locator('[data-drum-echo-lane]').count(),12,'6 drums + 6 sample lanes');
 const mask=()=>E('__f48RackParams.drumEchoLanes');
 assert.equal(await mask(),4095,'all drums by default');
 // untick Snare and Hi-hat
 await p.locator('[data-drum-echo-lane="snare"] input').click();await p.locator('[data-drum-echo-lane="hatClosed"] input').click();await p.waitForTimeout(150);
 assert.equal(await mask(),4095&~2&~4,'snare + hi-hat removed');
 assert.equal(await p.locator('[data-drum-echo-lane="snare"] input').isChecked(),false);
 // the rack switches the echo input: selection → lane taps only for ticked lanes; all → the bus again
 const r=await E(`(()=>{const ctx=new AudioContext();const dest=ctx.createGain();const rack=__f48GetDrumRack(ctx,dest);
   rack.update({...__f48RackParams,drumEcho:.5,drumEchoLanes:1|8});
   const a={kick:!!rack.echoTapFor('kick'),snare:!!rack.echoTapFor('snare'),hatOpen:!!rack.echoTapFor('hat_open'),hatClosed:!!rack.echoTapFor('hat_closed'),sample1:!!rack.echoTapFor('sample1')};
   rack.update({...__f48RackParams,drumEcho:.5,drumEchoLanes:4095});
   const all={kick:!!rack.echoTapFor('kick')};rack.dispose?.();ctx.close();return JSON.stringify({a,all})})()`).then(JSON.parse);
 assert.deepEqual(r.a,{kick:true,snare:false,hatOpen:true,hatClosed:false,sample1:false},'only ticked lanes get a tap');
 assert.deepEqual(r.all,{kick:false},'all ticked: the bus feeds the echo, no per-hit tap');
 // All / None
 await p.locator('.xen-echo-lane-all',{hasText:'None'}).click();await p.waitForTimeout(100);assert.equal(await mask(),0);
 await p.locator('.xen-echo-lane-all',{hasText:'All'}).click();await p.waitForTimeout(100);assert.equal(await mask(),4095);
 // persisted with the rack
 await p.locator('[data-drum-echo-lane="kick"] input').click();await p.waitForTimeout(500);
 assert.equal(await p.evaluate(()=>JSON.parse(localStorage.getItem('xensonar-rhythm-rack-v1')||'{}').drumEchoLanes),4094,'stored with the rack');
 assert.deepEqual(errs,[]);
 console.log('PASS DRUM-ECHO-LANES-01 structured echo body, 12 lane ticks, rack switches bus ↔ lane taps, All/None, stored');
 await b.close();
})().catch(e=>{console.error(e);process.exit(1)});
