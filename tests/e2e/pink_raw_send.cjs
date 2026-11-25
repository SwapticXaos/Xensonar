'use strict';
// PINK-RAW-01 (real app): Spectral Forge · Import Audio · "Send as Pink Track" → Melodic Loop.
// Checks what the user sees: the pink import track exists, its notes are PAINTED in the Melodic Loop grid (not only in the navigator),
// it sounds, and a second send asks for a colour and gets its own track.
// PINK-STACK-01 / PINK-REVEAL-01: first send on the middle pitch line, each further send one grid step lower with its own colour (colour chooser),
// and a zoomed grid scrolls to the new track. Usage: node tests/e2e/pink_raw_send.cjs dist/XenSonar_PROBE.html
const {chromium}=require('playwright');const path=require('node:path'),fs=require('node:fs'),os=require('node:os');
const {meterMusic,SR}=require('../helpers/meter_synth.cjs'),{wav}=require('../helpers/analysis_synth.cjs');
const html=path.resolve(process.argv[2]||'dist/XenSonar_PROBE.html'),dir=fs.mkdtempSync(path.join(os.tmpdir(),'xen-pink-'));
const file=path.join(dir,'m.wav');fs.writeFileSync(file,wav(meterMusic({bpm:120,S:4,dur:12}),SR));
(async()=>{
 const b=await chromium.launch({args:['--autoplay-policy=no-user-gesture-required']});const p=await(await b.newContext({viewport:{width:1500,height:1000}})).newPage();
 const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('console',m=>{if(m.type()==='error')errs.push('console: '+m.text().slice(0,200))});
 await p.goto('file://'+html);await p.waitForTimeout(3500);await p.getByRole('button',{name:'Power'}).click();await p.waitForTimeout(2500);
 await p.evaluate(()=>[...document.querySelectorAll('header button')].find(b=>/MATERIAL FORGE/.test(b.innerText)).click());await p.waitForTimeout(2000);
 const E=c=>p.evaluate(x=>window.__xenProbe.draw.evalInBundle(x),c);
 const send=async()=>{await p.getByText('Import Audio').first().click();await p.waitForTimeout(2000);
  await p.locator('input[type=file][accept^="audio/"]').first().setInputFiles(file);await p.getByRole('button',{name:'Wave Editor'}).first().waitFor({timeout:60000});await p.waitForTimeout(1500);
  const btn=p.getByRole('button',{name:/Send as Pink Track/}).first();await btn.scrollIntoViewIfNeeded();await btn.click();await p.waitForTimeout(5000)};
 const comp=async()=>JSON.parse(await E(`(()=>{const c=EQ()?.loopComposer;if(!c)return JSON.stringify(null);
  const notes=c.notes||[],byClass={};for(const n of notes)byClass[n.noteClass||'-']=(byClass[n.noteClass||'-']||0)+1;
  const mb=notes.filter(n=>n.noteClass==='material-base').map(n=>({ch:n.channelIndex,start:n.startUnit,dur:n.durationUnits,track:n.trackId,hz:n.hz,anchor:n.rawAnchor??n.anchorHz}));const L=c.pitchLines||[],t=Math.max(1,L.length),nv=Math.max(8,Math.min(t,Math.round(t/Math.max(1,c.zoomY||1)))),r=Math.max(0,t-nv),a=Math.round(Math.max(0,Math.min(1,c.scrollY||0))*r);
  return JSON.stringify({win:[a,a+nv],mb,lines:L.length,lineHz:[L[0]&&L[0].hz,L[L.length-1]&&L[L.length-1].hz],zoomY:c.zoomY,scrollY:c.scrollY,notes:notes.length,byClass,tracks:(c.importTracks||c.tracks||[]).map(t=>({id:t.id,color:t.color,family:t.family,hidden:t.hidden,muted:t.muted})),keys:Object.keys(c).slice(0,60)})})()`));
 if(process.env.BASEHZ){await p.locator('button',{hasText:'MELODIC LOOP'}).first().click();await p.waitForTimeout(3000);
  const hz=p.locator('input').filter({has:p.locator('xpath=.')}).locator('xpath=//input[@value="293.66"]').first();await hz.fill(process.env.BASEHZ);await hz.press('Enter');await p.waitForTimeout(800);
  await p.locator('button',{hasText:'SPECTRALFORGE'}).first().click().catch(async()=>{await p.getByText('SPECTRALFORGE').first().click()});await p.waitForTimeout(2500)}
 const fail=[];const check=(ok,label,info)=>{console.log((ok?'ok   ':'FAIL ')+label+(info?' · '+info:''));if(!ok)fail.push(label)};
 const back=async()=>{await p.evaluate(()=>[...document.querySelectorAll('header button')].find(b=>/MATERIAL FORGE/.test(b.innerText)).click());await p.waitForTimeout(1500);await p.locator('text=SPECTRALFORGE').first().click().catch(()=>{});await p.waitForTimeout(2500)};
 const colorDialog=async()=>{const b=p.getByRole('button',{name:'Import with This Color'});await b.waitFor({timeout:15000});await b.click();await p.waitForTimeout(2500)};
 // 1) first send: one pink track, its block on the MIDDLE pitch line, inside the visible window
 await send();let c=await comp();const mid=Math.floor((c.lines-1)/2);
 check(c.mb.length===1,'send 1: one pink block',JSON.stringify(c.mb));
 check(c.mb[0]&&c.mb[0].ch===mid,'send 1: on the middle line '+mid,'line '+(c.mb[0]&&c.mb[0].ch)+' · '+(c.mb[0]&&c.mb[0].anchor&&c.mb[0].anchor.toFixed(1))+' Hz');
 check(c.mb[0]&&c.mb[0].ch>=c.win[0]&&c.mb[0].ch<c.win[1],'send 1: visible in the grid window',JSON.stringify(c.win));
 // 2) second send: the colour chooser, then its own track one grid step lower, its own colour
 await back();await send();await colorDialog();c=await comp();const t2=c.mb.find(m=>m.track!==c.mb[0].track);
 check(c.mb.length===2&&new Set(c.mb.map(m=>m.track)).size===2,'send 2: second pink track of its own',JSON.stringify(c.mb.map(m=>m.ch)));
 check(t2&&t2.ch===mid+1,'send 2: one grid step lower ('+(mid+1)+')','line '+(t2&&t2.ch));
 check(new Set(c.tracks.filter(t=>/^material-base:/.test(t.id)).map(t=>t.color)).size===2,'send 2: own colour',JSON.stringify(c.tracks.filter(t=>/^material-base:/.test(t.id)).map(t=>t.color)));
 // 3) zoomed grid scrolled to the top: the third track (one more step lower) is scrolled into view
 {const cv=p.locator('canvas').first();await cv.scrollIntoViewIfNeeded();const r=await cv.boundingBox();await p.mouse.move(r.x+r.width*.5,r.y+70);await p.keyboard.down('Shift');
  for(let k=0;k<16;k++){await p.mouse.wheel(0,-120);await p.waitForTimeout(40)}await p.keyboard.up('Shift');await p.waitForTimeout(500);c=await comp();
  check(c.zoomY>1.5&&!(mid+2>=c.win[0]&&mid+2<c.win[1]),'setup: zoomed, line '+(mid+2)+' outside the window','zoomY '+(c.zoomY||0).toFixed(2)+' window '+JSON.stringify(c.win))}
 await back();await send();await colorDialog();c=await comp();const t3=c.mb.find(m=>m.ch===mid+2);
 check(!!t3,'send 3: two grid steps lower ('+(mid+2)+')',JSON.stringify(c.mb.map(m=>m.ch)));
 check(t3&&t3.ch>=c.win[0]&&t3.ch<c.win[1],'send 3: zoomed grid scrolled to the new track','window '+JSON.stringify(c.win)+' zoomY '+c.zoomY);
 if(errs.filter(e=>!/^console:/.test(e)).length)check(false,'no page errors',errs.slice(0,3).join(' | '));
 await b.close();
 if(fail.length){console.log('FAIL PINK-RAW-01 ('+fail.length+')');process.exit(1)}console.log('PASS PINK-RAW-01');
})().catch(e=>{console.error(e);process.exit(1)});
