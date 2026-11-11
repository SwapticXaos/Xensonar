#!/usr/bin/env node
// TEST ONLY. How long do typical live actions block the main thread while the Live Room plays,
// and does the rhythm scheduler drop steps (stale) or the master go silent because of it?
// Usage: node tools/probes/live_ui_stall_probe.js /abs/index.html
const {chromium}=require('playwright');const fs=require('fs');const path=require('path');const http=require('http');
const HTML=path.resolve(process.argv[2]||'index.html');
(async()=>{
  const srv=http.createServer((q,r)=>{r.writeHead(200,{'content-type':'text/html; charset=utf-8'});fs.createReadStream(HTML).pipe(r)});await new Promise(k=>srv.listen(0,'127.0.0.1',k));
  const b=await chromium.launch({args:['--autoplay-policy=no-user-gesture-required']});const p=await b.newPage({viewport:{width:1440,height:900}});
  await p.addInitScript(()=>{const S=window.__stall={tasks:[],gaps:[],last:performance.now(),label:''};
    try{new PerformanceObserver(l=>{for(const e of l.getEntries())S.tasks.push({label:S.label,d:Math.round(e.duration)})}).observe({entryTypes:['longtask']})}catch(e){}
    // 5 ms heartbeat: the largest gap is the longest main-thread block (also below the 50 ms long-task limit)
    setInterval(()=>{const n=performance.now(),g=n-S.last;S.last=n;if(g>30)S.gaps.push({label:S.label,d:Math.round(g)})},5);
    const st=window.setTimeout;});
  const errs=[];p.on('pageerror',e=>errs.push(String(e.message).slice(0,160)));
  await p.goto('http://127.0.0.1:'+srv.address().port+'/');await p.waitForTimeout(4000);
  await p.getByRole('button',{name:'Power'}).click();await p.waitForTimeout(4000);
  const mark=l=>p.evaluate(l=>{__stall.label=l},l);
  const btn=async(label,text,nth=0)=>{await mark(label);const ok=await p.evaluate(([text,nth])=>{const bs=[...document.querySelectorAll('button')].filter(b=>b.offsetParent&&b.innerText.replace(/\s+/g,' ').trim()===text);const el=bs[nth];if(!el)return false;el.click();return true},[text,nth]);if(!ok)console.log('  (no button "'+text+'")');await p.waitForTimeout(1500)};
  const sel=async(label,aria,value)=>{await mark(label);const ok=await p.evaluate(([aria,value])=>{const s=[...document.querySelectorAll('select')].find(s=>(s.getAttribute('aria-label')||s.closest('label,div')?.innerText||'').replace(/\s+/g,' ').startsWith(aria));if(!s)return false;Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype,'value').set.call(s,value);s.dispatchEvent(new Event('change',{bubbles:true}));return true},[aria,value]);if(!ok)console.log('  (no select "'+aria+'")');await p.waitForTimeout(1500)};
  await mark('idle');await p.waitForTimeout(3000);
  for(const t of['🥁 2','🥁 3','🥁 1','🎸 2','🎸 3','🎸 1','🪜 2','🪜 3','🪜 1'])await btn('slot '+t,t);
  await btn('Randomize','Randomize');await btn('Randomize','Randomize');
  await btn('Particles All on','All on');await btn('Particles All off','All off');
  await sel('Grid System 22edo','Grid System','22edo');await sel('Grid System 12edo','Grid System','12edo');
  await sel('Grid Mode dorian','Grid Mode','dorian');await sel('Particle System bp','Particle System','bp');await sel('Particle System ji','Particle System','ji');
  await sel('Drone warm_pad','Drone sound','warm_pad');await sel('Drone dark_sub','Drone sound','dark_sub');
  for(const k of['Glass Harp','Organ Breath','Standard'])await btn('Entrophon '+k,k);
  await btn('Session >','>');await btn('Session <','<');
  await mark('keys');for(const k of'1234567890qwertzuiop'){await p.keyboard.down(k);await p.waitForTimeout(90);await p.keyboard.up(k)}await p.waitForTimeout(800);
  await mark('slider drag');{const h=await p.evaluateHandle(()=>[...document.querySelectorAll('input[type=range]')].filter(i=>i.offsetParent)[0]);const bx=await h.boundingBox();if(bx){await p.mouse.move(bx.x+bx.width*.3,bx.y+bx.height/2);await p.mouse.down();for(let i=0;i<60;i++){await p.mouse.move(bx.x+bx.width*(.3+.4*Math.sin(i/9)),bx.y+bx.height/2);await p.waitForTimeout(16)}await p.mouse.up()}}
  await mark('end');await p.waitForTimeout(1000);
  const r=await p.evaluate(()=>({tasks:__stall.tasks,gaps:__stall.gaps}));
  const by=new Map();for(const g of r.gaps){const o=by.get(g.label)||{maxGap:0,n:0,long:0};o.n++;o.maxGap=Math.max(o.maxGap,g.d);by.set(g.label,o)}
  for(const t of r.tasks){const o=by.get(t.label)||{maxGap:0,n:0,long:0};o.long=Math.max(o.long,t.d);by.set(t.label,o)}
  console.log('action'.padEnd(28),'longest block ms','  long task ms');
  for(const[k,o]of[...by].sort((a,b)=>b[1].maxGap-a[1].maxGap))console.log(k.padEnd(28),String(o.maxGap).padStart(8),String(o.long).padStart(14));
  if(errs.length)console.log('ERRORS',[...new Set(errs)]);
  await b.close();process.exit(0)})();
