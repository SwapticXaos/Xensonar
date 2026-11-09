#!/usr/bin/env python3
"""Real Chromium smoke: input temporarily blocks noncritical cold jobs without breaking boot."""
from pathlib import Path
from playwright.sync_api import sync_playwright
import sys, json
html=Path(sys.argv[1]).read_text()
with sync_playwright() as pw:
 browser=pw.chromium.launch(executable_path='/usr/bin/chromium', headless=True,args=['--no-sandbox','--disable-dev-shm-usage','--autoplay-policy=no-user-gesture-required'])
 page=browser.new_page(viewport={'width':1440,'height':900})
 errors=[]
 page.on('pageerror',lambda e:errors.append(str(e)))
 page.evaluate('''()=>{let m=new Map;let store={getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,''+v),removeItem:k=>m.delete(k),key:i=>[...m.keys()][i],get length(){return m.size}};Object.defineProperty(window,'localStorage',{configurable:true,value:store});Object.defineProperty(window,'sessionStorage',{configurable:true,value:store});Object.defineProperty(window,'indexedDB',{configurable:true,value:{open(){throw Error('No IDB in synthetic browser')}}})}''')
 page.set_content(html,wait_until='domcontentloaded',timeout=85000)
 page.wait_for_function('window.__XenBoot?.state().ready && window.__XenOmegaLiveGate',timeout=60000)
 page.evaluate('''()=>{window.__omegaExecuted=[];document.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true}));window.__omegaStarted=performance.now();window.__omegaCancel=window.__XenBoot.scheduleCold([['omega-test','one']],(lane,id)=>{window.__omegaExecuted.push({lane,id,t:performance.now()-window.__omegaStarted})})}''')
 page.wait_for_timeout(75)
 early=page.evaluate('window.__omegaExecuted.length')
 assert early==0,f'cold task ran during protected input: {early}'
 page.wait_for_function('window.__omegaExecuted.length===1',timeout=9000)
 data=page.evaluate('''()=>({events:window.__XenOmegaLiveGate.state().events,execution:window.__omegaExecuted[0],cold:window.__XenBoot.state().coldDone})''')
 assert data['execution']['t']>=180,data
 assert data['events']>=1,data
 assert not errors,errors[:6]
 print('OMEGA_BOOT_CHROMIUM_PASS',json.dumps(data))
 browser.close()
