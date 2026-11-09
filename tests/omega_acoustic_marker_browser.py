#!/usr/bin/env python3
"""Real UI recording -> green F8 event -> recording marker -> frozen 15s/5s window."""
from pathlib import Path
from playwright.sync_api import sync_playwright
import json,sys
html=Path(sys.argv[1]).read_text()
with sync_playwright() as pw:
 browser=pw.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage','--autoplay-policy=no-user-gesture-required'])
 page=browser.new_page(viewport={'width':1440,'height':900})
 errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.evaluate('''()=>{let m=new Map;let store={getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,''+v),removeItem:k=>m.delete(k),key:i=>[...m.keys()][i],get length(){return m.size}};Object.defineProperty(window,'localStorage',{configurable:true,value:store});Object.defineProperty(window,'sessionStorage',{configurable:true,value:store});Object.defineProperty(window,'indexedDB',{configurable:true,value:{open(){throw Error('No IDB in synthetic browser')}}})}''')
 page.set_content(html,wait_until='domcontentloaded',timeout=85000)
 page.wait_for_function('!!window.XenSonarAcousticSync && !!window.__XenRecorderSyncMark',timeout=60000)
 page.get_by_title('Start Master Recording').click(timeout=15000)
 page.wait_for_function('!!window.XenSonarAcousticSync.read().take',timeout=15000)
 page.evaluate('''()=>window.dispatchEvent(new CustomEvent('xensonar:audible-dropout-marker',{detail:{source:'f8',perfNowMs:performance.now(),room:'RESONANCE'}}))''')
 page.wait_for_function('window.XenSonarAcousticSync.read().markers.length===1',timeout=2000)
 immediate=page.evaluate('''()=>({a:window.XenSonarAcousticSync.read(),events:window.__XENSONAR_BROWSER_IMPLANT_DIAGNOSTICS__.events.filter(v=>v.event==='user-dropout-marker').slice(-1)})''')
 assert len(immediate['a']['runtimeAnchors'])==1
 m=immediate['a']['markers'][0];anchor=immediate['a']['runtimeAnchors'][0]
 assert m['id']==anchor['id'] and m['recordingId']==anchor['recordingId']==immediate['a']['take']['id']
 assert immediate['events'][0]['detail']['recordingMarkerId']==m['id']
 page.wait_for_function('window.XenSonarAcousticSync.read().snapshots.length>0',timeout=12000)
 stored=page.evaluate('''()=>window.XenSonarAcousticSync.read().snapshots[0]''')
 assert stored['id']==m['id'] and stored['windowComplete']
 assert round(stored['windowEndPerfMs']-stored['windowStartPerfMs'])==20000
 assert not errors,errors[:4]
 print('OMEGA ACOUSTIC MARKER BROWSER PASS',json.dumps({'markerId':m['id'],'recordingId':m['recordingId'],'snapshotWindowMs':20000,'pressureBuckets':len(stored.get('pressure',{}).get('points',[]))}))
 browser.close()
