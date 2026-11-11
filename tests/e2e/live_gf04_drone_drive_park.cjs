'use strict';
// LIVE-GF-04 (real app): the drone drive wet chain (4x shaper) is only connected while the drive is on.
// Usage: node tests/e2e/live_gf04_drone_drive_park.cjs dist/XenSonar_PROBE.html
const {chromium}=require('playwright');const assert=require('node:assert/strict');const path=require('node:path');
const html=path.resolve(process.argv[2]||'dist/XenSonar_PROBE.html');
(async()=>{
  const b=await chromium.launch({args:['--autoplay-policy=no-user-gesture-required']});const p=await b.newPage({viewport:{width:1440,height:900}});
  const errors=[];p.on('pageerror',e=>errors.push(e.message));
  await p.addInitScript(()=>{const S=window.__dd={shapers:[],edges:new Map()};
    const cw=BaseAudioContext.prototype.createWaveShaper;BaseAudioContext.prototype.createWaveShaper=function(){const n=cw.call(this);if(this instanceof AudioContext)S.shapers.push(n);return n};
    const oc=AudioNode.prototype.connect,od=AudioNode.prototype.disconnect;
    AudioNode.prototype.connect=function(d){if(d instanceof AudioNode){let s=S.edges.get(this);if(!s)S.edges.set(this,s=new Set());s.add(d)}return oc.apply(this,arguments)};
    AudioNode.prototype.disconnect=function(d){const s=S.edges.get(this);if(s){if(d instanceof AudioNode)s.delete(d);else if(d===undefined)s.clear()}return od.apply(this,arguments)};
    S.reaches=()=>{const all=S.shapers.filter(n=>n.curve&&n.curve.length===8192&&n.oversample==='4x');if(!all.length)return null;/* first created = drone drive insert (built with the drone graph); the lazily created Transient Drive device is a separate owner */return all.slice(0,1).some(sh=>{const dest=sh.context.destination;const seen=new Set([sh]),q=[sh];while(q.length){const n=q.pop();if(n===dest)return true;for(const d of S.edges.get(n)||[])if(!seen.has(d)){seen.add(d);q.push(d)}}return false})}});
  await p.goto('file://'+html);await p.waitForTimeout(3500);await p.getByRole('button',{name:'Power'}).click();await p.waitForTimeout(2500);
  const reaches=()=>p.evaluate(()=>__dd.reaches());
  assert.equal(await reaches(),false,'default (Refucktor preset): drive wet chain is not rendered');
  const choose=v=>p.evaluate(v=>{const s=[...document.querySelectorAll('select')].find(s=>s.getAttribute('aria-label')==='Drone sound');Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype,'value').set.call(s,v);s.dispatchEvent(new Event('change',{bubbles:true}))},v);
  await choose('warm_pad');await p.waitForTimeout(1200);
  assert.equal(await p.evaluate(()=>{const c=document.querySelector('input[aria-label="Drone On"]');if(!c.checked)c.click();return true}),true);await p.waitForTimeout(600);
  assert.equal(await reaches(),false,'drone on, drive off: wet chain still parked');
  const drive=async on=>{const ok=await p.evaluate(on=>{const h=[...document.querySelectorAll('label')].find(l=>l.innerText.trim()==='Drive Insert');const c=h&&h.parentElement.querySelector('input[type=checkbox]');if(!c)return'no-label';if(c.checked!==on)c.click();return c.checked},on);return ok};
  let state=await drive(true);
  if(state==='no-label'){await p.evaluate(()=>{const b=[...document.querySelectorAll('button')].find(b=>/Drone Workbench/.test(b.innerText));b&&b.click()});await p.waitForTimeout(800);state=await drive(true)}
  assert.equal(state,true,'drone drive checkbox found and switched on');
  await p.waitForTimeout(600);if(process.env.DEBUG)console.log(await p.evaluate(()=>({sh:__dd.shapers.map(n=>[n.curve&&n.curve.length,n.oversample,[...(__dd.edges.get(n)||[])].length]),chain:(()=>{let n=__dd.shapers.find(n=>n.curve&&n.curve.length===8192),out=[];for(let i=0;i<12&&n;i++){out.push(n.constructor.name+(n.gain?':'+n.gain.value.toFixed(3):''));n=[...(__dd.edges.get(n)||[])][0]}return out.join('>')})(),all:__dd.shapers.filter(n=>n.curve&&n.curve.length===8192).length,chk:[...document.querySelectorAll('label')].find(l=>l.innerText.trim()==='Drive Insert').parentElement.innerText})));
  assert.equal(await reaches(),true,'drive on: wet chain reaches the output');
  assert.equal(await drive(false),false);await p.waitForTimeout(1800);
  if(process.env.DEBUG)console.log('OFF',await p.evaluate(()=>__dd.shapers.filter(n=>n.curve&&n.curve.length===8192).map(sh=>{let n=sh,out=[];for(let i=0;i<9&&n;i++){out.push(n.constructor.name.replace('Node','')+(n.gain?':'+n.gain.value.toFixed(4):''));n=[...(__dd.edges.get(n)||[])][0]}return out.join('>')})));
  assert.equal(await reaches(),false,'drive off: wet chain parked after its fade-out');
  assert.equal(await drive(true),true);await p.waitForTimeout(400);assert.equal(await reaches(),true,'drive on again: reconnected');
  assert.deepEqual(errors,[]);console.log('PASS LIVE-GF-04 drone drive wet chain connected only while the drive is on');
  await b.close();
})().catch(e=>{console.error(e);process.exit(1)});
