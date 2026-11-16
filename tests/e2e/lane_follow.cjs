'use strict';
// LANE-FOLLOW-01 (real app): the Quick Rack, and with it the Volume/Pan/Pitch/Nudge/EQ panel (Lane Alignment), is as tall as the LIVE session needs.
// Before, a long saved session kept the rack (and the panel under it) tall after the live list was shortened.
// Usage: node tests/e2e/lane_follow.cjs dist/XenSonar_PROBE.html
const {chromium}=require('playwright');const assert=require('node:assert/strict');const path=require('node:path');
const html=path.resolve(process.argv[2]||'dist/XenSonar_PROBE.html');
(async()=>{const b=await chromium.launch();const p=await(await b.newContext({viewport:{width:1500,height:950}})).newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.goto('file://'+html);await p.waitForFunction(()=>window.__xenProbe&&__xenProbe.bridge.available(),null,{timeout:30000});await p.waitForTimeout(2500);
const geo=()=>p.evaluate(()=>{const c=document.querySelector('.xen-quick-collection.is-right-docked'),l=document.querySelector('.xen-lane-controls');return {rackBottom:Math.round(c.getBoundingClientRect().bottom),laneTop:l&&Math.round(l.getBoundingClientRect().top),maxH:l&&parseInt(l.style.maxHeight),step:l&&parseFloat(l.style.getPropertyValue('--xen-lane-step'))}});
const g0=await geo();
await p.evaluate(()=>{const items=Array.from({length:14},(_,i)=>({kind:'material',id:'fake'+i,name:'Loop '+i}));__xenProbe.quick.replaceItems([...__xenProbe.quick.getItems(),...items])});await p.waitForTimeout(1200);
const g1=await geo();assert(g1.rackBottom>g0.rackBottom+200,'a long list makes the rack taller');assert(g1.maxH<=64,'the panel is squeezed while the list is long');
await p.evaluate(()=>__xenProbe.meta.saveFromQuickAsNew('Long song',false));await p.waitForTimeout(800);
await p.evaluate(()=>{__xenProbe.quick.replaceItems(__xenProbe.quick.getItems().filter(i=>!String(i.id).startsWith('fake')))});await p.waitForTimeout(1500);
const g2=await geo();
assert(Math.abs(g2.rackBottom-g0.rackBottom)<=2,'the rack shrinks back with the live list although a long saved session exists: '+JSON.stringify([g0,g2]));
assert(g2.laneTop!=null&&Math.abs(g2.laneTop-g0.laneTop)<=2&&g2.maxH>=g0.maxH-2&&g2.step>=g0.step-.5,'the panel is back in place and unsqueezed: '+JSON.stringify([g0,g2]));
assert.deepEqual(errs,[]);console.log('PASS LANE-FOLLOW-01: rack and Volume/Pan/Pitch/Nudge/EQ panel grow with the live list and come back ('+g1.rackBottom+' -> '+g2.rackBottom+' px)');await b.close()})().catch(e=>{console.error(e);process.exit(1)});
