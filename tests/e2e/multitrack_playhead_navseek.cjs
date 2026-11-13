'use strict';
// MT-PLAYHEAD + MT-NAV-SEEK (real app, Room IV): the playhead line spans the whole scrollable height of the tracks (also with many tracks / scrolled), and a click in the timeline navigator
// while the arrangement plays moves the play position there and keeps playing. Usage: node tests/e2e/multitrack_playhead_navseek.cjs dist/XenSonar_PROBE.html
const {chromium}=require('playwright');const assert=require('node:assert/strict');const path=require('node:path');
const html=path.resolve(process.argv[2]||'dist/XenSonar_PROBE.html');
(async()=>{
  const b=await chromium.launch({args:['--autoplay-policy=no-user-gesture-required']});const p=await(await b.newContext({viewport:{width:1500,height:900}})).newPage();const errors=[];p.on('pageerror',e=>errors.push(e.message));
  await p.goto('file://'+html);await p.waitForTimeout(3500);
  await p.evaluate(()=>{[...document.querySelectorAll('button')].find(x=>/MULTITRACK/.test(x.innerText)&&x.offsetParent).click()});
  await p.waitForSelector('[data-xmt-tempo]',{timeout:30000});await p.waitForTimeout(800);
  for(let i=0;i<14;i++){await p.getByRole('button',{name:'+ Track'}).click();await p.waitForTimeout(60)}
  const sc=p.locator('#xmt-tracks');assert.equal(await sc.count(),1,'the track area has the id xmt-tracks');
  const dims=()=>sc.evaluate(el=>({ch:el.clientHeight,sh:el.scrollHeight,ph:document.querySelector('.xmt .ph').getBoundingClientRect().height,top:el.scrollTop}));
  const d0=await dims();assert(d0.sh>d0.ch+50,'there are more tracks than fit on the screen: '+JSON.stringify(d0));
  await p.getByRole('button',{name:/Play from cursor/}).click();await p.waitForTimeout(900);
  const d1=await dims();assert(Math.abs(d1.ph-d1.sh)<3,'the playhead spans the whole scrollable height: ph '+d1.ph+' vs '+d1.sh+' (visible '+d1.ch+')');
  await sc.evaluate(el=>{el.scrollTop=el.scrollHeight});await p.waitForTimeout(300);const d2=await dims();assert(d2.top>0&&Math.abs(d2.ph-d2.sh)<3,'also scrolled to the bottom: '+JSON.stringify(d2));
  // ---- navigator click while playing ----
  const label=()=>p.locator('.xmt .muted',{hasText:/^Cursor /}).first().innerText();
  const rail=p.locator('.rail.h');await rail.scrollIntoViewIfNeeded();const rb=await rail.boundingBox();
  await p.mouse.click(rb.x+rb.width*.75,rb.y+rb.height/2);await p.waitForTimeout(900);
  const c1=await label();const bar=Number((c1.match(/Cursor (\d+)\./)||[])[1]);assert(bar>=10,'the click at 75 % of the navigator moved the play position far to the right: '+c1);
  const x1=await p.locator('.xmt .ph').evaluate(e=>parseFloat(e.style.left));await p.waitForTimeout(700);const x2=await p.locator('.xmt .ph').evaluate(e=>parseFloat(e.style.left));
  assert(x2>x1,'it keeps playing from there (playhead moves on): '+x1+' → '+x2);
  await p.getByRole('button',{name:/Stop/}).first().click();await p.waitForTimeout(400);
  // not playing: a click only scrolls the view (as before), the cursor stays
  const before=await label();await p.mouse.click(rb.x+rb.width*.2,rb.y+rb.height/2);await p.waitForTimeout(400);assert.equal(await label(),before,'stopped: the click does not move the cursor');
  assert.deepEqual(errors,[]);console.log('PASS MT-PLAYHEAD + MT-NAV-SEEK playhead height '+d1.ph+'/'+d1.sh+', navigator seek → '+c1);await b.close();
})().catch(e=>{console.error(e);process.exit(1)});
