/* Probe only (not shipped): THUNDER-Q01 Q switch in the real app (default OFF, toggles, no page errors). */
const {chromium}=require('playwright');const path=require('path');
(async()=>{const b=await chromium.launch({args:['--autoplay-policy=no-user-gesture-required']});const p=await (await b.newContext({viewport:{width:1600,height:1000}})).newPage();
const errors=[];p.on('pageerror',e=>errors.push(String(e).slice(0,200)));
await p.goto('file://'+path.resolve(process.argv[2]||path.join(__dirname,'../../index.html')));await p.waitForTimeout(7000);
const q=p.locator('button[aria-label="Quantize Gestural Attack"]');const n=await q.count();const out={buttons:n};
if(n){const vis=await q.first().isVisible();out.visible=vis;out.before=await q.first().getAttribute('aria-checked');out.text=await q.first().innerText();out.cls=await q.first().getAttribute('class');
 if(vis){await q.first().click();await p.waitForTimeout(300);out.after=await q.first().getAttribute('aria-checked');await q.first().click();out.back=await q.first().getAttribute('aria-checked');
  out.neighbours=await p.evaluate(()=>[...document.querySelector('button[aria-label="Quantize Gestural Attack"]').parentElement.children].map(c=>c.innerText.trim()));
  await p.setViewportSize({width:390,height:800});await p.waitForTimeout(400);out.mobileOverflow=await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1)}}
console.log(JSON.stringify({...out,errors}));await b.close()})();
