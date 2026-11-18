'use strict';
// ROOM-SEAMS-01 (real app): the seams between the rooms. With the Live Room playing (Power on, drums running), every one of the
// 20 ordered room changes (each room to each other room) is made with the header buttons, and after each arrival:
//  - no page error
//  - no focus is left inside a parked room (aria-hidden / inert / keepalive box): keys would go to a room that is not on screen
//  - back in the Live Room: Power on again (leaving the Live Room switches its engine off, as since at least 11.11.) and its
//    clock counts again (drum tick moves, Power is on, nothing left half-stopped)
// Then two more full tours: window/document listeners and DOM nodes do not grow from tour to tour, and an edit made in a room
// (Melodic Loop bars) is still there after the tours.
// Catches the class of bugs the audit of 17.11. names as the weakest area (focus/keys/parked rooms, listeners left behind).
// Usage: node tests/e2e/room_seams.cjs dist/XenSonar_PROBE.html
const {chromium}=require('playwright');const assert=require('node:assert/strict');const path=require('node:path');
const html=path.resolve(process.argv[2]||'dist/XenSonar_PROBE.html');
const ROOMS=['LIVE ROOM','MATERIAL FORGE','NODAL CENTER','PSY LAB','MULTITRACK'];
(async()=>{const b=await chromium.launch({args:['--autoplay-policy=no-user-gesture-required']});const ctx=await b.newContext({viewport:{width:1440,height:1000}});const p=await ctx.newPage();
 const errors=[];p.on('pageerror',e=>errors.push(e.message));
 const cdp=await ctx.newCDPSession(p);await cdp.send('Performance.enable');
 const metrics=async()=>Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.filter(m=>['JSEventListeners','Nodes'].includes(m.name)).map(m=>[m.name,m.value]));
 const E=c=>p.evaluate(x=>window.__xenProbe.draw.evalInBundle(x),c);
 await p.goto('file://'+html);await p.waitForTimeout(3500);await p.getByRole('button',{name:'Power'}).click();await p.waitForTimeout(2500);
 await p.evaluate(x=>__xenProbe.bridge.patch(x),{drumActive:true});await p.waitForTimeout(800);
 const powerOn=()=>p.evaluate(()=>!document.body.innerText.includes('OFFLINE - ENABLE'));
 const power=async()=>{if(!(await powerOn())){const b=p.getByRole('button',{name:/^(Power|Have you tried turning it off and on again\?)$/}).first();if(await b.count()){await b.click();await p.waitForTimeout(1500)}}};
 const tick=async()=>Number(await E('__mlSharedDrumMachine.readMainTick()'));
 const go=async name=>{await p.evaluate(n=>{const b=[...document.querySelectorAll('header button')].find(x=>x.innerText.replace(/\s+/g,' ').includes(n)&&x.offsetParent);if(!b)throw Error('no header button '+n);b.click()},name);await p.waitForTimeout(1200)};
 // an edit in a room that must survive the tours
 await go('MATERIAL FORGE');await p.locator('button',{hasText:'MELODIC LOOP'}).first().click();await p.waitForTimeout(3000);
 const ml=p.getByLabel('Number of Bars').first();await ml.scrollIntoViewIfNeeded();await ml.fill('12');await ml.blur();await p.waitForTimeout(600);
 await go('LIVE ROOM');await p.waitForTimeout(800);
 const problems=[];let changes=0;
 const check=async(from,to)=>{
  const s=await p.evaluate(()=>{const a=document.activeElement;let stuck=null;
   for(let n=a;n&&n!==document.body;n=n.parentElement){if(n.inert||n.getAttribute?.('aria-hidden')==='true'||n.hasAttribute?.('data-package-station-keepalive')&&n.getAttribute('data-package-station-keepalive')==='true'){stuck=(a.tagName+' '+(a.getAttribute('aria-label')||a.innerText||'').slice(0,40)).trim();break}}
   return {stuck}});
  if(s.stuck)problems.push(`${from} → ${to}: focus left in a parked room (${s.stuck})`);
  if(to==='LIVE ROOM'){await power();const a=await tick();await p.waitForTimeout(700);const z=await tick();if(!(await powerOn()))problems.push(`${from} → ${to}: Power cannot be switched on again`);else if(!(z>a))problems.push(`${from} → ${to}: the Live Room clock does not run after Power (tick ${a} → ${z})`)}
 };
 const tour=async label=>{
  for(const from of ROOMS)for(const to of ROOMS){if(from===to)continue;
   await go(from);if(from==='LIVE ROOM')await power();
   // like a person who just used a control of this room: the focus sits inside the room when the room is left
   await p.evaluate(()=>{const c=[...document.querySelectorAll('input[type=range],input[type=number],select,button')].filter(e=>e.offsetParent&&!e.closest('header')&&!e.disabled&&!e.closest('[aria-hidden="true"],[inert],[data-package-station-keepalive="true"]'));(c[Math.floor(c.length/2)]||c[0])?.focus()});
   await go(to);changes++;await check(from,to)}
  await go('LIVE ROOM');await power();await p.waitForTimeout(1500);for(let i=0;i<3;i++){await cdp.send('HeapProfiler.collectGarbage');await p.waitForTimeout(300)}return metrics()};// counts of collected nodes/listeners vanish only after a GC
 const m1=await tour('tour 1'),m2=await tour('tour 2'),m3=await tour('tour 3');
 console.log('listeners / DOM nodes after tour 1, 2, 3:',[m1,m2,m3].map(m=>m.JSEventListeners+' / '+m.Nodes).join(' · '));
 assert.deepEqual(problems,[],'room seams:\n'+problems.join('\n'));
 assert.ok(m3.JSEventListeners<=m2.JSEventListeners+2,'no listeners left behind per tour: '+m2.JSEventListeners+' → '+m3.JSEventListeners);
 assert.ok(m3.Nodes<=m2.Nodes+20,'no DOM growth per tour: '+m2.Nodes+' → '+m3.Nodes);
 await go('MATERIAL FORGE');await p.locator('button',{hasText:'MELODIC LOOP'}).first().click();await p.waitForTimeout(2500);
 const ml2=p.getByLabel('Number of Bars').first();await ml2.scrollIntoViewIfNeeded();assert.equal(await ml2.inputValue(),'12','an edit in the Melodic Loop survives '+changes+' room changes');
 assert.deepEqual(errors,[]);console.log('PASS ROOM-SEAMS-01: '+changes+' room changes from a playing Live Room: no page error, no focus in a parked room, the Live Room comes back with Power and a running clock, no listener/DOM growth, edits kept');await b.close();
})().catch(e=>{console.error(e);process.exit(1)});
