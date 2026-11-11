#!/usr/bin/env node
// TEST ONLY. Live-room glitch/load probe: audio-thread render time per quantum (Chromium trace),
// node census, master PCM tap with discontinuity analysis, AudioParam/node/message rates, main-thread jank.
// Usage: node tools/probes/live_glitch_probe.js /abs/index.html [--scenario idle,play,...] [--detail] [--sites] [--wav dir] [--json out.json]
const {chromium}=require('playwright');const fs=require('fs');const path=require('path');
const HTML=path.resolve(process.argv[2]||'index.html');
const arg=k=>{const i=process.argv.indexOf(k);return i<0?null:(process.argv[i+1]&&!process.argv[i+1].startsWith('--')?process.argv[i+1]:true)};
const WANT=(arg('--scenario')||'idle,play').split(',');const DETAIL=!!arg('--detail'),SITES=!!arg('--sites'),WAVDIR=arg('--wav'),JSONOUT=arg('--json');
const q=(a,p)=>{if(!a.length)return 0;const s=Float64Array.from(a).sort();return s[Math.min(s.length-1,Math.floor(p*s.length))]};
function analysePcm(f32,sr){
  const n=f32.length/2;const out={seconds:+(n/sr).toFixed(2),peak:0,rms:0,clicks:[],zeroRuns:[],nan:0,clipped:0};if(!n)return out;
  let sq=0;const m=new Float32Array(n);
  for(let i=0;i<n;i++){const l=f32[2*i],r=f32[2*i+1];if(!(l===l)||!(r===r))out.nan++;const a=Math.max(Math.abs(l),Math.abs(r));if(a>out.peak)out.peak=a;if(a>=0.999)out.clipped++;sq+=l*l+r*r;m[i]=l}
  out.rms=+Math.sqrt(sq/(2*n)).toFixed(5);out.peak=+out.peak.toFixed(4);
  // exact-zero runs inside sound (dropout signature): >=64 consecutive exact zeros with |x|>1e-3 within 32 samples on both sides
  let run=0;for(let i=0;i<n;i++){if(f32[2*i]===0&&f32[2*i+1]===0)run++;else{if(run>=64){const a=i-run;let pre=0,post=0;for(let k=Math.max(0,a-32);k<a;k++)pre=Math.max(pre,Math.abs(f32[2*k]));for(let k=i;k<Math.min(n,i+32);k++)post=Math.max(post,Math.abs(f32[2*k]));if(pre>1e-3&&post>1e-3)out.zeroRuns.push({at:+(a/sr).toFixed(4),len:run})}run=0}}
  // click detector per channel: isolated second-difference outlier against the local neighbourhood
  for(const ch of[0,1]){
    const d=new Float32Array(n);for(let i=2;i<n;i++)d[i]=Math.abs(f32[2*i+ch]-2*f32[2*(i-1)+ch]+f32[2*(i-2)+ch]);
    const W=384,G=6;let i=W+2;
    // running sum of neighbourhood excluding guard
    while(i<n-W){
      if(d[i]>0.012){let s=0,c=0,mx=0;for(let k=i-W;k<i-G;k++){s+=d[k];c++;if(d[k]>mx)mx=d[k]}for(let k=i+G+1;k<=i+W;k++){s+=d[k];c++}
        // neighbourhood before only (onsets legitimately raise what comes after)
        let sb=0,cb=0;for(let k=i-W;k<i-G;k++){sb+=d[k];cb++}
        const mean=s/c,meanB=sb/cb;const ratio=d[i]/(mean+1e-7);
        if(ratio>25&&d[i]>8*mx){let step=Math.abs(f32[2*i+ch]-f32[2*(i-1)+ch]);out.clicks.push({at:+(i/sr).toFixed(4),ch,d2:+d[i].toFixed(4),step:+step.toFixed(4),ratio:Math.round(ratio),before:+meanB.toFixed(5)});i+=W;continue}}
      i++}
  }
  out.clicks.sort((a,b)=>a.at-b.at);return out}
