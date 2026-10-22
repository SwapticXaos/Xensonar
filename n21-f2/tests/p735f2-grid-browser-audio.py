import os
from pathlib import Path
import json
from playwright.sync_api import sync_playwright
html=Path(__file__).resolve().parents[1].joinpath(json.loads(Path(__file__).resolve().parents[1].joinpath('source-manifest.json').read_text())['entry']).read_text()
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path=os.environ.get('XEN_CHROMIUM_PATH','/usr/bin/chromium'),args=['--no-sandbox','--disable-dev-shm-usage','--autoplay-policy=no-user-gesture-required'])
 page=browser.new_page(viewport={'width':1440,'height':860});errors=[];warnings=[]
 page.on('pageerror',lambda e:errors.append(str(e)))
 page.on('console',lambda m:warnings.append(m.text) if m.type in ['error','warning'] else None)
 page.evaluate('''() => {const m=new Map();const store={getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,String(v)),removeItem:k=>m.delete(k),clear:()=>m.clear(),key:i=>[...m.keys()][i]??null,get length(){return m.size}};Object.defineProperty(window,'localStorage',{configurable:true,value:store});Object.defineProperty(window,'sessionStorage',{configurable:true,value:store});Object.defineProperty(window.crypto,'randomUUID',{configurable:true,value:()=>('aaaaaaaa-bbbb-4ccc-8ddd-'+Math.random().toString().slice(2).padEnd(12,'0').slice(0,12))});window.__metaAudioProbe={ctx:0,osc:0,buffer:0};const Orig=window.AudioContext;window.AudioContext=new Proxy(Orig,{construct(T,args){let v=Reflect.construct(T,args);window.__metaAudioProbe.ctx++;return v}});for(const method of ['createOscillator','createBufferSource']){const old=Orig.prototype[method];Orig.prototype[method]=function(...args){window.__metaAudioProbe[method==='createOscillator'?'osc':'buffer']++;return old.apply(this,args)}}}''')
 page.set_content(html,wait_until='domcontentloaded',timeout=30000)
 page.locator('button[aria-label="Meta-Menu"]').click()
 print('grid entry count',page.locator('.xen-meta-row-preview').count())
 if page.locator('.xen-meta-row-preview').count():
  btn=page.locator('.xen-meta-row-preview').first
  print('first id',btn.get_attribute('aria-label'))
  print('before',btn.inner_text(),page.evaluate('window.__metaAudioProbe'))
  btn.click()
  for delay in [70,300,1100]:
   page.wait_for_timeout(delay)
   print(f'after {delay}',btn.inner_text(),page.evaluate('window.__metaAudioProbe'))
 print('errors',errors[:5], 'warnings',warnings[-4:]);browser.close()
