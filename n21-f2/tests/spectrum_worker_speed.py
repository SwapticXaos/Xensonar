import os
#!/usr/bin/env python3
"""Real Blob Worker spectrum benchmark; detects silent main-thread fallback."""
from pathlib import Path
from playwright.sync_api import sync_playwright
import argparse,statistics
p=argparse.ArgumentParser();p.add_argument('html',type=Path);p.add_argument('--runs',type=int,default=4);a=p.parse_args()
with sync_playwright() as pw:
 b=pw.chromium.launch(headless=True,executable_path=os.environ.get('XENSONAR_CHROMIUM_PATH'),args=['--no-sandbox']);page=b.new_page()
 page.evaluate('''Object.defineProperty(window,'localStorage',{configurable:true,value:{getItem:()=>null,setItem(){}}})''')
 source=a.html.read_text().replace('</script>','window.__F352_WORKER_BENCH=__F352Worker;</script>',1);page.set_content(source,wait_until='domcontentloaded')
 r=page.evaluate('''async repeats=>{
 const sr=48000,pcm=Float32Array.from({length:sr*4},(_,i)=>.16*Math.sin(i*2*Math.PI*173/sr)+.07*Math.sin(i*2*Math.PI*771/sr)+.03*Math.sin(i*2*Math.PI*(1700+.003*i)/sr));
 const orig=Worker;let made=0,ready=0,returned=0;
 window.Worker=class extends orig{constructor(...args){super(...args);made++;this.addEventListener('message',e=>{if(e.data.ready)ready++;if(e.data.value?.values instanceof Float32Array)returned++})}};
 try{const times=[];let first=null;for(let j=0;j<repeats;j++){const start=performance.now(),ret=await __F352_WORKER_BENCH.run('spectrum',{sampleRate:sr,key:'worker-test'}, {pcm});times.push(performance.now()-start);if(!(ret?.values instanceof Float32Array))throw Error('invalid spectrum receipt');
 let h=2166136261;for(const x of new Uint8Array(ret.values.buffer))h=Math.imul(h^x,16777619)>>>0;const hash=h.toString(16).padStart(8,'0');if(first&&first!==hash)throw Error('worker nondeterministic');first=hash;
 }return {times,hash:first,made,ready,returned}}
 finally{window.Worker=orig}
}''',a.runs)
 assert r['made']==a.runs and r['ready']==a.runs and r['returned']==a.runs,r
 assert r['hash']=='9858778d',r
 print('real spectrum Worker, median',round(statistics.median(r['times']),1),'ms, receipts',r['made'],r['ready'],r['returned'],'PCM',r['hash'])
 b.close()
