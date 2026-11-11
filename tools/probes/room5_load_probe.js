// TEST ONLY. Audio-thread render time per quantum while Room V plays six voices (worst case: staircase on).
const {chromium}=require('playwright');const fs=require('fs');const http=require('http');const path=require('path');
(async()=>{const HTML=path.resolve(process.argv[2]||'index.html');const srv=http.createServer((q,r)=>{r.writeHead(200,{'content-type':'text/html; charset=utf-8'});fs.createReadStream(HTML).pipe(r)});await new Promise(k=>srv.listen(0,'127.0.0.1',k));
const b=await chromium.launch({args:['--autoplay-policy=no-user-gesture-required']});const p=await b.newPage({viewport:{width:1440,height:900}});
await p.goto('http://127.0.0.1:'+srv.address().port+'/');await p.waitForTimeout(3500);
await p.evaluate(()=>{[...document.querySelectorAll('button')].find(b=>/PSY LAB/.test(b.innerText)).click()});await p.waitForTimeout(1200);
const measure=async label=>{await b.startTracing(p,{categories:['webaudio','v8','disabled-by-default-v8.gc','devtools.timeline']});await p.waitForTimeout(6000);const ev=JSON.parse(await b.stopTracing()).traceEvents;const th=new Map();for(const e of ev)if(e.ph==='M'&&e.name==='thread_name')th.set(e.pid+':'+e.tid,e.args.name);
 const rq=[];let gc=0;for(const e of ev){if(e.ph!=='X')continue;if(e.name==='RealtimeAudioDestinationHandler::Render')rq.push(e.dur);if(e.name==='MinorGC'&&/Audio/.test(th.get(e.pid+':'+e.tid)||''))gc++}
 rq.sort((a,b)=>a-b);console.log(label.padEnd(34),'mean',(rq.reduce((a,x)=>a+x,0)/rq.length).toFixed(0),'us  p99',rq[Math.floor(rq.length*.99)],'us  audio-thread minor GCs',gc)};
await measure('room open, silent');
for(const name of['Liquid Bell','Escher Staircase','Chaos Insect']){await p.selectOption('select[aria-label="Patch"]',{label:name});await p.evaluate(()=>document.activeElement.blur());
 for(const k of['KeyZ','KeyC','KeyB','KeyA','KeyD','KeyG'])await p.keyboard.down(k);await p.waitForTimeout(2500);await measure(name+', 6 voices');for(const k of['KeyZ','KeyC','KeyB','KeyA','KeyD','KeyG'])await p.keyboard.up(k);await p.waitForTimeout(300)}
await b.close();process.exit(0)})();
