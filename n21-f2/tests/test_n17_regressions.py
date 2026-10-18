from pathlib import Path
from playwright.sync_api import sync_playwright
from test_quickdock_n17 import SHIM,point,drag
import json,sys
filename=Path(sys.argv[1])
results=[]
with sync_playwright() as pw:
 b=pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
 pg=b.new_page(viewport={'width':1740,'height':1000});errors=[];pg.on('pageerror',lambda e:errors.append(str(e)))
 pg.evaluate(SHIM);pg.set_content(filename.read_text(),wait_until='load',timeout=30000);pg.locator('.xen-quick-dock').wait_for(timeout=12000)
 pg.locator('button[title^="Manage Root Follow"]').first.click()
 pg.locator('[data-xen-header-menu="rootFollow"]').wait_for(timeout=6000)
 for direction,kind in [('ArrowRight','drum'),('ArrowRight','bass'),('ArrowRight','grid'),('ArrowLeft','bass'),('ArrowLeft','drum'),('ArrowLeft','rootFollow'),('ArrowLeft','material')]:
  pg.keyboard.press(direction)
  pg.locator('[data-xen-header-menu="'+kind+'"]').wait_for(timeout=5000)
  assert pg.locator('[data-xen-header-menu]').count()==1,'multiple menus opened'
 results.append('left-right window navigation and wrap')
 pg.keyboard.press('Escape')
 pg.locator('[data-xen-header-menu]').first.wait_for(state='detached',timeout=6000)
 # Check explicit octave controls retained and independent.
 down=pg.locator('[aria-label="Particles octave up"]')
 candidates=pg.locator('[aria-label$="octave up"]')
 assert candidates.count()>=3, 'three independent octave controllers missing'
 names=[i.get_attribute('aria-label') for i in candidates.all()]
 assert len(set(names))==len(names),f'octave identity duplicated {names}'
 results.append('independent octave controllers '+', '.join(names))
 pg.locator('button[title^="Manage Bass"]').first.click()
 pg.locator('[data-xen-header-menu="bass"]').wait_for()
 row=pg.locator('[data-xen-quick-kind="bass"]').first
 row.click()
 assert pg.locator('.xen-quick-signal').count()>=1
 drag(pg,row,point(pg,.70))
 tile=pg.locator('[data-xen-quick-column="bass"] .xen-quick-tile').first
 assert tile.count()==1
 # CSS hitbox may not mask parent dialogs because we add no drop proxy.
 assert pg.locator('.xen-quick-drop-proxy').count()==0
 assert pg.locator('.xen-quick-hover-info').evaluate('(e)=>getComputedStyle(e).pointerEvents')=='none'
 results.append('no modal-covering drop proxy; tooltip is pointer-inert')
 pg.keyboard.press('Escape')
 tile.click(button='right')
 assert pg.locator('.xen-quick-confirm').count()==1
 pg.get_by_role('button',name='Abbrechen',exact=True).click()
 assert tile.count()==1
 tile.click(button='right')
 pg.get_by_role('button',name='Entfernen',exact=True).click()
 assert tile.count()==0
 results.append('right-click deletion confirm/cancel')
 assert not errors,errors[:3]
 results.append('no page exceptions')
 b.close()
print(json.dumps({'results':results,'status':'PASS'},indent=2,ensure_ascii=False))
