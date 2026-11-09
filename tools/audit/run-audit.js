const {chromium}=require('playwright');const fs=require('fs');
const HTML=process.argv[2];const lines=fs.readFileSync(HTML,'utf8').split('\n');
const snip=s=>{const [l,c]=s.split(':').map(Number);const t=lines[l-1]||'';return t.slice(Math.max(0,c-70),c+50).replace(/\s+/g,' ')};
(async()=>{const b=await chromium.launch({args:['--autoplay-policy=no-user-gesture-required']});const p=await b.newPage({viewport:{width:1440,height:900}});
await p.addInitScript({path:__dirname+'/probe-init.js'});
const errs=[];p.on('pageerror',e=>errs.push(e.message.slice(0,150)));
await p.goto('file://'+HTML);await p.waitForTimeout(4000);
const c=await p.context().newCDPSession(p);await c.send('Profiler.enable');await c.send('Performance.enable');
const click=t=>p.evaluate(t=>{const b=[...document.querySelectorAll('button')].find(b=>b.innerText.replace(/\s+/g,' ').includes(t));if(!b)throw Error('no '+t);b.click()},t);
async function windowMeasure(label,ms){
 const s0=await p.evaluate(()=>{const s=__audit.snapshot();return JSON.stringify({t:s.t,timeouts:[...s.timeouts],raf:[...s.raf],post:[...s.post],nodes:[...s.nodes],ls:[...s.ls]})});
 const m0=(await c.send('Performance.getMetrics')).metrics.reduce((o,x)=>(o[x.name]=x.value,o),{});
 await p.waitForTimeout(ms);
 const m1=(await c.send('Performance.getMetrics')).metrics.reduce((o,x)=>(o[x.name]=x.value,o),{});
 const s1=await p.evaluate(()=>{const s=__audit.snapshot();return JSON.stringify({t:s.t,timeouts:[...s.timeouts],raf:[...s.raf],post:[...s.post],nodes:[...s.nodes],ls:[...s.ls]})});
 const a=JSON.parse(s0),z=JSON.parse(s1),sec=(z.t-a.t)/1000;
 const rate=(k)=>{const m=new Map(a[k]);return z[k].map(([s,v])=>[s,(v-(m.get(s)||0))/sec]).filter(x=>x[1]>0.05).sort((x,y)=>y[1]-x[1])};
 const st=await p.evaluate(()=>({ctx:__audit.ctx.map(r=>({kind:r.kind,site:r.site,state:r.ref.deref()?.state??'gc',closed:!!r.closed})),
   intervals:[...__audit.intervals.values()],wnodes:__audit.wnodes.filter(w=>!w.offline).map(w=>w.name),modules:__audit.modules.length,
   mo:__audit.mo.filter(m=>m.on&&m.obs).map(m=>m.site),listeners:[...__audit.listeners].filter(x=>x[1]>0),ws:__audit.ws.length,buffersMB:+(__audit.buffers/1e6).toFixed(1)}));
 const heap=await c.send('Runtime.getHeapUsage');const dom=await c.send('Memory.getDOMCounters');
 const out={label,sec:+sec.toFixed(1),mainThreadBusyPct:+(((m1.TaskDuration-m0.TaskDuration)/((m1.Timestamp-m0.Timestamp)))*100).toFixed(1),scriptPct:+(((m1.ScriptDuration-m0.ScriptDuration)/((m1.Timestamp-m0.Timestamp)))*100).toFixed(1),
  heapMB:+(heap.usedSize/1e6).toFixed(1),domNodes:dom.nodes,jsListeners:dom.jsEventListeners,
  liveContexts:st.ctx.filter(x=>x.kind!=='OfflineAudioContext'&&!x.closed&&x.state!=='closed'&&x.state!=='gc').map(x=>x.kind+'@'+x.site+'['+x.state+']'),
  offlineContextsTotal:st.ctx.filter(x=>x.kind==='OfflineAudioContext').length,
  workletNodesLiveCtx:st.wnodes,addModuleCalls:st.modules,intervals:st.intervals.map(x=>x.site+' every '+x.d+'ms'),
  activeMutationObservers:st.mo.length,windowDocListeners:st.listeners.reduce((a,x)=>a+x[1],0),websockets:st.ws,audioBuffersCreatedMB:st.buffersMB,
  timeoutsPerSec:rate('timeouts').slice(0,8).map(([s,r])=>[r.toFixed(1),s,snip(s)]),
  rafPerSec:rate('raf').slice(0,8).map(([s,r])=>[r.toFixed(1),s,snip(s)]),
  workletMsgsPerSec:rate('post').slice(0,6).map(([s,r])=>[r.toFixed(1),s,snip(s)]),
  nodesCreatedPerSec:rate('nodes').slice(0,10).map(([s,r])=>[r.toFixed(1),s]),
  storageWritesPerSec:rate('ls').slice(0,6).map(([s,r])=>[r.toFixed(0)+' B/s',s])};
 console.log(JSON.stringify(out,null,1));return out}
const R=[];
R.push(await windowMeasure('S0 Live Room idle (power off)',6000));
await p.getByRole('button',{name:'Power'}).click();await p.waitForTimeout(2500);
R.push(await windowMeasure('S1 Live Room playing (power on)',10000));
await click('MATERIAL FORGE');await p.waitForTimeout(4000);
R.push(await windowMeasure('S2 Material Forge open',6000));
await click('NODAL CENTER');await p.waitForTimeout(4000);
R.push(await windowMeasure('S3 Nodal Center open',6000));
await click('LIVE ROOM');await p.waitForTimeout(3000);
R.push(await windowMeasure('S4 back in Live Room, still playing',10000));
fs.writeFileSync(__dirname+'/audit-result.json',JSON.stringify({errs,R},null,1));
console.log('pageerrors',errs);await b.close()})();
