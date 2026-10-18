"""Browser acceptance contract for P4B-L4.
Run: python tests/p4b_l4_browser_acceptance.py
Requires installed Python playwright and chromium. Uses isolated localStorage.
"""
from pathlib import Path
from playwright.sync_api import sync_playwright
import json, sys
root=Path(__file__).resolve().parent.parent
html=(root/json.loads((root/'source-manifest.json').read_text())['entry']).read_text()
report={'checks':[],'errors':[]}

def bootstrap(pg, store=None):
    seed=json.dumps(store or {})
    pg.evaluate('''seed => {let store=JSON.parse(seed);const fake={getItem:k=>store[k]??null,setItem:(k,v)=>{store[k]=String(v)},removeItem:k=>delete store[k],clear:()=>{store={}}};Object.defineProperty(window,'localStorage',{value:fake,configurable:true});Object.defineProperty(window,'sessionStorage',{value:fake,configurable:true});window.__fixtureRead=()=>JSON.parse(JSON.stringify(store));let id=0;crypto.randomUUID=()=>('10000000-0000-4000-8000-'+String(++id).padStart(12,'0'));}''',seed)
    pg.set_content(html,wait_until='load',timeout=35000)
    pg.wait_for_timeout(500)

def open_melodic(pg):
    pg.get_by_role('button',name='II. MATERIAL FORGE').click()
    pg.get_by_role('button',name='SYNTHETICFORGE',exact=False).first.click()
    pg.get_by_text('Melodic Loop',exact=True).first.click()
    pg.wait_for_timeout(250)
    assert pg.locator('.melodic-import-sounds-stack').count()==1

def grid_contract(pg,count):
    cells=pg.locator('.melodic-instrument-pairgrid > *')
    assert cells.count()==count+1,(cells.count(),count)
    labels=pg.locator('.melodic-instrument-pairgrid label')
    text=pg.locator('.melodic-instrument-pairgrid').inner_text()
    for n in range(1,count+1):assert f'INSTRUMENT {n} SOUND' in text,(n,text[:400])
    if count<8:assert pg.get_by_role('button',name='Add Instrument').count()==1
    else:assert pg.get_by_role('button',name='Add Instrument').count()==0
    if count==4:assert pg.get_by_role('button',name='Remove last additional instrument').count()==0
    else:assert pg.get_by_role('button',name='Remove last additional instrument').count()==1
    manager=pg.locator('.melodic-import-sounds-stack')
    assert manager.inner_text().lower().count('import sounds')==1
    assert manager.inner_text().count('Nodal · Manage')==1
    assert manager.inner_text().count('Entrophon · Manage')==1
    nodal=manager.get_by_role('button',name='Nodal · Manage')
    ent=manager.get_by_role('button',name='Entrophon · Manage')
    assert nodal.count()==1 and ent.count()==1
    nb,eb=nodal.bounding_box(),ent.bounding_box()
    assert abs(nb['x']-eb['x'])<2 and 0 < eb['y']-nb['y'] < 62,(nb,eb)
    # More than four instruments belong to row 2, not a wrapped fifth on row 1.
    if count>4:
        cards=pg.locator('.melodic-instrument-pairgrid > *')
        fifth=cards.nth(5).bounding_box(); first=cards.nth(0).bounding_box(); fourth=cards.nth(3).bounding_box()
        assert fifth['y']>first['y']+18,(fifth,first)
        assert fifth['x']<fourth['x'],(fifth,fourth)
    return nb,eb

with sync_playwright() as p:
    b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
    try:
        page=b.new_page(viewport={'width':1740,'height':1000})
        page.on('pageerror',lambda ex: report['errors'].append(str(ex)))
        bootstrap(page)
        # MAIN is internally named RESONANCE; gear is collapsed by default.
        gear=page.locator('[data-runtime-diagnostic-collapsed="true"]')
        assert gear.count()==1,'Gear must be visible in main (RESONANCE)'
        gear_bb=gear.bounding_box();assert gear_bb['x']<60 and gear_bb['y']>900
        page.screenshot(path=str(root/'P4B_L4_main_gear.png'))
        gear.click();assert page.locator('[data-runtime-diagnostic-expanded="true"]').count()==1
        page.get_by_role('button',name='II. MATERIAL FORGE').click()
        assert page.locator('[data-xensonar-browser-wave-starter-implant]').count()==0,'No gear or panel in forge'
        page.get_by_role('button',name='I. XENSONAR MAIN ROOM').click()
        assert gear.count()==1,'Gear reappears after returning to main'
        report['checks'].append('real MAIN room = RESONANCE: gear visible, hidden in FORGE, restored on return')
        open_melodic(page)
        grid_contract(page,4)
        assert page.get_by_role('button',name='Add Instrument').count()==1
        assert len(page.locator('.melodic-added-instrument').all())==0
        assert page.locator('input[aria-label$=" volume"]').count()==4
        report['checks'].append('fresh composer: exactly 4 slots and empty second row, import managers stacked')
        page.screenshot(path=str(root/'P4B_L4_4_instruments.png'))
        for count in range(5,9):
            page.get_by_role('button',name='Add Instrument').click()
            grid_contract(page,count)
        assert page.locator('input[aria-label$=" volume"]').count()==8
        report['checks'].append('Add Instrument sequentially creates 5..8 with stable managers and separate faders')
        page.screenshot(path=str(root/'P4B_L4_8_instruments.png'))
        page.on('dialog',lambda d:d.accept('L4 Saved Eight'))
        page.get_by_role('button',name='Save as Project File').click()
        page.wait_for_timeout(250)
        snap=page.evaluate('window.__fixtureRead()')
        assert len(json.loads(snap.get('xensonar-melodic-loop-projects-v1','[]')))==1
        for count in range(7,3,-1):
            page.get_by_role('button',name='Remove last additional instrument').click()
            grid_contract(page,count)
        assert page.locator('input[aria-label$=" volume"]').count()==4
        report['checks'].append('extra slots can be reversed 8→4, without hiding four originals')
        # The important stateful regression: simulate a return with a previously saved eight-track state.
        another=b.new_page(viewport={'width':1740,'height':1000})
        another.on('pageerror',lambda ex:report['errors'].append(str(ex)))
        bootstrap(another,snap)
        open_melodic(another)
        saved=another.locator('select').filter(has=another.locator('option',has_text='Projekt 1')).first
        assert saved.count()==1,'Saved project must be offered for explicit selection'
        saved.select_option(label='Projekt 1')
        another.wait_for_timeout(200)
        count=another.locator('.melodic-instrument-pairgrid > *').count()-1
        report['restored_slots']=count
        # If workspace storage is not persisted automatically, ensure we don't falsely claim restore tested.
        assert count==8,('Expected saved 8-track working copy but found',count, list(snap.keys()))
        grid_contract(another,8)
        report['checks'].append('existing saved 8-track state remains intact and offers reversible removal')
        another.screenshot(path=str(root/'P4B_L4_persisted_8_instruments.png'))
        assert not report['errors'],report['errors']
        report['checks'].append('no JS pageerrors in all scenarios')
    finally:
        b.close()
(root/'P4B_L4_BROWSER_REPORT.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
print('PASS',json.dumps(report,ensure_ascii=False,indent=2))
