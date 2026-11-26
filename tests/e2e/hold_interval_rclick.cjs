'use strict';
// UI-HOLD-INTERVAL-01 (real app): Controls & Settings right-click action Grid Root / Echo / Interval;
// Backspace interval card (default +1 octave), second card in Interval mode, a right-click in the playfield
// switches the active card, Echo mode toggles echoOn, the card ruler tunes the interval; Grid Spacing "Guitar".
// Usage: node tests/e2e/hold_interval_rclick.cjs dist/XenSonar_PROBE.html
const {chromium}=require('playwright');const path=require('path');const assert=require('node:assert/strict');
(async()=>{const b=await chromium.launch({args:['--autoplay-policy=no-user-gesture-required']});const p=await b.newPage({viewport:{width:1440,height:1000}});
const errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.goto('file://'+path.resolve(process.argv[2]||'dist/XenSonar_PROBE.html'));await p.waitForTimeout(4000);
await p.getByRole('button',{name:'Power'}).click();await p.waitForTimeout(1200);
const r={};
r.cards1=await p.getAttribute('[data-xen-hold-interval-cards]','data-xen-hold-interval-cards');
r.f0=await p.evaluate(()=>__XenHoldInterval.factor());
await p.click('[data-xen-rclick-action-option="interval"]');await p.waitForTimeout(300);
r.cards2=await p.getAttribute('[data-xen-hold-interval-cards]','data-xen-hold-interval-cards');
r.rootGone=await p.$('[aria-label="Right-click grid root"]')===null;
const c=await p.$('canvas[data-xen-play-area]');await c.scrollIntoViewIfNeeded();const bb=await c.boundingBox();
const click=()=>p.mouse.click(bb.x+bb.width/2,bb.y+bb.height/2,{button:'right'});
await click();await p.waitForTimeout(200);
r.active=await p.evaluate(()=>__XenHoldInterval.active());r.f1=await p.evaluate(()=>__XenHoldInterval.factor());
await p.keyboard.down('Backspace');await p.waitForTimeout(100);r.held=await p.evaluate(()=>[__XenHoldInterval.snapshot().held,globalThis.__XenLiveHolds?.snapshot().octave]);
await p.keyboard.up('Backspace');await p.waitForTimeout(100);r.rel=await p.evaluate(()=>globalThis.__XenLiveHolds?.snapshot().octave);
await click();await p.waitForTimeout(200);r.active2=await p.evaluate(()=>__XenHoldInterval.active());
await p.click('[data-xen-rclick-action-option="echo"]');await p.waitForTimeout(200);
await c.scrollIntoViewIfNeeded();const bb2=await c.boundingBox();
const rc=()=>p.mouse.click(bb2.x+bb2.width/2,bb2.y+bb2.height/2,{button:'right'});
const echo=()=>p.evaluate(()=>document.querySelector('[data-xen-rclick-action]').innerText.split('\n').pop());
r.echo=[await echo()];await rc();await p.waitForTimeout(300);r.echo.push(await echo());await rc();await p.waitForTimeout(300);r.echo.push(await echo());
await p.click('[data-xen-rclick-action-option="interval"]');await p.waitForTimeout(200);
const card=(await p.$$('.xen-hold-interval-row button'))[1];await card.scrollIntoViewIfNeeded();await card.click({button:'right'});await p.waitForTimeout(300);
const pop=await p.$('[data-xen-hold-pitch-popup]');r.popup=!!pop;
if(pop){const pb=await pop.boundingBox();await p.mouse.click(pb.x+pb.width/2,pb.y+pb.height*0.375);await p.waitForTimeout(200);}
r.cents=await p.evaluate(()=>__XenHoldInterval.cents());
r.fret=await p.evaluate(()=>{__XenStageLayout.setSpacing('fret');const Q=__XenGridMapProbe.yToHz,t=Q(580),n=Q(0);const m=Q(290);__XenStageLayout.setSpacing('abs');return [m,2*t*n/(t+n)]});
console.log(JSON.stringify(r));
assert.equal(r.cards1,'1','one card while right-click = Grid Root');assert.equal(r.f0,2,'default Backspace = octave up');
assert.equal(r.cards2,'2','two cards in Interval mode');assert.ok(r.rootGone,'root aiming hidden outside Grid Root');
assert.equal(r.active,1,'right-click switches to card 2');assert.equal(r.f1,0.5,'card 2 default = octave down');
assert.deepEqual(r.held,[true,true],'Backspace still drives the Live Room hold');assert.equal(r.rel,false);
assert.equal(r.active2,0,'second right-click switches back');
assert.ok(/off$/.test(r.echo[0])&&/on$/.test(r.echo[1])&&/off$/.test(r.echo[2]),'Echo mode toggles echoOn');
assert.ok(r.popup,'card ruler opens');assert.equal(r.cents[0],1200);assert.ok(r.cents[1]>200&&r.cents[1]<400,'card 2 tuned to about a minor third: '+r.cents[1]);
assert.ok(Math.abs(r.fret[0]-r.fret[1])<1e-9,'Guitar spacing: middle = harmonic mean');
assert.deepEqual(errs,[]);console.log('PASS UI-HOLD-INTERVAL-01 right-click actions, interval cards, guitar spacing');await b.close();})().catch(e=>{console.error(e);process.exit(1)});
