// TEST ONLY. Sampling heap profiler inside the AudioWorklet scope + audio-thread GC. env: HTML, SEC, WARM, PLAY.
// Sampling heap profiler inside the AudioWorklet global scope (test only).
const {chromium}=require('playwright');const fs=require('fs');const http=require('http');
(async()=>{const HTML=process.env.HTML||'/home/user/Xensonar/index.html';const SEC=+(process.env.SEC||20);const srv=http.createServer((q,r)=>{r.writeHead(200,{'content-type':'text/html; charset=utf-8'});fs.createReadStream(HTML).pipe(r)});await new Promise(k=>srv.listen(0,'127.0.0.1',k));
const b=await chromium.launch({args:['--autoplay-policy=no-user-gesture-required']});const p=await b.newPage({viewport:{width:1440,height:900}});
const c=await p.context().newCDPSession(p);const kids=[];let id=1;const wait=new Map();
c.on('Target.attachedToTarget',e=>{kids.push(e);});
c.on('Target.receivedMessageFromTarget',e=>{const m=JSON.parse(e.message);if(m.id&&wait.has(m.id)){wait.get(m.id)(m);wait.delete(m.id)}});
const send=(sessionId,method,params={})=>new Promise(res=>{const i=id++;wait.set(i,res);c.send('Target.sendMessageToTarget',{sessionId,message:JSON.stringify({id:i,method,params})})});
await c.send('Target.setAutoAttach',{autoAttach:true,waitForDebuggerOnStart:false,flatten:false});
await p.goto('http://127.0.0.1:'+srv.address().port+'/');await p.waitForTimeout(4000);
await p.getByRole('button',{name:'Power'}).click();await p.waitForTimeout(4000);
console.log(kids.map(k=>k.targetInfo.type+' '+k.targetInfo.url.slice(0,60)));
const w=kids.filter(k=>/worklet/i.test(k.targetInfo.type));
const play=async(sec)=>{const bx=await (await p.evaluateHandle(()=>[...document.querySelectorAll('canvas')].filter(c=>c.offsetParent).sort((a,b)=>b.clientWidth*b.clientHeight-a.clientWidth*a.clientHeight)[0])).boundingBox();const keys='1234567890qwertzuiop';const t0=Date.now();let kk=0,cc=0;while(Date.now()-t0<sec*1000){const t=(Date.now()-t0)/1000;await p.mouse.move(bx.x+bx.width*(0.5+0.42*Math.sin(t*1.7)),bx.y+bx.height*(0.5+0.42*Math.sin(t*2.3+1)));if(t>cc*0.45){cc++;await p.mouse.down();await p.mouse.up()}if(t>kk*0.22){const key=keys[kk%keys.length];kk++;await p.keyboard.down(key);setTimeout(()=>p.keyboard.up(key).catch(()=>{}),110)}await p.waitForTimeout(16)}};
if(process.env.WARM)await play(+process.env.WARM);
for(const k of w){await send(k.sessionId,'HeapProfiler.enable');await send(k.sessionId,'HeapProfiler.startSampling',{samplingInterval:256,includeObjectsCollectedByMajorGC:true,includeObjectsCollectedByMinorGC:true})}
if(process.env.PLAY)await play(SEC);else await p.waitForTimeout(SEC*1000);
for(const k of w){const r=await send(k.sessionId,'HeapProfiler.stopSampling');const prof=r.result&&r.result.profile;if(!prof){console.log('no profile',JSON.stringify(r).slice(0,200));continue}
 const out=[];const walk=(n,stack)=>{const f=n.callFrame;const s=[...stack,(f.functionName||'(anon)')+':'+f.lineNumber+':'+f.columnNumber];if(n.selfSize)out.push([n.selfSize,s.slice(-4).join(' > ')]);for(const ch of n.children||[])walk(ch,s)};walk(prof.head,[]);
 out.sort((a,b)=>b[0]-a[0]);const tot=out.reduce((a,x)=>a+x[0],0);console.log('== worklet target, sampled bytes',tot,'=>',(tot/SEC/1024).toFixed(0),'KB/s');for(const[o,s]of out.slice(0,25))console.log(String(o).padStart(9),s)}
await b.close();process.exit(0)})();
