#!/usr/bin/env python3
"""CSS-only device matrix, not a substitute for real Forge render/audio testing."""
from pathlib import Path
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1]
a=(root/'styles/areas/028_inline-028.css').read_text()
b=(root/'styles/areas/040_xen-p9-m9-cockpit-canonical.css').read_text()
html='''<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0;background:#0c1419}.xen-forge-draw-header{display:flex;align-items:center;gap:10px;min-height:48px;padding:8px 12px} .f35-navigator-save-slot{position:relative;margin:30px 0 0 260px;width:70px;height:25px}.f35-navigator-sample-name{background:transparent;color:white}</style><style>''' + a +'\n'+ b + '''</style></head><body><header class="xen-forge-draw-header"><button type="button" class="xen-forge-draw-play" data-forge-draw-play><span class="xen-forge-draw-play-word">PLAY</span></button><span style="color:white">Carrier Canvas</span></header><div class="f35-navigator-save-slot"><label class="f35-navigator-sample-caption"><span class="f35-navigator-name-glyph">NAME</span></label></div></body></html>'''
with sync_playwright() as pw:
 browser=pw.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage'])
 # Desktop hover + focus accessible, no forced enlarged target.
 page=browser.new_page(viewport={'width':1440,'height':700})
 page.set_content(html)
 d=page.evaluate('''()=>{const e=document.querySelector('.xen-forge-draw-play');return {height:e.getBoundingClientRect().height,hover:matchMedia('(hover: hover)').matches,coarse:matchMedia('(pointer: coarse)').matches}}''')
 assert d['hover'] and not d['coarse'] and d['height']==33, d
 page.keyboard.press('Tab')
 assert page.evaluate("document.querySelector('.xen-forge-draw-play').matches(':focus-visible')"),'Tab must focus PLAY visibly'
 page.wait_for_timeout(170)
 assert page.evaluate("getComputedStyle(document.querySelector('.xen-forge-draw-play')).color")=='rgb(255, 108, 218)'
 print('PASS desktop: 33px visual height, keyboard-focus visibly pink')
 page.close()
 # Mobile viewport, actual coarse input and pref reduced motion.
 ctx=browser.new_context(viewport={'width':390,'height':844},is_mobile=True,has_touch=True,reduced_motion='reduce')
 m=ctx.new_page();m.set_content(html)
 val=m.evaluate('''()=>{const e=document.querySelector('.xen-forge-draw-play'),p=document.querySelector('.xen-forge-draw-play-word'),n=document.querySelector('.f35-navigator-name-glyph');return {height:e.getBoundingClientRect().height,hover:matchMedia('(hover: hover)').matches,coarse:matchMedia('(pointer: coarse)').matches,reduced:matchMedia('(prefers-reduced-motion: reduce)').matches,transition:getComputedStyle(e).transitionDuration,play:getComputedStyle(p).fontSize,name:getComputedStyle(n).fontSize,bodyScrollWidth:document.documentElement.scrollWidth}}''')
 assert val['coarse'] and not val['hover'] and val['reduced'],val
 assert val['height']>=44 and val['transition']=='0s',val
 assert val['play']==val['name']=='34px',val
 m.locator('button.xen-forge-draw-play').tap()
 after=m.evaluate("getComputedStyle(document.querySelector('.xen-forge-draw-play')).color")
 assert after!='rgb(255, 108, 218)',f'Touch sticky-hover must not keep button pink: {after}'
 m.screenshot(path=str(root/'docs'/'M1_UI_P3_coarse_pointer_CSS_probe.png'))
 print('PASS touch 390px: 44px target, no sticky pink hover, reduce-motion 0s, shared 34px type')
 ctx.close();browser.close()
