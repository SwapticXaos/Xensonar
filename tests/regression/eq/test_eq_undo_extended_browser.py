"""Undo spans Raster Paint, MWCM Warp, Reset while keeping A/B independent."""
from playwright.sync_api import sync_playwright
from pathlib import Path
import sys
HTML=Path(sys.argv[1]).read_text()
with sync_playwright() as pw:
 b=pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
 page=b.new_page(viewport={'width':1280,'height':960})
 errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.evaluate('''()=>{let store={};Object.defineProperty(window,'localStorage',{configurable:true,get:()=>({getItem:k=>store[k]||null,setItem:(k,v)=>store[k]=String(v),removeItem:k=>delete store[k],clear:()=>store={}})});Object.defineProperty(window,'sessionStorage',{configurable:true,get:()=>({getItem:k=>null,setItem:()=>{}})})}''')
 page.set_content(HTML,wait_until='load',timeout=30000)
 page.wait_for_timeout(450)
 page.get_by_role('tab',name='🎸 Bass',exact=True).click();page.locator('.xen-eq-trigger').click()
 pane=page.locator('.xen-eq-panel');page.get_by_role('button',name='Raster EQ fixed frequency bands').click();page.get_by_role('button',name='Paint EQ curves').click()
 key=pane.get_attribute('data-eq-source');assert key
 def cv():return page.evaluate('k=>{const c=window.XenSonarEQ.get(k);return {a:c.a,b:c.b,mode:c.mode}}',key)
 def stroke(lane,xa,xb,yr):
  canvas=pane.locator('.xen-eq-profile').nth(0 if lane=='a' else 1).locator('canvas');bb=canvas.bounding_box();assert bb
  y=bb['y']+bb['height']*yr;x=bb['x']+bb['width']*xa;x2=bb['x']+bb['width']*xb
  page.mouse.move(x,y);page.mouse.down();page.mouse.move(x2,y,steps=4);page.mouse.up()
 def undo(lane):pane.locator('.xen-eq-profile').nth(0 if lane=='a' else 1).get_by_role('button',name='Undo').click()
 def reset(lane):pane.locator('.xen-eq-profile').nth(0 if lane=='a' else 1).get_by_role('button',name='Reset All').click()
 baseline=cv();stroke('a',.20,.32,.15);state1=cv();assert state1['a']!=baseline['a']
 stroke('a',.44,.50,.85);state2=cv();assert state2['a']!=state1['a']
 stroke('b',.10,.20,.20);state3=cv();assert state3['b']!=baseline['b']
 undo('a');assert cv()['a']==state1['a'],'first Undo in A must restore previous A stroke';assert cv()['b']==state3['b'],'A undo affects B'
 undo('b');assert cv()['b']==baseline['b'],'B Undo failed'
 undo('a');assert cv()['a']==baseline['a'],'second Undo A failed'
 stroke('a',.35,.46,.13);state4=cv();reset('a');assert cv()['a']==baseline['a'],'reset A failed';undo('a');assert cv()['a']==state4['a'],'Reset should be undoable'
 page.get_by_role('button',name='Adaptive EQ free filter allocation').click();assert cv()['a']==state4['a']
 page.get_by_role('button',name='Morph Warp EQ curves').click()
 stroke('a',.33,.48,.39);postwarp=cv();assert postwarp['a']!=state4['a'],'Morph/Warp gesture failed to change curve'
 undo('a');assert cv()['a']==state4['a'],'Undo of Morph/Warp after raster & mode switch failed'
 assert not errors,errors
 print('PASS multiple undo raster A/B, reset undo, adaptive mode switch, warp undo')
 b.close()
