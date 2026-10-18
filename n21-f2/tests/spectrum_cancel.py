import os
#!/usr/bin/env python3
from pathlib import Path
import sys
from playwright.sync_api import sync_playwright
html=(Path(sys.argv[1]) if len(sys.argv)>1 else Path(__file__).resolve().parents[1].joinpath('Xensonar_F3_56_55_CLEAN4_SPEED1.html')).read_text().replace('</script>','window.__SPEC=__F352DSP;</script>',1)
with sync_playwright() as p:
 b=p.chromium.launch(headless=True,executable_path=os.environ.get('XENSONAR_CHROMIUM_PATH'),args=['--no-sandbox']);page=b.new_page()
 page.evaluate('''Object.defineProperty(window,'localStorage',{configurable:true,value:{getItem:()=>null,setItem(){}}})''')
 page.set_content(html,wait_until='domcontentloaded')
 result=page.evaluate('''async()=>{
 const sr=48000,pcm=Float32Array.from({length:sr*8},(_,i)=>Math.sin(i/17)*.2);
 let pre=false;try{await __SPEC.spectrum(pcm,sr,{isCancelled:()=>true});}catch(e){pre=e.name==='AbortError'}
 let interrupted=false, checks=0;setTimeout(()=>interrupted=true,0);
 let interruptedCaught=false;
 try{await __SPEC.spectrum(pcm,sr,{isCancelled:()=>{checks++;return interrupted}})}catch(e){interruptedCaught=e.name==='AbortError'}
 return {pre,interruptedCaught,checks};
}''')
 assert result['pre'] and result['interruptedCaught'] and result['checks']<=65,result
 print('PASS: pre-emptive & asynchronous spectral calculation cancellation, checks:',result['checks'])
 b.close()
