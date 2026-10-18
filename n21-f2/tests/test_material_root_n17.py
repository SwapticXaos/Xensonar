from playwright.sync_api import sync_playwright
from pathlib import Path
from test_quickdock_n17 import SHIM,point,drag
import sys,json
file=Path(sys.argv[1])
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
 page=b.new_page(viewport={'width':1740,'height':1000})
 page.evaluate(SHIM)
 page.set_content(file.read_text(),wait_until='load',timeout=30000)
 page.locator('.xen-quick-dock').wait_for(timeout=10000)
 for kind in ['material','rootFollow']:
  print('kind',kind,flush=True)
  btn=page.locator('button[title^="Manage Material Track"]' if kind=='material' else 'button[title^="Manage Root Follow"]')
  try:
   btn.first.click(timeout=12000)
   page.locator(f'[data-xen-header-menu="{kind}"]').wait_for(timeout=10000)
   print('file inputs',page.locator('input[type=file][accept="audio/*"]').count(),flush=True)
   page.locator('input[type=file][accept="audio/*"]').first.set_input_files(str(Path(__file__).resolve().parent/'fixtures/n17_quickdock_fixture.wav'),timeout=8000)
   page.locator(f'[data-xen-quick-kind="{kind}"]').first.wait_for(timeout=9000)
   row=page.locator(f'[data-xen-quick-kind="{kind}"]').first
   row.click();page.mouse.move(*point(page,.70));page.wait_for_timeout(100)
   assert page.locator('.xen-quick-hover-info').is_visible(),kind+' tooltip failed'
   drag(page,row,point(page,.70))
   assert page.locator(f'[data-xen-quick-column="{kind}"] .xen-quick-tile').count()==1,kind+' failed drag'
   page.keyboard.press('Escape')
   page.locator(f'[data-xen-quick-column="{kind}"] .xen-quick-tile').first.click()
   assert page.locator('[data-xen-header-menu]').count()==0
   print('PASS',kind,flush=True)
  except Exception as e:
   print('FAIL',kind,str(e)[:500],flush=True)
   break
 b.close()
