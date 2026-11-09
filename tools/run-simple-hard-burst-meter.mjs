#!/usr/bin/env node
import http from 'node:http';
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const targetUrl = process.argv[2] || 'http://127.0.0.1:8785/index.html';
const candidateId = process.argv[3] || process.env.XENSONAR_CANDIDATE || 'C1_balanced_shadow_default_candidate';
const outDir = process.argv[4] || process.env.XENSONAR_SIMPLE_BURST_OUT_DIR || '/mnt/data/xensonar_9105_simple_hard_burst_meter';
const durationMs = Number(process.env.XENSONAR_SIMPLE_BURST_MS || 9000);
const port = Number(process.env.XENSONAR_CDP_PORT || (11200 + Math.floor(Math.random() * 900)));
mkdirSync(outDir, { recursive: true });

const candidates = {
  C1_balanced_shadow_default_candidate: { id:'C1_balanced_shadow_default_candidate', stylePreset:'balanced', particlePreset:'balanced', waveStarterPreset:'balanced', rootFollowVoiceEngineMode:'shadow-plan', rootFollowQuantizationMode:'fallback', rootFollowQuantizationGrid:'32', particleCrisisMode:'quantization-loosening', particleLoadReductionMode:'soft-taper', particleAmbientMotionMode:'gentle', particleQuantizationMode:'fallback', particleQuantizationGrid:'64' },
  C2_pressure_safe_shadow_browser_safe: { id:'C2_pressure_safe_shadow_browser_safe', stylePreset:'pressure-safe-6879', particlePreset:'pressure-safe-6879', waveStarterPreset:'pressure-safe-6879', rootFollowVoiceEngineMode:'shadow-plan', rootFollowQuantizationMode:'fallback', rootFollowQuantizationGrid:'32', particleCrisisMode:'quantization-pyramid', particleLoadReductionMode:'adaptive-thin', particleAmbientMotionMode:'gentle', particleQuantizationMode:'fallback', particleQuantizationGrid:'32' },
  C4_studio_density_shadow_musical_outlier: { id:'C4_studio_density_shadow_musical_outlier', stylePreset:'studio-density', particlePreset:'studio-density', waveStarterPreset:'studio-density', rootFollowVoiceEngineMode:'shadow-plan', rootFollowQuantizationMode:'off', rootFollowQuantizationGrid:'64', particleCrisisMode:'quantization-liberation', particleLoadReductionMode:'soft-taper', particleAmbientMotionMode:'gentle', particleQuantizationMode:'fallback', particleQuantizationGrid:'64' },
  W1_balanced_worklet_granular_pilot: { id:'W1_balanced_worklet_granular_pilot', stylePreset:'balanced', particlePreset:'balanced', waveStarterPreset:'balanced', rootFollowVoiceEngineMode:'worklet-granular-pilot', rootFollowQuantizationMode:'fallback', rootFollowQuantizationGrid:'32', particleCrisisMode:'quantization-loosening', particleLoadReductionMode:'soft-taper', particleAmbientMotionMode:'gentle', particleQuantizationMode:'fallback', particleQuantizationGrid:'64' },
};
const candidate = candidates[candidateId];
if (!candidate) throw new Error(`unknown candidate ${candidateId}`);