function wav(f32,sr){const n=f32.length;const b=Buffer.alloc(44+n*2);b.write('RIFF',0);b.writeUInt32LE(36+n*2,4);b.write('WAVEfmt ',8);b.writeUInt32LE(16,16);b.writeUInt16LE(1,20);b.writeUInt16LE(2,22);b.writeUInt32LE(sr,24);b.writeUInt32LE(sr*4,28);b.writeUInt16LE(4,32);b.writeUInt16LE(16,34);b.write('data',36);b.writeUInt32LE(n*2,40);for(let i=0;i<n;i++)b.writeInt16LE(Math.max(-32768,Math.min(32767,Math.round(f32[i]*32767))),44+i*2);return b}
(async()=>{
  const b=await chromium.launch({args:['--autoplay-policy=no-user-gesture-required']});
  const p=await b.newPage({viewport:{width:1440,height:900}});
  await p.addInitScript({path:path.join(__dirname,'live_glitch_init.js')});
  const errs=[];p.on('pageerror',e=>errs.push(String(e.message).slice(0,200)));p.on('console',m=>{if(m.type()==='error')errs.push('console: '+m.text().slice(0,200))});
  let URL_='file://'+HTML;
  if(arg('--http')){const http=require('http');const srv=http.createServer((q,r)=>{r.writeHead(200,{'content-type':'text/html; charset=utf-8'});fs.createReadStream(HTML).pipe(r)});await new Promise(k=>srv.listen(0,'127.0.0.1',k));URL_='http://127.0.0.1:'+srv.address().port+'/';process.on('exit',()=>srv.close())}
  await p.goto(URL_);await p.waitForTimeout(4000);
  const cdp=await p.context().newCDPSession(p);await cdp.send('Performance.enable');
  const metrics=async()=>(await cdp.send('Performance.getMetrics')).metrics.reduce((o,x)=>(o[x.name]=x.value,o),{});
  const canvasBox=async()=>{const h=await p.evaluateHandle(()=>[...document.querySelectorAll('canvas')].filter(c=>c.offsetParent).sort((a,b)=>b.clientWidth*b.clientHeight-a.clientWidth*a.clientHeight)[0]);const bx=await h.boundingBox();return bx};
  const clickText=t=>p.evaluate(t=>{const b=[...document.querySelectorAll('button')].find(b=>b.offsetParent&&b.innerText.replace(/\s+/g,' ').includes(t));if(!b)throw Error('no button '+t);b.click()},t);
  const S={
    async idle(){await p.waitForTimeout(8000)},
    async play(){ // deterministic gesture script: focus sweeps, ripples, reference-pitch keys, directed waves
      const bx=await canvasBox();const keys='1234567890qwertzuiop';const t0=Date.now();let k=0,c=0,w=0;
      while(Date.now()-t0<12000){const t=(Date.now()-t0)/1000;
        await p.mouse.move(bx.x+bx.width*(0.5+0.42*Math.sin(t*1.7)),bx.y+bx.height*(0.5+0.42*Math.sin(t*2.3+1)));
        if(t>c*0.45){c++;await p.mouse.down();await p.mouse.up()}
        if(t>k*0.22){const key=keys[k%keys.length];k++;await p.keyboard.down(key);setTimeout(()=>p.keyboard.up(key).catch(()=>{}),110)}
        if(t>w*0.9+0.3){const key='yxcv'[w%4];w++;await p.keyboard.press(key)}
        await p.waitForTimeout(16)}
      await p.waitForTimeout(1500)},
  };
  const extra=arg('--scenarios-file');if(extra)Object.assign(S,require(path.resolve(extra))({p,canvasBox,clickText}));
  await p.getByRole('button',{name:'Power'}).click();await p.waitForTimeout(3000);
  // --select "Drone sound=warm_pad;Grid System=22edo": set <select aria-label|label text> before measuring
  for(const pair of String(arg('--select')||'').split(';').filter(Boolean)){const[label,value]=pair.split('=');
    const ok=await p.evaluate(([label,value])=>{const s=[...document.querySelectorAll('select')].find(s=>(s.getAttribute('aria-label')||s.closest('label,div')?.innerText||'').replace(/\s+/g,' ').startsWith(label));if(!s)return false;const set=Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype,'value').set;set.call(s,value);s.dispatchEvent(new Event('change',{bubbles:true}));return s.value===value},[label,value]);
    if(!ok)throw Error('select failed: '+pair);await p.waitForTimeout(2500)}
  const results=[];
  for(const name of WANT){
    if(!S[name])throw Error('unknown scenario '+name);
    const cats=['webaudio'].concat(DETAIL?['disabled-by-default-webaudio.audionode','v8','disabled-by-default-v8.gc']:[]);
    await p.evaluate(s=>{__glitch.siteOn=s;__glitch.paramSites.clear();__glitch.chunks=[];__glitch.frames=[];__glitch.longTasks=[];__glitch.recording=true},SITES);
    const s0=await p.evaluate(()=>__glitch.snapshot());const m0=await metrics();const w0=Date.now();
    await b.startTracing(p,{categories:cats});
    await S[name]();
    const buf=await b.stopTracing();const sec=(Date.now()-w0)/1000;const m1=await metrics();
    const s1=await p.evaluate(()=>{__glitch.recording=false;return __glitch.snapshot()});
    const cap=await p.evaluate(()=>({...__glitch.take(),frames:__glitch.frames,longTasks:__glitch.longTasks,state:__glitch.ctx&&__glitch.ctx.state,base:__glitch.ctx&&__glitch.ctx.baseLatency,outLat:__glitch.ctx&&__glitch.ctx.outputLatency}));
    const raw=Buffer.from(cap.b64,'base64');const f32=new Float32Array(raw.buffer,raw.byteOffset,raw.byteLength/4);
    const ev=(JSON.parse(buf).traceEvents)||[];const th=new Map();for(const e of ev)if(e.ph==='M'&&e.name==='thread_name')th.set(e.pid+':'+e.tid,e.args.name);
    const rq=[],cb=[];const per=new Map();let gcAudio=0,gcMain=0;
    for(const e of ev){if(e.ph!=='X')continue;const t=th.get(e.pid+':'+e.tid)||'';
      if(e.name==='RealtimeAudioDestinationHandler::Render')rq.push(e.dur/1000);
      else if(e.name==='AudioDestination::RequestRender')cb.push(e.dur/1000);
      else if(DETAIL&&/audionode/.test(e.cat)&&e.name!=='AudioHandler::ProcessIfNecessary'){const o=per.get(e.name)||{n:0,ms:0};o.n++;o.ms+=e.dur/1000;per.set(e.name,o)}
      if(DETAIL&&/GC/.test(e.name)&&/MinorGC|MajorGC|V8.GCScavenger|V8.GC_SCAVENGER$/.test(e.name)){if(/Audio/.test(t))gcAudio+=e.dur/1000;else if(t==='CrRendererMain')gcMain+=e.dur/1000}}
    const budget=128/cap.sr*1000;const rate=(k,a,z)=>{const m=new Map(a);return z.map(([s,v])=>[s,+((v-(m.get(s)||0))/sec).toFixed(1)]).filter(x=>x[1]>0).sort((x,y)=>y[1]-x[1])};
    const pcm=analysePcm(f32,cap.sr);
    const r={scenario:name,sec:+sec.toFixed(1),sampleRate:cap.sr,ctxState:cap.state,baseLatencyMs:+(cap.base*1000).toFixed(2),
      audioThread:{quanta:rq.length,budgetMs:+budget.toFixed(3),meanMs:+(rq.reduce((a,x)=>a+x,0)/Math.max(1,rq.length)).toFixed(3),p50:+q(rq,.5).toFixed(3),p99:+q(rq,.99).toFixed(3),p999:+q(rq,.999).toFixed(3),maxMs:+Math.max(0,...rq).toFixed(3),
        loadPct:+(rq.reduce((a,x)=>a+x,0)/(rq.length*budget)*100).toFixed(1),overBudget:rq.filter(x=>x>budget).length,overHalf:rq.filter(x=>x>budget/2).length,callbackMaxMs:+Math.max(0,...cb).toFixed(2)},
      mainThread:{busyPct:+((m1.TaskDuration-m0.TaskDuration)/(m1.Timestamp-m0.Timestamp)*100).toFixed(1),scriptPct:+((m1.ScriptDuration-m0.ScriptDuration)/(m1.Timestamp-m0.Timestamp)*100).toFixed(1),heapMB:+(m1.JSHeapUsedSize/1e6).toFixed(1),
        longTasks:cap.longTasks.length,longTaskMaxMs:+Math.max(0,...cap.longTasks.map(x=>x.d)).toFixed(0),frameP50:+q(cap.frames,.5).toFixed(1),frameP99:+q(cap.frames,.99).toFixed(1),frameMax:+Math.max(0,...cap.frames).toFixed(0)},
      perSec:{params:rate('params',s0.params,s1.params),nodes:rate('nodes',s0.nodes,s1.nodes),portMessages:+((s1.post-s0.post)/sec).toFixed(1)},
      pcm:{seconds:pcm.seconds,peak:pcm.peak,rms:pcm.rms,nan:pcm.nan,clipped:pcm.clipped,tapGaps:cap.gaps.length,zeroRuns:pcm.zeroRuns.length,clicks:pcm.clicks.length,clickList:pcm.clicks.slice(0,40),zeroRunList:pcm.zeroRuns.slice(0,10)}};
    if(DETAIL){r.nodeCensusPerQuantum=[...per].map(([k,o])=>[k.replace('Handler::Process',''),+(o.n/Math.max(1,rq.length)).toFixed(1),+(o.ms/Math.max(1,rq.length)*1000).toFixed(1)+'us']).sort((a,b)=>parseFloat(b[2])-parseFloat(a[2]));r.gcMs={audioThread:+gcAudio.toFixed(1),main:+gcMain.toFixed(1)}}
    if(SITES)r.sites=rate('sites',s0.sites,s1.sites).slice(0,40);
    if(WAVDIR){fs.mkdirSync(WAVDIR,{recursive:true});fs.writeFileSync(path.join(WAVDIR,name+'.wav'),wav(f32,cap.sr));fs.writeFileSync(path.join(WAVDIR,name+'.f32'),Buffer.from(f32.buffer,f32.byteOffset,f32.byteLength))}
    results.push(r);console.log(JSON.stringify(r,null,1));
  }
  if(errs.length)console.log('ERRORS',JSON.stringify([...new Set(errs)].slice(0,12),null,1));
  if(JSONOUT)fs.writeFileSync(JSONOUT,JSON.stringify({html:HTML,errs:[...new Set(errs)],results},null,1));
  await b.close();process.exit(0);
})().catch(e=>{console.error(e);process.exit(1)});
