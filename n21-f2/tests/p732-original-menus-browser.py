import os
from pathlib import Path
import json
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1]
html=(root/json.loads((root/'source-manifest.json').read_text())['entry']).read_text()
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path=os.environ.get('XEN_CHROMIUM_PATH','/usr/bin/chromium'),args=['--no-sandbox','--disable-dev-shm-usage'])
 page=browser.new_page(viewport={'width':1440,'height':860})
 errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.evaluate('''() => {const m=new Map();const store={getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,String(v)),removeItem:k=>m.delete(k),clear:()=>m.clear(),key:i=>[...m.keys()][i]??null,get length(){return m.size}};Object.defineProperty(window,'localStorage',{configurable:true,value:store});Object.defineProperty(window,'sessionStorage',{configurable:true,value:store})}''')
 page.set_content(html,wait_until='domcontentloaded',timeout=30000)
 page.locator('button[aria-label="Meta-Menu"]').click(timeout=20000)
 assert page.locator('.xen-meta-source-menu').count()==5
 page.screenshot(path='/workspace/Xensonar/n21-f2/results/sessions-reviewed/XenSonar_P7_32_MetaMenu_Visual_Check.png')
 kinds=['grid','material','rootFollow','drum','bass']
 for i,kind in enumerate(kinds):
  page.locator('.xen-meta-source-menu').nth(i).click(timeout=12000)
  page.locator(f'[data-xen-header-menu="{kind}"]').wait_for(timeout=7000)
  assert page.locator('.xen-meta-editor').count()==1
  page.wait_for_function('''() => document.querySelector('.xen-meta-overlay')?.classList.contains('is-native-behind')''')
  layers=page.evaluate('''kind => {const a=document.querySelector('.xen-meta-overlay'),b=document.querySelector(`[data-xen-header-menu="${kind}"]`);return [parseInt(getComputedStyle(a).zIndex),parseInt(getComputedStyle(b).zIndex)]}''',kind)
  assert layers[1]>layers[0],(kind,layers)
  page.locator(f'[data-xen-header-menu="{kind}"]').press('Escape')
  page.locator(f'[data-xen-header-menu="{kind}"]').wait_for(state='detached',timeout=7000)
  page.wait_for_function('''() => !document.querySelector('.xen-meta-overlay')?.classList.contains('is-native-behind')''')
  assert page.locator('.xen-meta-editor').count()==1
  print('PASS original library',kind,'opens above Meta and closes back to Meta',flush=True)
 # Sixth destination: Meta -> grid by right arrow and back by left arrow.
 page.locator('.xen-meta-titlebar').click()
 page.locator('.xen-meta-editor').press('ArrowRight')
 page.locator('[data-xen-header-menu="grid"]').wait_for(timeout=7000)
 assert page.locator('.xen-meta-editor').count()==0,'Meta should close on explicit navigation'
 page.locator('[data-xen-header-menu="grid"]').press('ArrowLeft')
 page.locator('.xen-meta-editor').wait_for(timeout=7000)
 print('PASS six-position navigation Meta -> Grid -> Meta',flush=True)
 page.locator('.xen-meta-editor').press('ArrowLeft')
 page.locator('[data-xen-header-menu="bass"]').wait_for(timeout=7000)
 page.locator('[data-xen-header-menu="bass"]').press('ArrowRight')
 page.locator('.xen-meta-editor').wait_for(timeout=7000)
 assert page.locator('[data-xen-header-menu="bass"]').count()==0
 print('PASS six-position navigation Meta -> Bass -> Meta',flush=True)
 assert not errors,errors
 print('PASS no JS page errors',flush=True)
 browser.close()
