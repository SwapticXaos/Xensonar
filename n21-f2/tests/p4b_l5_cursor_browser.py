"""Isolated Playwright trace of real staged canvas input; diagnostic injection only in browser HTML memory."""
from playwright.sync_api import sync_playwright
from pathlib import Path
import json
root=Path(__file__).resolve().parent.parent
h=(root/'XenSonar_F448_S1_P4B_L5_Cursor_Free_Test.html').read_text()
old='e.commitResonanceCursorY(r,{primeSource:"resonance"})'
assert h.count(old)==1
h=h.replace(old,old+';window.__cursorAudit={focusX:n,focusY:r,ballX:e.nexusRefs.current.cursorX,ballY:e.nexusRefs.current.cursorY,drag:e.activeGridDragStepRef.current}')
old='e.updateFocusCursor(n,r,"mouse"),e.activeGridDragStepRef'
assert h.count(old)==1
h=h.replace(old,'(window.__gridYs=e.getVisibleGridLines().filter(o=>o.stepIndex!==undefined).map(o=>e.yFromFreq(o.freq)),e.updateFocusCursor(n,r,"mouse")),e.activeGridDragStepRef')
report={'checks':[],'errors':[]}
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
 try:
  page=browser.new_page(viewport={'width':1600,'height':1000})
  page.on('pageerror',lambda e:report['errors'].append(str(e)))
  page.evaluate('''() => {let store={};const fake={getItem:k=>store[k]??null,setItem:(k,v)=>{store[k]=String(v)},removeItem:k=>delete store[k],clear:()=>{store={}}};Object.defineProperty(window,'localStorage',{value:fake,configurable:true});Object.defineProperty(window,'sessionStorage',{value:fake,configurable:true});}''')
  page.set_content(h,wait_until='load',timeout=50000)
  page.wait_for_timeout(350)
  canvas=page.locator('canvas[width="1100"][height="580"]')
  assert canvas.count()==1
  rect=canvas.bounding_box();assert rect
  def coords(x,y):return (rect['x']+x/1100*rect['width'],rect['y']+y/580*rect['height'])
  page.mouse.move(*coords(300,220))
  yvals=page.evaluate('window.__gridYs')
  assert yvals and len(yvals)>1,yvals
  y=next((y for y in yvals if 80<y<490),yvals[0]);print('grid y',y)
  for yy in [y-12,y-4,y+3,y+12]:page.mouse.move(*coords(240,yy))
  normal=page.evaluate('window.__cursorAudit')
  assert abs(normal['focusY']-y-12)<2 and abs(normal['ballX']-240)<2,normal
  report['checks'].append('continuous canvas cursor updates when moving across active raster line')
  page.mouse.move(*coords(25,y));page.mouse.down();page.mouse.move(*coords(330,y+20),steps=5)
  during=page.evaluate('window.__cursorAudit')
  assert during['drag'] is not None,during
  assert abs(during['ballX']-330)<2,during
  assert abs(during['focusX']-330)<2,during
  report['checks'].append('grid line edit does not stop free cursor or Wave Starter ball following mouse')
  page.mouse.move(rect['x']+rect['width']+80,rect['y']+60);page.mouse.up()
  page.mouse.move(*coords(380,y+40))
  after=page.evaluate('window.__cursorAudit')
  assert after['drag'] is None and abs(after['ballX']-380)<2,after
  report['checks'].append('release outside stage restores normal playfield input')
  # Simulate an interactive resident overlay on the canvas, attached to the same wrapper.
  page.evaluate('''() => {const canvas=document.querySelector('canvas[width="1100"][height="580"]');const wrapper=canvas.parentElement;const b=document.createElement('button');b.id='pointer-overlay-test';b.textContent='Overlay Hit Target';Object.assign(b.style,{position:'absolute',left:'42%',top:'40%',width:'12%',height:'12%',zIndex:'30',pointerEvents:'auto',background:'#001',color:'white'});wrapper.appendChild(b)}''')
  target=page.locator('#pointer-overlay-test');bb=target.bounding_box()
  page.mouse.move(bb['x']+bb['width']/2,bb['y']+bb['height']/2)
  over=page.evaluate('window.__cursorAudit')
  assert abs(over['focusX']-330*1.6)<45,over
  report['checks'].append('input forwarding survives pointer interception by canvas overlay')
  assert not report['errors'],report['errors']
  report['samples']={'normal':normal,'drag':during,'after':after,'overlay':over}
  print('PASS',json.dumps(report,ensure_ascii=False,indent=2))
 finally:browser.close()
(root/'P4B_L5_CURSOR_BROWSER_REPORT.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
