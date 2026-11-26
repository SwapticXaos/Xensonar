'use strict';
// HOLO-TITLE-01 (real app, Room III Nodal Center): the title of the Art Installation ignites like a hologram ("Hologram Ignition" of the header design variations):
// the text exists ONCE (no duplicated text nodes), Michroma is embedded and loaded (offline), the ignition animations run and settle to the calm line,
// Sound Design keeps its plain title, and with prefers-reduced-motion there is no animation.
// Usage: node tests/e2e/holo_title.cjs dist/XenSonar_PROBE.html
const {chromium}=require('playwright');const assert=require('node:assert/strict');const path=require('node:path');
const html=path.resolve(process.argv[2]||'dist/XenSonar_PROBE.html');
(async()=>{
 const b=await chromium.launch();const errors=[];
 const open=async opts=>{const p=await(await b.newContext({viewport:{width:1600,height:1000},...opts})).newPage();p.on('pageerror',e=>errors.push(e.message));await p.goto('file://'+html);await p.waitForTimeout(3500);await p.getByRole('button',{name:'Power'}).click().catch(()=>{});await p.waitForTimeout(2500);
  await p.evaluate(()=>[...document.querySelectorAll('header button')].find(b=>/NODAL CENTER/.test(b.innerText)).click());await p.waitForTimeout(3500);return p};
 const p=await open({});
 await p.getByRole('button',{name:'Sound Design'}).first().click();await p.waitForTimeout(500);
 const plain=await p.evaluate(()=>{const h=document.querySelector('.nd-heading-copy>h2');return {cls:h.className,text:h.textContent,holo:!!h.querySelector('.xen-holo')}});
 assert.equal(plain.holo,false,'Sound Design keeps its plain title: '+JSON.stringify(plain));assert.equal(plain.text,'Sound Design');
 await p.getByRole('button',{name:'Art Installation'}).first().click();await p.waitForTimeout(250);
 const mid=await p.evaluate(()=>{const m=document.querySelector('.xen-holo-main'),cs=getComputedStyle(m),beam=getComputedStyle(document.querySelector('.xen-holo-beam'));
  return {anims:m.getAnimations().map(a=>a.animationName).sort(),pseudo:[...document.getAnimations()].map(a=>a.animationName).filter(n=>/xenHolo(Cyan|Gold)/.test(n)).length,beamAnim:getComputedStyle(document.querySelector('.xen-holo-beam')).animationName,opacity:cs.opacity}});
 assert.deepEqual(mid.anims,['xenHoloBright','xenHoloOpacity','xenHoloScale'],'the ignition animations run on the title: '+JSON.stringify(mid));assert.equal(mid.pseudo,4,'the cyan and gold layers run (2 animations each)');assert.equal(mid.beamAnim,'xenHoloBeam');
 await p.waitForTimeout(1600);
 const end=await p.evaluate(()=>{const h=document.querySelector('.nd-heading-copy>h2'),m=document.querySelector('.xen-holo-main'),cs=getComputedStyle(m);const r=h.getBoundingClientRect();
  return {text:h.textContent,count:(document.body.innerText.match(/art installation/gi)||[]).length,opacity:cs.opacity,filter:cs.filter,transform:cs.transform,font:getComputedStyle(h).fontFamily.split(',')[0],fontOk:document.fonts.check('16px XenMichroma'),w:Math.round(r.width),left:Math.round(r.left),top:Math.round(r.top),dataText:m.dataset.text,running:document.getAnimations().filter(a=>/xenHolo/.test(a.animationName)&&a.playState==='running').length}});
 assert.equal(end.text,'Art Installation','the text exists once as one text node: '+JSON.stringify(end));assert.equal(end.dataText,'Art Installation');assert.equal(end.font,'XenMichroma');assert(end.fontOk,'Michroma is embedded and loaded (no network needed)');
 assert.equal(end.opacity,'1');assert(/^(none|brightness\(1\))$/.test(end.filter),'settled brightness: '+end.filter);assert(end.transform==='none'||/matrix\(1, 0, 0, 1, 0, 0\)/.test(end.transform),'settled scale: '+end.transform);assert.equal(end.running,0,'the ignition has finished and stays still');
 assert(end.left>0&&end.left<400&&end.top<260,'the title sits top left in the head trapezoid: '+end.left+','+end.top);
 // the title is still plain text for readers
 assert.equal(await p.locator('.nd-heading-copy>h2').getAttribute('aria-hidden'),null);
 // reduced motion: no animation at all
 const q=await open({reducedMotion:'reduce'});const rm=await q.evaluate(()=>({n:document.getAnimations().filter(a=>/xenHolo/.test(a.animationName)).length,op:getComputedStyle(document.querySelector('.xen-holo-main')).opacity}));
 assert.equal(rm.n,0,'prefers-reduced-motion: no animation');assert.equal(rm.op,'1');
 assert.deepEqual(errors,[]);console.log('PASS HOLO-TITLE-01 · ignition plays (3 title + 4 colour-layer animations + beam), settles to a calm Michroma line · '+end.w+' px wide at '+end.left+','+end.top+' · reduced motion: static');await b.close();
})().catch(e=>{console.error(e);process.exit(1)});
