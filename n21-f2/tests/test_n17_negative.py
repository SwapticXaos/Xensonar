from pathlib import Path
from playwright.sync_api import sync_playwright
from test_quickdock_n17 import SHIM,point,drag
import sys
f=Path(sys.argv[1])
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
 pg=b.new_page(viewport={'width':1740,'height':1000});pg.evaluate(SHIM)
 pg.set_content(f.read_text(),wait_until='load',timeout=30000);pg.locator('.xen-quick-dock').wait_for(timeout=12000)
 pg.locator('button[title^="Manage Bass"]').first.click()
 row=pg.locator('[data-xen-quick-kind="bass"]').first
 row.wait_for(timeout=12000)
 drag(pg,row,(550,890))
 assert pg.locator('.xen-quick-tile').count()==0,'drop outside target accidentally registered'
 pg.mouse.move(550,890)
 assert not pg.locator('.xen-quick-hover-info').is_visible(),'tooltip persisted outside target'
 assert pg.locator('[data-xen-header-menu="bass"]').count()==1,'dialog unexpectedly closed'
 assert pg.locator('.xen-quick-drop-proxy').count()==0,'intercepting proxy reintroduced'
 print('PASS negative: unrelated drop ignored, tooltip hides, modal stays open, no overlay')
 b.close()
