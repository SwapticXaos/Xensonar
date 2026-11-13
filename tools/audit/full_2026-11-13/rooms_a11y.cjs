const {chromium}=require('playwright');const path=require('path');
const html=path.resolve(process.argv[2]);
const a11y=()=>{
  const vis=e=>{const r=e.getBoundingClientRect();const s=getComputedStyle(e);return r.width>0&&r.height>0&&s.visibility!=='hidden'&&s.display!=='none'};
  const name=e=>(e.getAttribute('aria-label')||e.getAttribute('title')||e.innerText||e.getAttribute('aria-labelledby')||'').trim();
  const btns=[...document.querySelectorAll('button,[role=button]')].filter(vis);
  const unnamed=btns.filter(b=>!name(b));
  const iconOnly=btns.filter(b=>!b.getAttribute('aria-label')&&!b.getAttribute('title')&&!b.getAttribute('aria-labelledby')&&/^[^\p{L}\p{N}]{1,3}$/u.test((b.innerText||'').trim()));
  const small=btns.filter(b=>{const r=b.getBoundingClientRect();return r.width<24||r.height<24});
  const inputs=[...document.querySelectorAll('input:not([type=hidden]),select,textarea')].filter(vis);
  const unl=inputs.filter(i=>!(i.getAttribute('aria-label')||i.getAttribute('aria-labelledby')||i.getAttribute('title')||(i.id&&document.querySelector('label[for="'+CSS.escape(i.id)+'"]'))||i.closest('label')));
  const clickDivs=[...document.querySelectorAll('div[onclick],span[onclick]')].length;
  const canv=[...document.querySelectorAll('canvas')].filter(vis);
  const canvNoName=canv.filter(c=>!c.getAttribute('aria-label')&&!c.getAttribute('role')&&!c.getAttribute('aria-hidden'));
  const tiny=[...document.querySelectorAll('body *')].filter(e=>vis(e)&&e.children.length===0&&(e.innerText||'').trim().length>2&&parseFloat(getComputedStyle(e).fontSize)<10).length;
  const de=[...document.querySelectorAll('button,label,h1,h2,h3,p,span')].filter(vis).map(e=>e.children.length?'':(e.innerText||'')).filter(t=>/\b(und|der|die|das|nicht|oder|für|mit|löschen|speichern|abbrechen|öffnen|schließen)\b/i.test(t)).slice(0,8);
  return {dom:document.querySelectorAll('*').length,buttons:btns.length,unnamed:unnamed.length,unnamedEx:unnamed.slice(0,5).map(b=>b.className.toString().slice(0,60)),iconOnlyNoLabel:iconOnly.length,iconEx:iconOnly.slice(0,6).map(b=>b.innerText.trim()+'|'+b.className.toString().slice(0,40)),smallTargets:small.length,inputs:inputs.length,unlabeledInputs:unl.length,unlEx:unl.slice(0,5).map(i=>i.type+'|'+i.className.toString().slice(0,40)),canvases:canv.length,canvasNoName:canvNoName.length,tinyTextLeaves:tiny,germanSamples:de,landmarks:document.querySelectorAll('main,nav,header,footer,[role=main],[role=navigation]').length,h1:document.querySelectorAll('h1').length};
};
(async()=>{
  const b=await chromium.launch({args:['--autoplay-policy=no-user-gesture-required']});
  const p=await b.newPage({viewport:{width:1440,height:900}});
  const perr=[],con=[];p.on('pageerror',e=>perr.push(e.message.slice(0,200)));p.on('console',m=>{if(m.type()==='error')con.push(m.text().slice(0,200))});
  await p.goto('file://'+html);await p.waitForTimeout(4000);
  const click=t=>p.evaluate(t=>{const b=[...document.querySelectorAll('button')].find(b=>b.innerText.replace(/\s+/g,' ').includes(t));if(!b)throw Error('no '+t);b.click()},t);
  const out={};
  out['LIVE ROOM']=await p.evaluate(a11y);
  for(const r of ['MATERIAL FORGE','NODAL CENTER','MULTITRACK','PSY LAB','LIVE ROOM']){
    const t0=Date.now();await click(r);await p.waitForTimeout(5000);
    const key=r==='LIVE ROOM'?'LIVE ROOM (return)':r;
    out[key]=await p.evaluate(a11y);out[key].heapMB=await p.evaluate(()=>Math.round(performance.memory.usedJSHeapSize/1e6));
    await p.screenshot({path:path.join(require('os').tmpdir(),'xen_room_'+r.replace(/\s+/g,'_')+'.png')});
  }
  // keyboard: Tab x 12, where does focus go, is focus visible
  await p.keyboard.press('Tab');const foc=[];for(let i=0;i<10;i++){foc.push(await p.evaluate(()=>{const e=document.activeElement;const s=getComputedStyle(e);return e.tagName+'.'+String(e.className).slice(0,30)+' outline='+s.outlineStyle+'/'+s.outlineWidth+' shadow='+(s.boxShadow!=='none')}));await p.keyboard.press('Tab')}
  // narrow viewport
  await p.setViewportSize({width:390,height:844});await p.waitForTimeout(1500);
  const mob=await p.evaluate(()=>({scrollW:document.documentElement.scrollWidth,clientW:document.documentElement.clientWidth,bodyOverflowX:getComputedStyle(document.body).overflowX}));
  await p.screenshot({path:path.join(require('os').tmpdir(),'xen_mobile.png')});
  await p.setViewportSize({width:1024,height:768});await p.waitForTimeout(1000);
  const tab=await p.evaluate(()=>({scrollW:document.documentElement.scrollWidth,clientW:document.documentElement.clientWidth}));
  console.log(JSON.stringify({out,foc,mob,tab,perr,con},null,1));
  await b.close();
})().catch(e=>{console.error(e);process.exit(1)});
