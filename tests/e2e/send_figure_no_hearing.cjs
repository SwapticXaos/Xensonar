'use strict';
// SEND-FIG-01 (real app, Spectral Forge): sending a painted Carrier figure to the Melodic Loop (Scattered / Fretless Field / Monotone)
// does not depend on the listening machine (Hörweise). Only Raw Audio does. Usage: node tests/e2e/send_figure_no_hearing.cjs [html]
const {chromium}=require('playwright');const assert=require('node:assert/strict');const path=require('node:path');
const html=path.resolve(process.argv[2]||'dist/XenSonar_PROBE.html');
(async()=>{
 const b=await chromium.launch({args:['--autoplay-policy=no-user-gesture-required']});const p=await(await b.newContext({viewport:{width:1440,height:1000}})).newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
 await p.goto('file://'+html);await p.waitForTimeout(4000);
 const clkX=t=>p.evaluate(t=>{const n=x=>(x||'').replace(/\s+/g,' ').trim();const b=[...document.querySelectorAll('button')].find(b=>b.offsetParent&&(n(b.innerText)===t||n(b.innerText).endsWith(' '+t)));if(b){b.click();return true}return false},t);
 const clkS=t=>p.evaluate(t=>{const n=x=>(x||'').replace(/\s+/g,' ').trim();const b=[...document.querySelectorAll('button')].find(b=>b.offsetParent&&n(b.innerText).startsWith(t));if(b){b.scrollIntoView();b.click()}return !!b},t);
 await clkX('MATERIAL FORGE');await p.waitForTimeout(3000);await clkS('SPECTRALFORGE');await p.waitForTimeout(4000);
 const cv=p.locator('[data-forge-carrier-canvas]');await cv.scrollIntoViewIfNeeded();const bb=await cv.boundingBox();
 for(let k=0;k<3;k++){await p.mouse.move(bb.x+bb.width*.1,bb.y+bb.height*(.3+k*.15));await p.mouse.down();for(let i=1;i<=40;i++)await p.mouse.move(bb.x+bb.width*(.1+.8*i/40),bb.y+bb.height*(.3+k*.15+.08*Math.sin(i/5)),{steps:1});await p.mouse.up()}
 await p.waitForTimeout(1500);
 const E=c=>p.evaluate(x=>window.__xenProbe.draw.evalInBundle(x),c);
 // availability for every listening machine: only the figure decides
 const out=JSON.parse(await E(`(()=>{const st=pe.getState(),out={};for(const m of [null,'gaia-terrain-carrier','emilia-nodal-carrier','raw-darkpsy-oscillator','branch-a-line-traffic','branch-b573-synth-window','branch-c-interval-body']){pe.setState({carrierIntegralSelection:{...(st.carrierIntegralSelection||{}),machineId:m}});const a=__xenSfmlDirectAvailability(pe.getState(),null);out[m]=[a.scattered.ready,a['last-hearing'].ready,a.monotone.ready]}return JSON.stringify(out)})()`));
 for(const [m,v] of Object.entries(out))assert.deepEqual(v,[true,true,true],'Scattered, Fretless Field and Monotone are available with hearing '+m+': '+JSON.stringify(v));
 // a real one-click send with a hearing that has no Fretless timbre (Gahjer): it must be accepted and not touch the hearing
 await E(`pe.setState({carrierIntegralSelection:{...(pe.getState().carrierIntegralSelection||{}),machineId:'gaia-terrain-carrier'}})`);
 await p.waitForTimeout(500);
 await p.locator('[data-f318-export-target=pink]').scrollIntoViewIfNeeded();
 for(const mode of ['last-hearing','scattered']){
  await p.locator('[data-f318-export-target=pink]').click();await p.waitForTimeout(500);
  const choice=p.locator('[data-forge-send-choice=pink-'+mode+']');assert.equal(await choice.isDisabled(),false,mode+' is enabled with the Gahjer hearing');
  await choice.click();await p.waitForTimeout(6000);
  const fb=await p.evaluate(()=>document.querySelector('[data-forge-send-feedback]')?.getAttribute('data-forge-send-feedback')||'');
  const txt=await p.evaluate(()=>document.querySelector('[data-forge-send-feedback]')?.innerText||document.body.innerText.slice(0,0));
  assert.notEqual(fb,'failed',mode+' send did not fail: '+txt);
  await p.waitForSelector('[data-ml-noteclip=copy]',{timeout:20000});await p.waitForTimeout(2500);
  const said=await p.evaluate(()=>document.body.innerText);
  assert.match(said,/eingesetzt|imported|Scattered|Fretless|Carrier/i,mode+': the Melodic Loop reports the arrived figure');
  // back to the Forge for the next round (the send opens the Melodic Loop)
  if(mode==='last-hearing'){await clkX('MATERIAL FORGE');await p.waitForTimeout(2500);await clkS('SPECTRALFORGE');await p.waitForTimeout(4000)}
 }
 assert.deepEqual(errs,[]);console.log('PASS SEND-FIG-01 figure sends are independent of the hearing',JSON.stringify(out));await b.close();
})().catch(e=>{console.error(e);process.exit(1)});
