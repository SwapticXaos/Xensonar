import os
from pathlib import Path
import json
from playwright.sync_api import sync_playwright
html=Path(__file__).resolve().parents[1].joinpath(json.loads(Path(__file__).resolve().parents[1].joinpath('source-manifest.json').read_text())['entry']).read_text()
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path=os.environ.get('XEN_CHROMIUM_PATH','/usr/bin/chromium'),args=['--no-sandbox','--disable-dev-shm-usage'])
 page=browser.new_page(viewport={'width':1440,'height':900})
 page.evaluate('''() => {const m=new Map();const store={getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,String(v)),removeItem:k=>m.delete(k),clear:()=>m.clear(),key:i=>[...m.keys()][i]??null,get length(){return m.size}};Object.defineProperty(window,'localStorage',{configurable:true,value:store});Object.defineProperty(window,'sessionStorage',{configurable:true,value:store})}''')
 page.set_content(html,wait_until='domcontentloaded',timeout=30000)
 page.locator('button[aria-label="Meta-Menu"]').click()
 page.locator('.xen-meta-tabs [role="tab"]').nth(1).click()
 result=page.evaluate('''() => {const link=document.querySelector('.xen-meta-library-open-manager'),path=document.querySelector('.xen-meta-source-menu svg path'),a=getComputedStyle(link),b=getComputedStyle(path);return {background:a.backgroundColor,border:a.borderTopColor,cornerFill:b.fill,cornerStroke:b.stroke,cornerOpacity:b.strokeOpacity}}''')
 print(result)
 assert result['background']=='rgb(76, 49, 108)',result
 assert result['cornerFill']=='rgb(76, 49, 108)',result
 assert result['cornerStroke']=='rgb(167, 139, 250)',result
 page.screenshot(path='/workspace/Xensonar/n21-f2/results/sessions-reviewed/P735_F1_OriginalViolet_Library.png')
 print('PASS real computed UI uses original violets')
 browser.close()
