"""N18 pointer export: real WAV libraries + native vertical sorting preservation."""
from pathlib import Path
from playwright.sync_api import sync_playwright
from test_quickdock_n17 import open_app,point
import sys

def run_wav(br,f,kind):
 p=open_app(br,f,(1740,950));p.set_default_timeout(9000)
 try:
  p.locator('button[title^="Manage Material Track"]' if kind=='material' else 'button[title^="Manage Root Follow"]').first.click()
  p.locator('input[type=file][accept="audio/*"]').first.set_input_files(str(Path(__file__).resolve().parent/'fixtures/n17_quickdock_fixture.wav'))
  row=p.locator(f'[data-xen-quick-kind="{kind}"]').first
  row.wait_for(state='visible')
  box=row.bounding_box();assert box
  sx=box['x']+box['width']*.73;sy=box['y']+box['height']*.5
  dest=point(p,.70)
  p.mouse.move(sx,sy);p.mouse.down();p.mouse.move(sx-14,sy,steps=7)
  assert p.locator('.xen-quick-pointer-ghost').count()==1
  p.mouse.move(*dest,steps=22)
  assert p.locator('.xen-quick-pointer-over').count()==1
  p.mouse.up()
  assert p.locator(f'[data-xen-quick-column="{kind}"] .xen-quick-tile').count()==1
  assert p.locator('.xen-quick-pointer-ghost').count()==0
  print('PASS WAV pointer export',kind,flush=True)
 finally:p.close()

def run_vertical(br,f):
 p=open_app(br,f,(1740,950));p.set_default_timeout(9000)
 try:
  p.locator('button[title^="Manage Drum"]').first.click()
  row=p.locator('[data-xen-quick-kind="drum"]').first
  box=row.bounding_box();assert box
  # Source drag 20 pixels vertically; must NOT create a quick export ghost.
  p.evaluate('''() => {window.__nativeDrags=[];window.addEventListener('dragstart',e=>{
   if(e.target?.closest('[data-xen-quick-kind="drum"]'))window.__nativeDrags.push({type:e.type,prevented:e.defaultPrevented})
  },true)}''')
  x=box['x']+box['width']*.5;y=box['y']+box['height']*.5
  p.mouse.move(x,y);p.mouse.down();p.mouse.move(x,y+28,steps=12)
  assert p.locator('.xen-quick-pointer-ghost').count()==0,'vertical reorder hijacked by quick export'
  assert len(p.evaluate('window.__nativeDrags'))>0,'native vertical dragstart not delivered'
  p.mouse.up()
  print('PASS vertical native drag preserved',flush=True)
 finally:p.close()

if __name__=='__main__':
 with sync_playwright() as pw:
  br=pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
  for kind in ['material','rootFollow']:run_wav(br,Path(sys.argv[1]),kind)
  run_vertical(br,Path(sys.argv[1]));br.close()
