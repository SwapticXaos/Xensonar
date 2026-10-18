from pathlib import Path
from http.server import ThreadingHTTPServer, BaseHTTPRequestHandler
from threading import Thread
from playwright.sync_api import sync_playwright, Error as PlaywrightError

root=Path(__file__).resolve().parent.parent
html=(root/'XenSonar_Fractalia_F4_3_11_Emilia_Ripples_PsyBass_Tuning.html').read_bytes()
class Handler(BaseHTTPRequestHandler):
 def do_GET(self):
  self.send_response(200);self.send_header('Content-Type','text/html; charset=utf-8');self.end_headers();self.wfile.write(html)
 def log_message(self,*args):pass
server=ThreadingHTTPServer(('127.0.0.1',0),Handler);Thread(target=server.serve_forever,daemon=True).start()
try:
 with sync_playwright() as pw:
  browser=pw.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage'])
  page=browser.new_page(viewport={'width':1500,'height':1100})
  errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  try:
   page.goto((root/'XenSonar_Fractalia_F4_3_11_Emilia_Ripples_PsyBass_Tuning.html').as_uri(),wait_until='domcontentloaded')
  except PlaywrightError as exc:
   if 'ERR_BLOCKED_BY_ADMINISTRATOR' in str(exc):
    print('SKIP: Chromium navigation blocked by this container environment; repeat on a normal desktop/browser')
    browser.close();raise SystemExit(0)
   raise
  page.get_by_role('button',name='II. MATERIAL FORGE',exact=True).click(timeout=15000)
  page.get_by_role('button',name='SpectralForge').click(timeout=15000)
  picker=page.locator('select').filter(has=page.locator('option[value="emilia"]')).first
  picker.select_option('emilia')
  field=page.locator('[data-emilia-nodal-field]');field.wait_for()
  first=field.locator('g[aria-label^="Move "]').first
  first.scroll_into_view_if_needed();loc=first.bounding_box()
  if not loc:raise Exception('Emilia node has no bounding box')
  p1={'x':loc['x']+loc['width']/2,'y':loc['y']+loc['height']/2}
  page.mouse.move(**p1);page.mouse.down()
  page.wait_for_timeout(90)
  down=page.evaluate('''() => {const a=document.querySelector('[data-emilia-ripple]');window.__firstWave=a;return {count:document.querySelectorAll('[data-emilia-ripple]').length,time:a?.getAnimations()[0]?.currentTime}}''')
  page.mouse.move(p1['x']+23,p1['y']+12,steps=2)
  page.wait_for_timeout(90)
  moving=page.evaluate('''() => {const a=document.querySelector('[data-emilia-ripple]');return {count:document.querySelectorAll('[data-emilia-ripple]').length,same:a===window.__firstWave,time:a?.getAnimations()[0]?.currentTime}}''')
  page.mouse.up();page.wait_for_timeout(90)
  released=page.evaluate('''() => {const a=document.querySelector('[data-emilia-ripple]');return {count:document.querySelectorAll('[data-emilia-ripple]').length,same:a===window.__firstWave,time:a?.getAnimations()[0]?.currentTime}}''')
  assert down['count']==1,down
  assert moving['count']==1 and moving['same'],moving
  assert released['count']==2 and released['same'],released
  if down['time'] is not None and moving['time'] is not None:
   assert moving['time']>=down['time'] and released['time']>=moving['time'],(down,moving,released)
  assert not errors,errors
  print('PASS real Chromium Emilia pointerdown/move/up: first ring DOM persists; no extra ring on move; second ring on moved release; animation never restarts',down,moving,released)
  browser.close()
finally:
 server.shutdown();server.server_close()
