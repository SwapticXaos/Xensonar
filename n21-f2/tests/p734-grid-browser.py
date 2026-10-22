import os
from playwright.sync_api import sync_playwright
from pathlib import Path
import json
html=Path(__file__).resolve().parents[1].joinpath(json.loads(Path(__file__).resolve().parents[1].joinpath('source-manifest.json').read_text())['entry']).read_text()
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path=os.environ.get('XEN_CHROMIUM_PATH','/usr/bin/chromium'),args=['--no-sandbox','--disable-dev-shm-usage','--autoplay-policy=no-user-gesture-required'])
 page=browser.new_page(viewport={'width':1440,'height':900});errors=[]
 page.on('pageerror',lambda e:errors.append(str(e)))
 page.evaluate('''() => {const m=new Map();const store={getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,String(v)),removeItem:k=>m.delete(k),clear:()=>m.clear(),key:i=>[...m.keys()][i]??null,get length(){return m.size}};Object.defineProperty(window,'localStorage',{configurable:true,value:store});Object.defineProperty(window,'sessionStorage',{configurable:true,value:store})}''')
 page.set_content(html,wait_until='domcontentloaded',timeout=30000)
 print('enable:',page.locator('button').filter(has_text='ENABLE FOR AUDIO').count())
 page.locator('button[aria-label="Meta-Menu"]').click()
 count=page.locator('.xen-meta-library-row').count()
 preview=page.locator('.xen-meta-row-preview').count()
 print('grid library',count,'preview buttons',preview)
 if preview:
  button=page.locator('.xen-meta-row-preview').first
  print('before',button.inner_text())
  button.click();page.wait_for_timeout(350)
  print('after',button.inner_text())
  page.wait_for_timeout(3300)
  print('ended',button.inner_text())
 print('errors',errors[:8]);page.screenshot(path='/workspace/Xensonar/n21-f2/results/sessions-reviewed/P734_grid_browser.png');browser.close()
