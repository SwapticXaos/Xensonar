import os
from pathlib import Path
import json
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1]
html=(root/json.loads((root/'source-manifest.json').read_text())['entry']).read_text()
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path=os.environ.get('XEN_CHROMIUM_PATH','/usr/bin/chromium'),args=['--no-sandbox','--disable-dev-shm-usage'])
 for width in [1440,960,760]:
  page=browser.new_page(viewport={'width':width,'height':860});errors=[]
  page.on('pageerror',lambda e:errors.append(str(e)))
  page.evaluate('''() => {const m=new Map();const store={getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,String(v)),removeItem:k=>m.delete(k),clear:()=>m.clear(),key:i=>[...m.keys()][i]??null,get length(){return m.size}};Object.defineProperty(window,'localStorage',{configurable:true,value:store});Object.defineProperty(window,'sessionStorage',{configurable:true,value:store})}''')
  page.set_content(html,wait_until='domcontentloaded',timeout=30000)
  page.locator('button[aria-label="Meta-Menu"]').click()
  assert page.locator('.xen-meta-source-menu').count()==5
  for i,name,kind in [(0,'Threadboard','grid'),(1,'Material Track','material'),(2,'Root Follow Loop','rootFollow'),(3,'Drums','drum'),(4,'Bass','bass')]:
   page.locator('.xen-meta-tabs [role="tab"]').nth(i).click()
   link=page.locator('.xen-meta-library-open-manager')
   assert name in link.inner_text(),(kind,link.inner_text())
   search=page.locator('input[aria-label="Search library"]');search.focus()
   details=page.evaluate('''() => {const i=document.querySelector('input[aria-label="Search library"]'),l=document.querySelector('.xen-meta-browser-heading'),r=i.getBoundingClientRect(),h=l.getBoundingClientRect();return {top:r.top,bottom:r.bottom,headingTop:h.top,headingBottom:h.bottom,focus:getComputedStyle(i).outlineWidth,visible:document.elementFromPoint(r.left+r.width/2,r.top+2)?.closest('input')===i}}''')
   assert details['top']>=details['headingTop']+4,(width,kind,details)
   assert details['bottom']<=details['headingBottom']+2,(width,kind,details)
   assert details['focus']=='2px',(width,kind,details)
   assert details['visible'],(width,kind,'filter top edge obscured',details)
   if width==1440 and kind in ['material','rootFollow']:
    page.screenshot(path=f'/workspace/Xensonar/n21-f2/results/sessions-reviewed/P733_{kind}_library.png')
   link.click(timeout=12000)
   page.locator(f'[data-xen-header-menu="{kind}"]').wait_for(timeout=7000)
   assert page.locator('.xen-meta-editor').count()==1
   page.locator(f'[data-xen-header-menu="{kind}"]').press('Escape')
   page.locator(f'[data-xen-header-menu="{kind}"]').wait_for(state='detached',timeout=7000)
   assert page.locator('.xen-meta-editor').count()==1
   if width==1440:
    corner=page.locator('.xen-meta-source-menu').nth(i)
    assert corner.locator('svg path[d="M2 2 H30 V30 Z"]').count()==1
    corner.click(timeout=12000)
    page.locator(f'[data-xen-header-menu="{kind}"]').wait_for(timeout=7000)
    page.locator(f'[data-xen-header-menu="{kind}"]').press('Escape')
    page.locator(f'[data-xen-header-menu="{kind}"]').wait_for(state='detached',timeout=7000)
   print('PASS',width,kind,'library link + unobscured filter'+(' + corner link' if width==1440 else ''),flush=True)
  assert not errors,(width,errors)
  page.close()
 browser.close()
