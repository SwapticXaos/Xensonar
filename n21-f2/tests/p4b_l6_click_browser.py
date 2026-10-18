"""Real Chromium A/B: a mousedown without intervening mousemove must update ball and free focus."""
from pathlib import Path
from playwright.sync_api import sync_playwright
import json
root=Path(__file__).resolve().parent.parent
old=(root/'XenSonar_F448_S1_P4B_L5_Cursor_Free_Test.html').read_text()
new=(root/'XenSonar_F448_S1_P4B_L6_Mouse_Click_Target_Test.html').read_text()
needle_old='if(e.updateFocusCursor(n,r,"mouse"),n<30){'
assert old.count(needle_old)==1
old=old.replace(needle_old,'if(e.updateFocusCursor(n,r,"mouse"),window.__auditDown={x:n,y:r,ballX:e.nexusRefs.current.cursorX,ballY:e.nexusRefs.current.cursorY},n<30){')
needle_new='const cursorAtClick={x:n,y:e.commitResonanceCursorY(r,{primeSource:"resonance"})};if(n<30){'
assert new.count(needle_new)==1
new=new.replace(needle_new,'const cursorAtClick={x:n,y:e.commitResonanceCursorY(r,{primeSource:"resonance"})};window.__auditDown={x:n,y:r,ballX:e.nexusRefs.current.cursorX,ballY:e.nexusRefs.current.cursorY,anchor:cursorAtClick};if(n<30){')
results={}
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
 try:
  for label,html in [('L5',old),('L6',new)]:
   page=browser.new_page(viewport={'width':1600,'height':950})
   page.on('pageerror',lambda e:print('PAGE ERROR',label,str(e)[:400]))
   page.on('console',lambda m:print('CONSOLE',label,m.type,m.text[:250]) if m.type=='error' else None)
   page.evaluate("""() => {let store={};const fake={getItem:k=>store[k]??null,setItem:(k,v)=>{store[k]=String(v)},removeItem:k=>delete store[k],clear:()=>{store={}}};Object.defineProperty(window,'localStorage',{value:fake,configurable:true});Object.defineProperty(window,'sessionStorage',{value:fake,configurable:true});}""")
   page.set_content(html,wait_until='domcontentloaded',timeout=60000)
   page.wait_for_timeout(600)
   print(label,"canvases",page.locator("canvas").count(),"body",page.locator("body").inner_text()[:220])
   canvas=page.locator('canvas[width="1100"][height="580"]')
   assert canvas.count()==1
   rect=canvas.bounding_box()
   x=rect['x']+420/1100*rect['width']; y=rect['y']+180/580*rect['height']
   # dispatch_event intentionally does NOT generate a preceding mousemove, unlike physical page.mouse.click.
   page.dispatch_event('canvas[width="1100"][height="580"]','mousedown',{'clientX':x,'clientY':y,'button':0})
   result=page.evaluate('window.__auditDown')
   assert result, label
   results[label]=result
   page.close()
  assert abs(results['L5']['y']-results['L5']['ballY'])>50,results
  assert abs(results['L6']['x']-results['L6']['ballX'])<.1,results
  assert abs(results['L6']['ballY']-results['L6']['anchor']['y'])<.1,results
  assert abs(results['L6']['ballY']-results['L6']['y'])<30,results
  print('PASS chromium A/B no mousemove: old ball stale vs L6 follows exact click point',json.dumps(results,indent=2))
 finally:
  browser.close()
(root/'P4B_L6_CLICK_BROWSER_REPORT.json').write_text(json.dumps(results,ensure_ascii=False,indent=2)+'\n')
