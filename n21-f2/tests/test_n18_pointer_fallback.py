"""N18: leftward pointer export out of open modal, no browser native drag dependency.
Regression: must fail on N17 because .xen-quick-pointer-ghost is absent.
"""
import sys
from pathlib import Path
from playwright.sync_api import sync_playwright
from test_quickdock_n17 import open_app,point

MENU={'drum':'button[title^="Manage Drum"]','bass':'button[title^="Manage Bass"]',
      'grid':'button[title="Open Grid Workbench"]'}

def test_one(browser,filename,kind):
 page=open_app(browser,filename,(1740,950)); page.set_default_timeout(8000)
 try:
  page.locator(MENU[kind]).first.click()
  page.locator(f'[data-xen-header-menu="{kind}"]').wait_for()
  row=page.locator(f'[data-xen-quick-kind="{kind}"]').first
  row.wait_for(state='visible')
  # Clear app state through DOM, not storage. The old and new versions start empty in isolated pages.
  prior=page.locator(f'[data-xen-quick-column="{kind}"] .xen-quick-tile').count()
  box=row.bounding_box(); assert box,kind
  start=(box['x']+box['width']*.72,box['y']+box['height']*.50)
  dest=point(page,.67)
  page.mouse.move(*start);page.mouse.down()
  # Do not lead rightwards or use Playwright dragTo native shortcut.
  page.mouse.move(start[0]-13,start[1],steps=7)
  assert page.locator('.xen-quick-pointer-ghost').count()==1, f'{kind}: pointer export did not start'
  # Drag crosses left edge of menu into the dock without native DataTransfer.
  page.mouse.move(*dest,steps=26)
  assert page.locator('.xen-quick-pointer-over').count()==1, f'{kind}: dock not recognized'
  page.mouse.up()
  page.wait_for_timeout(100)
  assert page.locator(f'[data-xen-quick-column="{kind}"] .xen-quick-tile').count()==prior+1, f'{kind}: export failed'
  assert page.locator('.xen-quick-pointer-ghost').count()==0, f'{kind}: ghost leaked'
  assert page.locator(f'[data-xen-header-menu="{kind}"]').count()==1, f'{kind}: menu closed when exporting'
  page.keyboard.press('Escape')
  page.locator(f'[data-xen-header-menu="{kind}"]').wait_for(state='detached')
  page.locator(f'[data-xen-quick-column="{kind}"] .xen-quick-tile').last.click()
  assert page.locator('[data-xen-header-menu]').count()==0,f'{kind}: quick selection reopened menu'
  print('PASS leftward pointer export',kind,flush=True)
 finally:page.close()

def test_cancel(browser,filename):
 page=open_app(browser,filename,(1740,950));page.set_default_timeout(8000)
 try:
  page.locator(MENU['drum']).first.click();row=page.locator('[data-xen-quick-kind="drum"]').first
  before=page.locator('[data-xen-quick-column="drum"] .xen-quick-tile').count();r=row.bounding_box()
  start=(r['x']+r['width']*.7,r['y']+r['height']*.5)
  page.mouse.move(*start);page.mouse.down();page.mouse.move(start[0]-16,start[1],steps=6)
  assert page.locator('.xen-quick-pointer-ghost').count()==1
  page.keyboard.press('Escape');page.mouse.up()
  assert page.locator('.xen-quick-pointer-ghost').count()==0
  assert page.locator('[data-xen-quick-column="drum"] .xen-quick-tile').count()==before
  print('PASS cancel/export cleanup',flush=True)
 finally:page.close()


def test_outside(browser,filename):
 page=open_app(browser,filename,(1740,950));page.set_default_timeout(8000)
 try:
  page.locator(MENU['drum']).first.click()
  row=page.locator('[data-xen-quick-kind="drum"]').first
  before=page.locator('[data-xen-quick-column="drum"] .xen-quick-tile').count()
  box=row.bounding_box();start=(box['x']+box['width']*.75,box['y']+box['height']*.5)
  page.mouse.move(*start);page.mouse.down();page.mouse.move(start[0]-14,start[1],steps=7)
  assert page.locator('.xen-quick-pointer-ghost').count()==1
  page.mouse.move(470,790,steps=24);page.mouse.up()
  assert page.locator('[data-xen-quick-column="drum"] .xen-quick-tile').count()==before
  assert page.locator('.xen-quick-pointer-ghost').count()==0
  print('PASS outside-target drop ignored',flush=True)
 finally:page.close()

if __name__=='__main__':
 with sync_playwright() as pw:
  br=pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
  for kind in ['drum','bass','grid']:test_one(br,Path(sys.argv[1]),kind)
  test_cancel(br,Path(sys.argv[1]))
  test_outside(br,Path(sys.argv[1]))
  br.close()
