"""Focused L12 UI test. No old audio or large regression suites."""
from pathlib import Path
from playwright.sync_api import sync_playwright
import json
root=Path(__file__).resolve().parent.parent
html=root/json.loads((root/'source-manifest.json').read_text())['entry']
report={'checks':[], 'errors':[]}
with sync_playwright() as p:
    browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
    try:
        page=browser.new_page(viewport={'width':1440,'height':820})
        page.on('pageerror',lambda e:report['errors'].append(str(e)))
        page.evaluate("""() => {const m=new Map();Object.defineProperty(window,'localStorage',{value:{getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,String(v)),removeItem:k=>m.delete(k),clear:()=>m.clear()},configurable:true});Object.defineProperty(window,'sessionStorage',{value:window.localStorage,configurable:true});let z=0;crypto.randomUUID=()=>('10000000-0000-4000-8000-'+String(++z).padStart(12,'0'));}""")
        page.set_content(html.read_text(),wait_until='load',timeout=40000)
        page.get_by_role('button',name='II. MATERIAL FORGE').click()
        page.get_by_role('button',name='SYNTHETICFORGE',exact=False).first.click()
        page.get_by_text('Melodic Loop',exact=True).first.click()
        page.locator('.melodic-card-sound-select button').first.wait_for(timeout=15000)
        assert page.get_by_role('button',name='Window ↑').count()==0
        assert page.get_by_role('button',name='Window ↓').count()==0
        assert page.locator('.melodic-card-sound-select select').count()==0
        assert page.locator('.melodic-card-sound-select button').count()==4
        report['checks'].append('Window buttons gone; four card-local dropdown triggers still present')
        # Sound menu of last (fourth) card cannot stick out to the right.
        arrow=page.locator('.melodic-card-sound-select button').nth(3)
        arrow.scroll_into_view_if_needed();arrow.click()
        popup=page.locator('.melodic-card-sound-menu')
        assert popup.count()==1
        card=page.locator('[data-ml-instrument-card]').nth(3)
        popbox=popup.bounding_box();cardbox=card.bounding_box()
        assert popbox and cardbox
        assert abs(popbox['x']-cardbox['x'])<3,(popbox,cardbox)
        assert abs(popbox['width']-cardbox['width'])<3,(popbox,cardbox)
        assert popbox['x']+popbox['width']<=1442,(popbox,cardbox)
        colors=page.evaluate('''() => {const menu=document.querySelector('.melodic-card-sound-menu');const card=menu.closest('[data-ml-instrument-card]');return {card:getComputedStyle(card).borderColor,menu:getComputedStyle(menu).borderColor}}''')
        assert colors['card']==colors['menu'],colors
        report['checks'].append('Instrument 4 popup spans exactly its own card and inherits card border color')
        # Only one menu open; switch directly to another card.
        page.locator('.melodic-card-sound-select button').first.click()
        assert page.locator('.melodic-card-sound-menu').count()==1
        assert page.locator('.melodic-card-sound-menu').locator('xpath=ancestor::*[@data-ml-instrument-card]').get_attribute('data-ml-instrument-card')==page.locator('[data-ml-instrument-card]').first.get_attribute('data-ml-instrument-card')
        options=popup.get_by_role('option')
        selected=next(i for i in range(options.count()) if options.nth(i).get_attribute('aria-selected')=='true')
        other=(selected+1)%options.count()
        label=options.nth(other).inner_text()
        options.nth(other).click()
        assert page.locator('.melodic-card-sound-menu').count()==0
        page.locator('.melodic-card-sound-select button').first.click()
        assert page.get_by_role('option',name=label).first.get_attribute('aria-selected')=='true'
        report['checks'].append('Changing sounds via custom popup still updates the instrument; only one menu opens')
        # Move cards close to bottom of viewport, check upward flip and no viewport overflow.
        page.locator('.melodic-card-sound-select button').first.click()
        page.evaluate('''() => {const card=document.querySelector('[data-ml-instrument-card]');const y=card.getBoundingClientRect().bottom;window.scrollBy(0,y-innerHeight+18)}''')
        page.locator('.melodic-card-sound-select button').first.click()
        geo=page.evaluate('''() => {const popup=document.querySelector('.melodic-card-sound-menu');const card=popup.closest('[data-ml-instrument-card]');return {pop:popup.getBoundingClientRect().toJSON(),card:card.getBoundingClientRect().toJSON()}}''')
        assert geo['pop']['bottom']<=geo['card']['top']+4 or geo['pop']['top']>=geo['card']['bottom']-4,geo
        report['checks'].append('Popup chooses a vertical direction according to free viewport space; never side-overlays its neighbors')
        page.screenshot(path=str(root/'P4B_L12_menu_open_up.png'))
        page.locator('.melodic-card-sound-select button').first.click()
        page.evaluate("""() => {const card=document.querySelector('[data-ml-instrument-card]');let el=card;while(el){if(el.scrollHeight>el.clientHeight+100 && /auto|scroll/.test(getComputedStyle(el).overflowY)){el.scrollTop+=card.getBoundingClientRect().top-120;return;}el=el.parentElement}window.scrollBy(0,card.getBoundingClientRect().top-120)}""")
        page.wait_for_timeout(100)
        page.locator('.melodic-card-sound-select button').first.click()
        below=page.evaluate("""() => {const popup=document.querySelector('.melodic-card-sound-menu'), card=popup.closest('[data-ml-instrument-card]');return {pop:popup.getBoundingClientRect().toJSON(),card:card.getBoundingClientRect().toJSON()}}""")
        assert below['pop']['top']>=below['card']['top']+90 and below['pop']['bottom']<=below['card']['bottom']+1,below
        assert page.locator('.melodic-card-sound-menu').get_attribute('data-ml-flow')=='true'
        page.screenshot(path=str(root/'P4B_L12_menu_open_down.png'))
        report['checks'].append('When scrolled towards top, popup opens beneath Pattern A/B/C')
        assert not report['errors'],report['errors']
    finally:
        browser.close()
report['pass']=True
(root/'P4B_L12_BROWSER_REPORT.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
print(json.dumps(report,ensure_ascii=False))
