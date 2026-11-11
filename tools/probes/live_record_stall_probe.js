// TEST ONLY. Master recording under main-thread stalls: take completes, downloaded WAV is checked for gaps.
const {chromium}=require('playwright');const fs=require('fs');const http=require('http');
(async()=>{const HTML=require('path').resolve(process.argv[2]||'index.html');const srv=http.createServer((q,r)=>{r.writeHead(200,{'content-type':'text/html; charset=utf-8'});fs.createReadStream(HTML).pipe(r)});await new Promise(k=>srv.listen(0,'127.0.0.1',k));
const b=await chromium.launch({args:['--autoplay-policy=no-user-gesture-required']});const p=await b.newPage({viewport:{width:1440,height:900}});
const errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.goto('http://127.0.0.1:'+srv.address().port+'/');await p.waitForTimeout(4000);
await p.getByRole('button',{name:'Power'}).click();await p.waitForTimeout(3000);
const recBtn=async()=>p.evaluate(()=>{const bs=[...document.querySelectorAll('button')].filter(b=>b.offsetParent&&/^\W*Rec$/.test(b.innerText.trim()));bs[bs.length-1].click();return bs.map(b=>b.innerText.trim())});
console.log(await recBtn());await p.waitForTimeout(1000);
const st=()=>p.evaluate(()=>{try{return JSON.stringify(__XenPcmCaptureStatus)}catch(e){return String(e)}});
const panel=()=>p.evaluate(()=>{const h=[...document.querySelectorAll('*')].find(e=>e.children.length===0&&/MASTER RECORDING/i.test(e.textContent));let n=h;for(let i=0;i<4&&n;i++)n=n.parentElement;return (n||document.body).innerText.replace(/\s+/g,' ').slice(0,500)});
const t0=Date.now();
const bx=await (await p.evaluateHandle(()=>[...document.querySelectorAll('canvas')].filter(c=>c.offsetParent).sort((a,b)=>b.clientWidth*b.clientHeight-a.clientWidth*a.clientHeight)[0])).boundingBox();
for(let i=0;i<5;i++){await p.mouse.move(bx.x+200+i*40,bx.y+200);await p.mouse.down();await p.mouse.up();await p.evaluate(()=>{const t=performance.now();while(performance.now()-t<300);});await p.waitForTimeout(1500)}

await p.evaluate(()=>[...document.querySelectorAll('button')].find(b=>/Enough/.test(b.innerText)).click());const wall=(Date.now()-t0)/1000;await p.waitForTimeout(3000);
console.log('END wall≈',wall.toFixed(1),await p.evaluate(()=>{const t=document.body.innerText;const i=t.indexOf('MASTER RECORDING');return t.slice(i,i+700).replace(/\s+/g,' ')}),errs);
const [dl]=await Promise.all([p.waitForEvent('download',{timeout:20000}),p.evaluate(()=>[...document.querySelectorAll('button')].find(b=>/Download/.test(b.innerText)&&b.offsetParent).click())]);
await dl.saveAs(require('os').tmpdir()+'/xen_take.wav');const w=fs.readFileSync(require('os').tmpdir()+'/xen_take.wav');const fmt=w.readUInt16LE(20),ch=w.readUInt16LE(22),sr=w.readUInt32LE(24),bits=w.readUInt16LE(34);let off=12;while(w.toString('ascii',off,off+4)!=='data')off+=8+w.readUInt32LE(off+4);const n=w.readUInt32LE(off+4)/(bits/8)/ch;
let peak=0,zr=0,run=0,maxStep=0,prev=0;for(let i=0;i<n;i++){const v=bits===32?w.readFloatLE(off+8+i*ch*4):w.readInt16LE(off+8+i*ch*2)/32768;const a=Math.abs(v);if(a>peak)peak=a;if(v===0){run++}else{if(run>=64&&i>run+64&&i<n-64)zr++;run=0}const st=Math.abs(v-prev);if(st>maxStep)maxStep=st;prev=v}
console.log('WAV',{fmt,ch,sr,bits,seconds:+(n/sr).toFixed(2),peak:+peak.toFixed(3),zeroRunsInside:zr,maxSampleStep:+maxStep.toFixed(3)});
await b.close();process.exit(0)})();
