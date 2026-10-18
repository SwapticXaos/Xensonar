import os
#!/usr/bin/env python3
"""Cecilia/Donor result display spectrum cost & PCM byte preservation in a real browser."""
import pathlib, argparse, json, statistics
from playwright.sync_api import sync_playwright
root=pathlib.Path(__file__).resolve().parents[1]
s=argparse.ArgumentParser();s.add_argument('html',type=pathlib.Path);s.add_argument('--capture',action='store_true');s.add_argument('--runs',type=int,default=4);args=s.parse_args()
with sync_playwright() as p:
 browser=p.chromium.launch(headless=True,executable_path=os.environ.get('XENSONAR_CHROMIUM_PATH'),args=['--no-sandbox'])
 page=browser.new_page();page.evaluate('''Object.defineProperty(window,'localStorage',{configurable:true,value:{getItem:()=>null,setItem(){}}})''')
 html=args.html.read_text().replace('</script>','window.__SPEC=__F352DSP;</script>',1)
 page.set_content(html,wait_until='domcontentloaded')
 result=page.evaluate('''async reps=>{
 const sr=48000,pcm=Float32Array.from({length:sr*4},(_,i)=>.16*Math.sin(i*2*Math.PI*173/sr)+.07*Math.sin(i*2*Math.PI*771/sr)+.03*Math.sin(i*2*Math.PI*(1700+.003*i)/sr));
 const hash=arr=>{let h=2166136261;for(const b of new Uint8Array(arr.buffer))h=Math.imul(h^b,16777619)>>>0;return h.toString(16).padStart(8,'0')};
 let first;const times=[];for(let i=0;i<reps;i++){const t=performance.now(),r=await __SPEC.spectrum(pcm,sr);times.push(performance.now()-t);
 const signature={hash:hash(r.values),width:r.width,height:r.height,maximum:r.maximum};
 if(first&&JSON.stringify(first)!==JSON.stringify(signature))throw Error('Nondeterministic spectrum');first=signature;
 }return {signature:first,times};
}''',args.runs)
 browser.close()
ref=root/'tests/fixtures/spectrum_speed_reference.json'
if args.capture:ref.write_text(json.dumps(result['signature'],indent=2)+'\n')
else:assert json.loads(ref.read_text())==result['signature'],'Spectrogram values or max changed'
print('4s spectrum:',round(statistics.median(result['times']),1),'ms, samples checksum:',result['signature']['hash'],'runs:',args.runs)
