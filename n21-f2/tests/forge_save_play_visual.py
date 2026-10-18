"""Layout geometry test for the real built CSS, without booting the whole audio app.
Run: python3 tests/forge_save_play_visual.py (requires playwright + Chromium).
The fixture uses the actual production classes and DOM nesting from ForgeTransportRack.
"""
import json
import re
from pathlib import Path
from playwright.sync_api import sync_playwright

root = Path(__file__).resolve().parent.parent
entry = json.loads((root / 'source-manifest.json').read_text())['entry']
html = (root / entry).read_text()
css = '\n'.join(re.findall(r'<style[^>]*>(.*?)</style>', html, re.S | re.I))
markup = '''<!doctype html><html><head><style>''' + css + '''</style></head><body style="background:#090909;margin:0">
<div class="f31-play-rack" data-forge-play-rack><div class="f31-transport-main">
<div class="f34-transport-and-status"><div class="flex items-center gap-2">
<button id="play" type="button" style="width:42px;min-width:42px;height:34px;min-height:34px;padding:0" class="relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded border font-bold text-lg leading-none border-green-400/40 bg-green-600 text-white">▶</button>
<button>⏹</button></div></div>
<div class="flex flex-wrap items-center gap-1">Download</div><div class="flex items-center gap-2">Tempo</div><div class="f31-trim-import"></div>
<div class="f34-project-save-on-main"><section class="f33-project-save">
<label class="f33-project-name-label"><span class="f33-project-name-text">Project Name:</span><input class="f33-project-name-input" value="My Project"></label>
<button id="save" class="f33-project-save-button">Save</button><div class="f33-project-save-feedback">&nbsp;</div>
</section></div></div></div></body></html>'''
with sync_playwright() as p:
    browser = p.chromium.launch(executable_path='/usr/bin/chromium', headless=True, args=['--no-sandbox','--disable-dev-shm-usage'])
    for width, scale in [(1500,1), (1150,1.25), (950,2)]:
        page = browser.new_page(viewport={'width':width, 'height':250}, device_scale_factor=scale)
        page.set_content(markup)
        observed = page.evaluate('''() => Object.fromEntries(['play','save'].map(id => {
          const el=document.getElementById(id),rect=el.getBoundingClientRect(),st=getComputedStyle(el);
          return [id,{x:rect.x,y:rect.y,width:rect.width,height:rect.height,
              border:st.borderWidth,radius:st.borderRadius,boxSizing:st.boxSizing,
              centerText:st.justifyContent==='center'&&st.alignItems==='center'}];
        }))''')
        a,b=observed['play'],observed['save']
        assert a['width']==b['width']==42 and a['height']==b['height']==34, observed
        assert a['y']==b['y'],observed
        rack = page.locator('[data-forge-play-rack]').bounding_box()
        assert abs((rack['x']+rack['width'] - (b['x']+b['width'])) - (a['x']-rack['x'])) < .01, observed
        assert b['border']==a['border']=='1px' and a['radius']==b['radius']=='4px',observed
        assert b['centerText'] is True and b['boxSizing']=='border-box',observed
        print(f'PASS Forge exact mirror width={width} DPR={scale} Play=Save 42×34; aligned y={a["y"]}; symmetric edges={a["x"]}')
        page.close()
    browser.close()
