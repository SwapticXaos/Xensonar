// TEST ONLY. CPU profile inside the AudioWorklet global scope (self time per function) while playing.
// env: HTML (abs path), SEC (default 15), WARM (default 10), MODE=idle|heavy
const {chromium}=require('playwright');const fs=require('fs');const http=require('http');
(async()=>{const HTML=process.env.HTML||process.cwd()+'/index.html';const SEC=+(process.env.SEC||15),WARM=+(process.env.WARM||10),MODE=process.env.MODE||'heavy';
const srv=http.createServer((q,r)=>{r.writeHead(200,{'content-type':'text/html; charset=utf-8'});fs.createReadStream(HTML).pipe(r)});await new Promise(k=>srv.listen(0,'127.0.0.1',k));
const b=await chromium.launch({args:['--autoplay-policy=no-user-gesture-required']});const p=await b.newPage({viewport:{width:1440,height:900}});
const c=await p.context().newCDPSession(p);const kids=[];let id=1;const wait=new Map();
c.on('Target.attachedToTarget',e=>kids.push(e));
c.on('Target.receivedMessageFromTarget',e=>{const m=JSON.parse(e.message);if(m.id&&wait.has(m.id)){wait.get(m.id)(m);wait.delete(m.id)}});
const send=(sessionId,method,params={})=>new Promise(res=>{const i=id++;wait.set(i,res);c.send('Target.sendMessageToTarget',{sessionId,message:JSON.stringify({id:i,method,params})})});
await c.send('Target.setAutoAttach',{autoAttach:true,waitForDebuggerOnStart:false,flatten:false});
await p.goto('http://127.0.0.1:'+srv.address().port+'/');await p.waitForTimeout(4000);
await p.getByRole('button',{name:'Power'}).click();await p.waitForTimeout(3000);
await p.evaluate(()=>{const x=document.querySelector('input[type=checkbox][aria-label="Drone On"]');if(x&&!x.checked)x.click()});
const play=async sec=>{if(MODE==='idle'){await p.waitForTimeout(sec*1000);return}
 const bx=await (await p.evaluateHandle(()=>[...document.querySelectorAll('canvas')].filter(c=>c.offsetParent).sort((a,b)=>b.clientWidth*b.clientHeight-a.clientWidth*a.clientHeight)[0])).boundingBox();const keys='1234567890qwertzuiop';const t0=Date.now();let k=0,cc=0,w=0;
 await p.keyboard.down('Enter');
 while(Date.now()-t0<sec*1000){const t=(Date.now()-t0)/1000;await p.mouse.move(bx.x+bx.width*(0.5+0.45*Math.sin(t*2.9)),bx.y+bx.height*(0.5+0.45*Math.sin(t*3.7+1)));
  if(t>cc*0.2){cc++;await p.mouse.down();await p.mouse.up()}
  if(t>k*0.09){for(const off of[0,4,7]){const key=keys[(k+off)%keys.length];await p.keyboard.down(key);setTimeout(()=>p.keyboard.up(key).catch(()=>{}),160)}k++}
  if(t>w*0.35+0.3){const key='yxcv'[w%4];w++;await p.keyboard.press(key)}await p.waitForTimeout(12)}
 await p.keyboard.up('Enter')};
await play(WARM);
const w=kids.filter(k=>/worklet/i.test(k.targetInfo.type));
for(const k of w){await send(k.sessionId,'Profiler.enable');await send(k.sessionId,'Profiler.setSamplingInterval',{interval:100});await send(k.sessionId,'Profiler.start')}
await play(SEC);
for(const k of w){const r=await send(k.sessionId,'Profiler.stop');const prof=r.result&&r.result.profile;if(!prof)continue;
 const self=new Map();const dt=prof.timeDeltas,ids=prof.samples;const byId=new Map(prof.nodes.map(n=>[n.id,n]));let total=0;
 for(let i=0;i<ids.length;i++){const n=byId.get(ids[i]);const f=n.callFrame;const key=(f.functionName||'(anon)')+' '+f.lineNumber+':'+f.columnNumber;self.set(key,(self.get(key)||0)+dt[i]);total+=dt[i]}
 const rows=[...self].sort((a,b)=>b[1]-a[1]);console.log('== audio worklet thread, profiled',(total/1e6).toFixed(1),'s; share of wall time per function (self):');
 for(const[k2,v]of rows.slice(0,28))console.log((v/total*100).toFixed(2).padStart(6)+'%',(v/1000/(SEC*1000)*100).toFixed(2).padStart(6)+'% of wall',k2)}
await b.close();process.exit(0)})();
