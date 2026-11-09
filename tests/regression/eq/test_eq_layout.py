"""EQ UI-Integrity: test actual DOM coordinates, overflow, and no wasted control rows.
Run against old P1.2 for RED, new build for GREEN.
"""
from pathlib import Path
from playwright.sync_api import sync_playwright
import json,sys
HTML=Path(sys.argv[1]); output=Path(sys.argv[2]) if len(sys.argv)>2 else None
findings=[]
with sync_playwright() as pw:
 browser=pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage','--autoplay-policy=no-user-gesture-required'])
 for width,height in [(750,714),(1080,768),(1674,896)]:
  page=browser.new_page(viewport={'width':width,'height':height})
  errors=[];page.on('pageerror',lambda err:errors.append(str(err)))
  page.evaluate("""()=>{let store={};Object.defineProperty(window,'localStorage',{configurable:true,get:()=>({getItem:k=>store[k]||null,setItem:(k,v)=>store[k]=String(v),removeItem:k=>delete store[k],clear:()=>store={}})});Object.defineProperty(window,'sessionStorage',{configurable:true,get:()=>({getItem:k=>null,setItem:()=>{}})})}""")
  page.set_content(HTML.read_text(),wait_until='load',timeout=30000)
  page.wait_for_timeout(600)
  page.get_by_role('tab',name='🎸 Bass',exact=True).click()
  page.locator('.xen-eq-trigger').click()
  page.locator('.xen-eq-panel').wait_for()
  info=page.evaluate('''()=>{let panel=document.querySelector('.xen-eq-panel'), flyout=document.querySelector('.xen-eq-flyout');const r=e=>{let a=e.getBoundingClientRect();return {x:a.x,y:a.y,w:a.width,h:a.height,right:a.right,bottom:a.bottom}};let actions=panel.querySelector('.xen-eq-pattern-actions'), tools=panel.querySelector('.xen-eq-shared-tools');return {viewport:[innerWidth,innerHeight],flyout:{...r(flyout),scrollY:flyout.scrollHeight-flyout.clientHeight,scrollX:flyout.scrollWidth-flyout.clientWidth},actions:r(actions),tools:r(tools),controlsRow:panel.querySelector('.xen-eq-command-strip')&&r(panel.querySelector('.xen-eq-command-strip')), allControls:[...panel.querySelectorAll('.xen-eq-pattern-actions button,.xen-eq-shared-tools button')].map(e=>({text:e.textContent,box:r(e)}))}}''')
  findings.append(info)
  assert not errors,errors
  assert info['controlsRow'],f'Missing shared action/tool row at {width}x{height}'
  assert abs(info['actions']['y']-info['tools']['y'])<3,f'Extra vertical row at {width}x{height}: {info}'
  assert info['flyout']['scrollY']<=2,f'Unnecessary vertical scrollbar at {width}x{height}: {info}'
  assert info['flyout']['scrollX']<=2,f'Horizontal overflow at {width}x{height}: {info}'
  assert all(t['box']['right']<=info['flyout']['right']-5 for t in info['allControls']),f'Controls clipped: {info}'
  assert all(t['box']['x']>=info['flyout']['x']+5 for t in info['allControls']),f'Controls clipped left: {info}'
  # Freeze must not make content taller just by showing a status message.
  before=page.locator('.xen-eq-flyout').evaluate('(e)=>e.scrollHeight-e.clientHeight')
  page.get_by_role('button',name='Freeze current EQ A B pattern').click()
  after=page.locator('.xen-eq-flyout').evaluate('(e)=>e.scrollHeight-e.clientHeight')
  assert after<=max(before,2),f'Freeze notice caused scroll at {width}x{height}: {before}->{after}'
  page.close()
 browser.close()
if output: output.write_text(json.dumps(findings,indent=2))
print('PASS EQ UI-Integrity geometry, three viewports, no extra rows, no scroll or clipping')