function getJson(url){return new Promise((resolve,reject)=>http.get(url,res=>{let d='';res.on('data',c=>d+=c);res.on('end',()=>{try{resolve(JSON.parse(d))}catch(e){reject(e)}})}).on('error',reject));}
async function sleep(ms){return new Promise(r=>setTimeout(r,ms));}
async function waitFor(fn, ms, label){const s=Date.now();let last;while(Date.now()-s<ms){try{const v=await fn();if(v)return v;}catch(e){last=e;}await sleep(150);}throw last||new Error(`timeout ${label}`);}
class Cdp{constructor(wsUrl){this.ws=new WebSocket(wsUrl);this.id=1;this.pending=new Map();this.logs=[];this.ws.onmessage=e=>{const m=JSON.parse(e.data);if(m.id&&this.pending.has(m.id)){const p=this.pending.get(m.id);this.pending.delete(m.id);m.error?p.reject(new Error(JSON.stringify(m.error))):p.resolve(m.result??{});}else{if(m.method==='Runtime.consoleAPICalled'){const line=`[console.${m.params?.type}] ${(m.params?.args||[]).map(a=>a.value??a.description??a.type).join(' ')}`;this.logs.push(line);console.log(line.slice(0,800));} if(m.method==='Runtime.exceptionThrown'){const line=`[exception] ${JSON.stringify(m.params).slice(0,1200)}`;this.logs.push(line);console.error(line);} if(m.method==='Log.entryAdded'){const e=m.params?.entry;const line=`[log.${e?.level}] ${e?.source}: ${e?.text}`;this.logs.push(line);}}}}ready(){return new Promise((res,rej)=>{this.ws.onopen=res;this.ws.onerror=rej;});}send(method,params={},sid){const id=this.id++;this.ws.send(JSON.stringify(sid?{id,method,params,sessionId:sid}:{id,method,params}));return new Promise((resolve,reject)=>this.pending.set(id,{resolve,reject}));}}
async function evalPage(cdp,sid,expression,timeout=15000){const r=await cdp.send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true,timeout},sid);if(r.exceptionDetails)throw new Error(JSON.stringify(r.exceptionDetails).slice(0,3000));return r.result?.value;}
async function press(cdp,sid,key,code,text=''){await cdp.send('Input.dispatchKeyEvent',{type:'keyDown',key,code,text,unmodifiedText:text},sid);await cdp.send('Input.dispatchKeyEvent',{type:'keyUp',key,code},sid);}
async function down(cdp,sid,key,code){await cdp.send('Input.dispatchKeyEvent',{type:'keyDown',key,code,text:key.length===1?key:'',unmodifiedText:key.length===1?key:''},sid);}
async function up(cdp,sid,key,code){await cdp.send('Input.dispatchKeyEvent',{type:'keyUp',key,code},sid);}
async function canvasRect(cdp,sid){return await evalPage(cdp,sid,`(()=>{const c=document.querySelector('canvas')||document.body; const r=c.getBoundingClientRect(); return {left:r.left,top:r.top,width:r.width||innerWidth,height:r.height||innerHeight};})()`);}
function rowFromPayload(payload, meta){const stress=payload?.metadata?.audioTraffic?.stressComparison ?? payload?.entries?.at?.(-1)?.audioTraffic?.stressComparison ?? {}; const audio=payload?.metadata?.audioTraffic ?? payload?.entries?.at?.(-1)?.audioTraffic ?? {}; return { ...meta, burstRiskScore:stress.burstRiskScore??null, robustnessScore:stress.robustnessScore??null, musicalPreservationScore:stress.musicalPreservationScore??null, restrictionCostScore:stress.restrictionCostScore??null, dominantSubsystem:stress.dominantSubsystem??null, browserOptimizedReadout:stress.browserOptimizedReadout??null, rootFollowVoiceEngineMode:stress.rootFollowVoiceEngineMode??meta.engine, workletPilotHealth:stress.workletPilotHealth??stress.workletStatus??null, primaryCandidateMuteEvents:stress.primaryCandidateMuteEvents??null, maxEvents16:stress.eventWindows?.['16']?.maxEvents??audio.eventWindows?.['16']?.maxEvents??null, maxEvents50:stress.eventWindows?.['50']?.maxEvents??audio.eventWindows?.['50']?.maxEvents??null, maxEvents100:stress.eventWindows?.['100']?.maxEvents??audio.eventWindows?.['100']?.maxEvents??null, entryCount:Array.isArray(payload?.entries)?payload.entries.length:null, rejectsPerSecondProxy:stress.rejectsPerSecondProxy??null, smoothingBeforeDropProxy:stress.smoothingBeforeDropProxy??null };}
const prepJs = `(async()=>{
 const sleep=ms=>new Promise(r=>setTimeout(r,ms)); const out={}; const txt=e=>((e?.innerText||e?.textContent||'')+' '+(e?.title||'')+' '+(e?.ariaLabel||'')).replace(/\s+/g,' ');
 const click=async(rx,key)=>{const b=[...document.querySelectorAll('button')].find(b=>rx.test(txt(b))); if(!b){out[key]={ok:false}; return false;} b.scrollIntoView({block:'center'}); b.click(); await sleep(450); out[key]={ok:true,text:txt(b).slice(0,120)}; return true;};
 const check=async(rx,key)=>{const i=[...document.querySelectorAll('input[type=checkbox]')].find(i=>{let t=''; for(let n=i;n&&t.length<1400;n=n.parentElement)t+=' '+(n.innerText||n.textContent||''); return rx.test(t);}); if(!i){out[key]={ok:false};return false;} if(!i.checked){i.click(); await sleep(180);} out[key]={ok:true,checked:i.checked}; return i.checked;};
 const wav=(sec=2.5,f=110)=>{const sr=44100,n=Math.floor(sr*sec),buf=new ArrayBuffer(44+n*2),v=new DataView(buf); const w=(o,s)=>[...s].forEach((ch,i)=>v.setUint8(o+i,ch.charCodeAt(0))); w(0,'RIFF');v.setUint32(4,36+n*2,true);w(8,'WAVE');w(12,'fmt ');v.setUint32(16,16,true);v.setUint16(20,1,true);v.setUint16(22,1,true);v.setUint32(24,sr,true);v.setUint32(28,sr*2,true);v.setUint16(32,2,true);v.setUint16(34,16,true);w(36,'data');v.setUint32(40,n*2,true); for(let i=0;i<n;i++){const env=Math.min(1,i/4000, (n-i)/5000); const s=Math.sin(i/sr*2*Math.PI*f)*0.45+Math.sin(i/sr*2*Math.PI*(f*2.73))*0.25; v.setInt16(44+i*2,Math.max(-1,Math.min(1,s*env))*32767,true);} return new File([new Blob([buf],{type:'audio/wav'})], 'xensonar-simple-hard-dummy.wav', {type:'audio/wav'});};
 const setFile=async(rx,key,freq)=>{const input=[...document.querySelectorAll('input[type=file]')].find(i=>{let t=''; for(let n=i;n&&t.length<1600;n=n.parentElement)t+=' '+(n.innerText||n.textContent||''); return rx.test(t);}) || document.querySelector('input[type=file]'); if(!input){out[key]={ok:false};return false;} const dt=new DataTransfer();dt.items.add(wav(3,freq));input.files=dt.files;input.dispatchEvent(new Event('change',{bubbles:true})); await sleep(650); out[key]={ok:true}; return true;};
 await click(/\bPower\b/i,'power');
 await check(/Wellenstarter.*Gradient|Lautstärkegradient/i,'waveGradient'); await check(/Obertöne|Arp/i,'waveOvertones'); await check(/Partikel.*Echo/i,'particleEcho'); await check(/Spiral/i,'spiral'); await check(/Enter.*Hold|Hold-Gerät/i,'enterHold'); await check(/Schwarm/i,'swarm'); await check(/Live.*Master/i,'mastering');
 await click(/Root Follow Loop verwalten|kein Root Follow/i,'rootManager'); await setFile(/Root Follow|kein Root Follow/i,'rootDummy',91); await check(/Root Follow.*läuft|Root Follow.*aktiv|Loop aktiv/i,'rootActive'); await click(/Hotkeys Root Follow/i,'rootHotkeys');
 await click(/Materialspur verwalten|keine Materialspur/i,'materialManager'); await setFile(/Materialspur|keine Materialspur/i,'materialDummy',147); await check(/Materialspur.*läuft|Materialspur.*aktiv/i,'materialActive');
 await click(/Drum Pattern verwalten|Drum/i,'drumManager'); await check(/Drum.*läuft|Drum.*aktiv/i,'drumActive'); await click(/Bass Pattern verwalten|Bass/i,'bassManager'); await check(/Bass.*läuft|Bass.*aktiv/i,'bassActive');
 return out;
})()`;
const recJs = (action)=>`(async()=>{const sleep=ms=>new Promise(r=>setTimeout(r,ms)); const txt=e=>((e?.innerText||e?.textContent||'')+' '+(e?.title||'')).replace(/\s+/g,' '); const click=async(rx)=>{const b=[...document.querySelectorAll('button')].find(b=>rx.test(txt(b))&&!b.disabled); if(!b)return false; b.scrollIntoView({block:'center'}); b.click(); await sleep(250); return true;}; const o={}; o.panel=await click(/Burst-Diagnose anzeigen|BURST-DIAGNOSE/i); if('${action}'==='start') o.start=await click(/Aufzeichnung starten/i); if('${action}'==='stop') {o.stop=await click(/Aufzeichnung stoppen/i); await sleep(250); o.downloadSeen=[...document.querySelectorAll('button')].some(b=>/Log herunterladen/i.test(txt(b))&&!b.disabled);} return o;})()`;
const chrome = spawn('/usr/bin/chromium', [`--remote-debugging-port=${port}`, `--user-data-dir=/tmp/xensonar-simple-hard-${Date.now()}-${Math.random()}`, '--no-first-run','--no-default-browser-check','--no-sandbox','--disable-dev-shm-usage','--disable-gpu','--use-gl=swiftshader','--autoplay-policy=no-user-gesture-required','--disable-background-timer-throttling','--disable-renderer-backgrounding','--disable-backgrounding-occluded-windows','--no-proxy-server','--proxy-server=direct://','--proxy-bypass-list=*','--window-size=1600,1200','--headless=new','about:blank'], {stdio:['ignore','pipe','pipe']});
chrome.stderr.on('data', d=>{const s=d.toString(); if(/DevTools|FATAL|ERROR/.test(s)) console.error('[chromium]', s.slice(0,500));});
const startedAtIso=new Date().toISOString();
try{
 const version=await waitFor(()=>getJson(`http://127.0.0.1:${port}/json/version`),15000,'cdp'); const cdp=new Cdp(version.webSocketDebuggerUrl); await cdp.ready();
 const target=await cdp.send('Target.createTarget',{url:'about:blank'}); const attach=await cdp.send('Target.attachToTarget',{targetId:target.targetId,flatten:true}); const sid=attach.sessionId;
 await cdp.send('Runtime.enable',{},sid); await cdp.send('Log.enable',{},sid); await cdp.send('Page.enable',{},sid); await cdp.send('Page.navigate',{url:targetUrl},sid);
 await waitFor(async()=> (await cdp.send('Runtime.evaluate',{expression:'document.readyState',returnByValue:true},sid)).result?.value==='complete',30000,'document');
 await waitFor(async()=> (await cdp.send('Runtime.evaluate',{expression:'Boolean(window.__xensonarPerformanceCrisisHarness && window.__xensonarBurstStressHarness)',returnByValue:true},sid)).result?.value,30000,'harness');
 console.log('[simple-hard] harness ready', candidateId, durationMs);
 const prep=await evalPage(cdp,sid,prepJs,55000); console.log('[simple-hard] prep', prep);
 await evalPage(cdp,sid,`window.__xensonarPerformanceCrisisHarness.applyCandidate(${JSON.stringify(candidate)}); true`,15000); await sleep(700);
 await evalPage(cdp,sid,`window.__xensonarBurstStressHarness.setScenario('full-lane-max-stress'); true`,15000); await sleep(500);
 const recStart=await evalPage(cdp,sid,recJs('start'),10000).catch(e=>({error:String(e)}));
 await evalPage(cdp,sid,`window.__xensonarBurstStressHarness.clear(); window.__xensonarBurstStressHarness.start(); true`,10000);
 await sleep(800);
 const rect=await canvasRect(cdp,sid); const left=rect.left,top=rect.top,w=Math.max(400,rect.width),h=Math.max(300,rect.height);
 await down(cdp,sid,"'",'Quote');
 const keys=['a','s','d','f','g','h','j','k','l',';','q','w','e','r','t','z','u','i','o','p','Enter',' ','ArrowUp','ArrowRight','ArrowDown','ArrowLeft','m','n','v','c'];
 let mouseEvents=0,keyEvents=1,wheelEvents=0,timeouts=0; const end=Date.now()+durationMs; let n=0;
 const safe=async(p)=>Promise.race([p.catch(e=>({err:String(e).slice(0,120)})), new Promise(r=>setTimeout(()=>r({timeout:true}),250))]);
 while(Date.now()<end){
   const t=Date.now(); const x=Math.round(left+8+((n*97)%Math.max(1,w-16))); const y=Math.round(top+8+((n*151)%Math.max(1,h-16)));
   const r1=await safe(cdp.send('Input.dispatchMouseEvent',{type:'mouseMoved',x,y,buttons:1},sid)); mouseEvents++; if(r1?.timeout) timeouts++;
   if(n%2===0){await safe(cdp.send('Input.dispatchMouseEvent',{type:'mousePressed',x,y,button:'left',buttons:1,clickCount:1},sid)); await safe(cdp.send('Input.dispatchMouseEvent',{type:'mouseReleased',x,y,button:'left',buttons:0,clickCount:1},sid)); mouseEvents+=2;}
   const key=keys[n%keys.length]; await safe(press(cdp,sid,key,key===' '?'Space':key,key.length===1?key:'')); keyEvents+=2;
   if(n%3===0){await safe(cdp.send('Input.dispatchMouseEvent',{type:'mouseWheel',x,y,deltaX:((n%5)-2)*120,deltaY:((n%7)-3)*120},sid)); wheelEvents++;}
   n++;
 }
 await up(cdp,sid,"'",'Quote'); keyEvents++;
 await sleep(700);
 await evalPage(cdp,sid,`window.__xensonarBurstStressHarness.stop(); true`,10000);
 const recStop=await evalPage(cdp,sid,recJs('stop'),10000).catch(e=>({error:String(e)}));
 const stimulus={durationMs, mouseEvents,keyEvents,wheelEvents,timeouts,totalEvents:mouseEvents+keyEvents+wheelEvents, apostrophHold:true, startedAtIso, completedAtIso:new Date().toISOString()};
 const payloadJson=await evalPage(cdp,sid,`JSON.stringify(window.__xensonarBurstStressHarness.exportPayload(${JSON.stringify({version:'3.2.91.6.9.105-simple-hard-meter',candidateId,candidateConfig:candidate,scenarioId:'full-lane-max-stress',prep,recStart,recStop,harnessStimulus:stimulus,startedAtIso,completedAtIso:new Date().toISOString()})}))`,15000);
 const payload=JSON.parse(payloadJson); const row=rowFromPayload(payload,{candidateId,scenarioId:'full-lane-max-stress',durationMs,engine:candidate.rootFollowVoiceEngineMode,totalEvents:stimulus.totalEvents,prepOk:Boolean(prep?.rootDummy?.ok && prep?.materialDummy?.ok)});
 const stem=resolve(outDir,`simple_hard_${candidateId}_${new Date().toISOString().replace(/[:.]/g,'-')}`); writeFileSync(stem+'.json',JSON.stringify({row,payload,stimulus,prep,recStart,recStop,logs:cdp.logs},null,2)+'\n'); writeFileSync(stem+'.row.json',JSON.stringify(row,null,2)+'\n');
 console.log('[simple-hard] row', row); await cdp.send('Browser.close').catch(()=>null);
}catch(e){console.error('[simple-hard] failed', e); writeFileSync(resolve(outDir,`simple_hard_${candidateId}_FAILED_${new Date().toISOString().replace(/[:.]/g,'-')}.log`),String(e.stack||e)+'\n'); process.exitCode=1;} finally{try{chrome.kill('SIGTERM')}catch{}}
