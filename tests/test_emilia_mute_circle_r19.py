#!/usr/bin/env python3
"""R19: real Chromium CSS/checkbox semantics for the existing Emilia inspector Mute control."""
from pathlib import Path
from playwright.sync_api import sync_playwright

root = Path(__file__).resolve().parents[1]
css = (root / 'styles/areas/027_inline-027.css').read_text()
html = """<!doctype html><html><head><meta charset='utf-8'><style>%s</style></head><body>
<section class='emilia-b'><div class='emilia-b-inspector'>
<label>Mute<input id='mute' type='checkbox'></label>
<label>Ratio<input id='ratio' type='number' value='1.00'></label>
</div></section></body></html>""" % css
with sync_playwright() as playwright:
    browser = playwright.chromium.launch(headless=True, executable_path='/usr/bin/chromium', args=['--no-sandbox'])
    page = browser.new_page(viewport={"width":520,"height":280})
    page.set_content(html)
    mute = page.locator('#mute')
    ratio = page.locator('#ratio')
    def state():
        return mute.evaluate("e=>{const s=getComputedStyle(e),r=e.getBoundingClientRect();return {appearance:s.appearance,width:r.width,height:r.height,radius:s.borderRadius,border:s.borderTopColor,background:s.backgroundColor,checked:e.checked}}")
    before = state()
    assert before['appearance']=='none', f"RED: default checkbox still browser-drawn: {before}"
    assert 20<=before['width']<=26 and before['width']==before['height'], f"wrong size: {before}"
    assert before['radius']=='50%' and before['border']=='rgb(255, 255, 255)', f"not a white circle: {before}"
    mute.click()
    page.wait_for_timeout(200)  # allow the 140 ms color transition to complete
    after = state()
    assert after['checked'], 'native checked semantics broken'
    assert after['background'] != before['background'], 'muted state is not visibly different'
    mute.press('Space')
    assert not mute.is_checked(), 'space should unmute'
    assert ratio.evaluate("e=>getComputedStyle(e).borderRadius")!='50%', 'circle rule leaked to number control'
    browser.close()
print('PASS Emilia Mute white round control, checked/keyboard state, isolated scope')
