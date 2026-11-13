// Cold-start runtime audit of the SHIPPED index.html (no probe). Read-only.
const {chromium}=require('playwright');const path=require('path');
const html=path.resolve(process.argv[2]);
(async()=>{
  const b=await chromium.launch({args:['--autoplay-policy=no-user-gesture-required']});
  const ctx=await b.newContext({viewport:{width:1440,height:900}});
  const p=await ctx.newPage();
  const con=[],perr=[],req=[],ws=[];
  p.on('console',m=>{if(['error','warning'].includes(m.type()))con.push(m.type()+': '+m.text().slice(0,200))});
  p.on('pageerror',e=>perr.push(e.message.slice(0,300)));
  p.on('request',r=>{if(!r.url().startsWith('file://')||r.url()!=='file://'+html)req.push(r.method()+' '+r.url().slice(0,150))});
  p.on('websocket',w=>ws.push(w.url()));
  await p.addInitScript(()=>{
    window.__aud={long:[],ac:0,oac:0,timers:{si:0,st:0},lsw:0,lsBytes:0,lsr:0};
    try{new PerformanceObserver(l=>{for(const e of l.getEntries())__aud.long.push([Math.round(e.startTime),Math.round(e.duration)])}).observe({entryTypes:['longtask']})}catch{}
    const AC=window.AudioContext;window.AudioContext=class extends AC{constructor(...a){super(...a);__aud.ac++;(__aud.ctxs=__aud.ctxs||[]).push(this)}};
    const si=window.setInterval;window.setInterval=function(f,t,...a){__aud.timers.si++;(__aud.siList=__aud.siList||[]).push(t);return si.call(this,f,t,...a)};
    const ss=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){__aud.lsw++;__aud.lsBytes+=String(v).length;return ss.call(this,k,v)};
    const sg=Storage.prototype.getItem;Storage.prototype.getItem=function(k){__aud.lsr++;return sg.call(this,k)};
  });
  const t0=Date.now();
  await p.goto('file://'+html,{waitUntil:'load'});
  const tLoad=Date.now()-t0;
  await p.waitForTimeout(6000);
  const info=await p.evaluate(async()=>{
    const nav=performance.getEntriesByType('navigation')[0];
    const paints=performance.getEntriesByType('paint').map(e=>[e.name,Math.round(e.startTime)]);
    const ls={};let lsTotal=0;for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);ls[k]=localStorage.getItem(k).length;lsTotal+=ls[k]}
    let dbs=[];try{dbs=(await indexedDB.databases()).map(d=>d.name+'@'+d.version)}catch{}
    return {nav:{dcl:Math.round(nav.domContentLoadedEventEnd),load:Math.round(nav.loadEventEnd),domInteractive:Math.round(nav.domInteractive)},paints,
      long:__aud.long,ac:__aud.ac,ctxStates:(__aud.ctxs||[]).map(c=>c.state+'@'+c.sampleRate),siCount:__aud.timers.si,siList:__aud.siList,lsw:__aud.lsw,lsBytes:__aud.lsBytes,lsr:__aud.lsr,
      dom:document.querySelectorAll('*').length,buttons:document.querySelectorAll('button').length,inputs:document.querySelectorAll('input,select,textarea').length,canvases:document.querySelectorAll('canvas').length,
      heap:performance.memory?Math.round(performance.memory.usedJSHeapSize/1e6):null,ls,lsTotal,dbs,title:document.title,lang:document.documentElement.lang,
      meta:[...document.querySelectorAll('meta')].map(m=>m.outerHTML.slice(0,160)),
      links:[...document.querySelectorAll('link')].map(m=>m.outerHTML.slice(0,160)),
      text:document.body.innerText.slice(0,600)};
  });
  console.log(JSON.stringify({tLoad,info,con,perr,req,ws},null,1));
  await p.screenshot({path:path.join(require('os').tmpdir(),'xen_cold.png')});
  await b.close();
})().catch(e=>{console.error(e);process.exit(1)});
