const {chromium}=require('playwright');const path=require('path');const html=path.resolve(process.argv[2]);
(async()=>{
  const b=await chromium.launch({args:['--autoplay-policy=no-user-gesture-required','--js-flags=--expose-gc']});const p=await b.newPage({viewport:{width:1440,height:900}});
  const perr=[];p.on('pageerror',e=>perr.push(e.message.slice(0,200)));
  await p.addInitScript(()=>{window.__nodes=0;window.__oac=0;const O=window.OfflineAudioContext;window.OfflineAudioContext=class extends O{constructor(...a){super(...a);__oac++}};
    const W=window.AudioWorkletNode;window.__wn=0;window.AudioWorkletNode=class extends W{constructor(...a){super(...a);if(!(a[0] instanceof O))__wn++}};});
  await p.goto('file://'+html);await p.waitForTimeout(4000);
  const c=await p.context().newCDPSession(p);await c.send('HeapProfiler.enable');
  const click=t=>p.evaluate(t=>{const b=[...document.querySelectorAll('button')].find(b=>b.innerText.replace(/\s+/g,' ').includes(t));if(!b)throw Error('no '+t);b.click()},t);
  const snap=async l=>{await c.send('HeapProfiler.collectGarbage');await p.waitForTimeout(300);await c.send('HeapProfiler.collectGarbage');const h=await c.send('Runtime.getHeapUsage');const d=await c.send('Memory.getDOMCounters');
    const x=await p.evaluate(()=>({live:document.querySelectorAll('*').length,wn:__wn,oac:__oac}));
    console.log(l.padEnd(12),'heapMB',(h.usedSize/1e6).toFixed(1),'domNodes(cdp)',d.nodes,'liveElements',x.live,'jsListeners',d.jsEventListeners,'documents',d.documents,'workletNodesCreated',x.wn,'offlineCtx',x.oac)};
  await snap('start');
  for(let i=1;i<=8;i++){
    await p.getByRole('button',{name:'Power'}).click();await p.waitForTimeout(2500);
    for(const r of ['MATERIAL FORGE','NODAL CENTER','MULTITRACK','PSY LAB','LIVE ROOM']){await click(r);await p.waitForTimeout(1800)}
    if(i===1||i%2===0)await snap('cycle '+i);
  }
  console.log('pageerrors',perr);await b.close();
})().catch(e=>{console.error(e);process.exit(1)});
