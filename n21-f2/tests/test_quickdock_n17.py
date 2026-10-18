"""Regression test of real pointer/native DnD against full standalone HTML.
Use Playwright set_content to avoid network, with temporary storage shims only because
about:blank has an opaque origin. These shims are not part of the shipped XenSonar.
"""
from pathlib import Path
from playwright.sync_api import sync_playwright
import sys, json, traceback

ROOT=Path(__file__).resolve().parent
SHIM='''() => { const m=new Map(), storage={getItem:k=>m.has(k)?m.get(k):null,setItem:(k,v)=>m.set(k,String(v)),removeItem:k=>m.delete(k),clear:()=>m.clear(),get length(){return m.size}}; Object.defineProperty(window,'localStorage',{configurable:true,get:()=>storage}); Object.defineProperty(window,'sessionStorage',{configurable:true,get:()=>storage}); if (!crypto.randomUUID) Object.defineProperty(crypto,'randomUUID',{configurable:true,value:()=> '11111111-1111-4111-8111-'+String(Math.floor(Math.random()*1e12)).padStart(12,'0')}); }'''

def open_app(browser, filename, size):
    page=browser.new_page(viewport={'width':size[0],'height':size[1]})
    page.evaluate(SHIM)
    page.set_content(Path(filename).read_text(),wait_until='load',timeout=30000)
    page.locator('.xen-quick-dock').wait_for(timeout=12000)
    return page

def point(page,part):
    r=page.locator('.xen-quick-dock').bounding_box()
    assert r and r['height']>=30, f'dock geometry {r}'
    return (r['x']+r['width']*part, r['y']+r['height']*.48)

def drag(page, row, dest):
    r=row.bounding_box(); assert r, 'source invisible'
    start=(r['x']+r['width']*.5,r['y']+r['height']*.5)
    page.mouse.move(*start);page.mouse.down()
    page.mouse.move(start[0]+8,start[1]+8,steps=5)
    page.mouse.move(*dest,steps=30)
    page.mouse.up()
    page.wait_for_timeout(180)

def case(page,kind,detail='center'):
    menus={'grid':'button[title="Open Grid Workbench"]','material':'button[title^="Manage Material Track"]',
           'rootFollow':'button[title^="Manage Root Follow"]','drum':'button[title^="Manage Drum"]','bass':'button[title^="Manage Bass"]'}
    page.locator(menus[kind]).first.click()
    page.locator('[data-xen-header-menu="'+kind+'"]').wait_for()
    row=page.locator('[data-xen-quick-kind="'+kind+'"]').first
    assert row.count(),f'{kind} has no native drag source; fixture required'
    row.click()
    # Hover should be visible *while modal is still open*.
    dest=point(page,.70 if detail=='center' else .04)
    page.mouse.move(*dest)
    page.wait_for_timeout(140)
    hint=page.locator('.xen-quick-hover-info')
    assert hint.count() and hint.is_visible(),f'{kind}: tooltip invisible with modal open at {dest}'
    assert 'Ziehe den Eintrag ins Schnellmenü' in hint.inner_text()
    before=page.locator('[data-xen-quick-column="'+kind+'"] .xen-quick-tile').count()
    drag(page,row,dest)
    after=page.locator('[data-xen-quick-column="'+kind+'"] .xen-quick-tile').count()
    assert after==before+1, f'{kind}: drag did not register at {dest}, {before} -> {after}'
    page.keyboard.press('Escape')
    assert page.locator('[data-xen-header-menu]').count()==0,kind+' menu failed to close'
    tile=page.locator('[data-xen-quick-column="'+kind+'"] .xen-quick-tile').last
    tile.click()
    assert page.locator('[data-xen-header-menu]').count()==0,'shortcut reopened library'
    return {'kind':kind,'dest':detail,'drop':'passed','hover':'passed','recall':'passed'}

def check(filename):
    results=[];failures=[]
    with sync_playwright() as pw:
        browser=pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
        for kind,dest,size in [('drum','center',(1740,1000)),('bass','center',(1740,1000)),('grid','center',(1740,1000)),('drum','left',(1740,780)),('bass','center',(1320,850))]:
            if len(sys.argv)>2 and kind+'-'+dest+'-'+str(size[0]) not in sys.argv[2:]:continue
            page=open_app(browser,filename,size)
            try:
                results.append(case(page,kind,dest))
                print('PASS',kind,dest,size,flush=True)
            except Exception as ex:
                failures.append(f'{kind} {dest} {size}: {ex}')
                print('FAIL',kind,dest,size,str(ex)[:500],flush=True)
            finally:page.close()
        browser.close()
    report={'file':str(filename),'pass':results,'fail':failures}
    print(json.dumps(report,ensure_ascii=False,indent=2))
    return 0 if not failures else 1

if __name__=='__main__':
    sys.exit(check(sys.argv[1]))
