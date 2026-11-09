"""E3 regression: the round microphone discard X must be above Import Audio.

Uses production rack CSS, the real sibling structure/classes, browser hit testing,
including narrow viewport CSS breakpoints. Requires no mic permission or audio.
"""
from pathlib import Path
from playwright.sync_api import sync_playwright
import json, sys
root = Path(__file__).resolve().parents[1]
css = (root / 'styles/areas/028_inline-028.css').read_text()
assert 'xen-rack-microphone' in (root/'src/rooms/lab.js').read_text()
assert 'xen-rack-vertical-import-anchor' in (root/'src/factories/ForgeTransportRack.js').read_text()

out=[]
with sync_playwright() as p:
    browser = p.chromium.launch(headless=True, executable_path='/usr/bin/chromium', args=['--no-sandbox', '--disable-dev-shm-usage'])
    for width in [1440, 1024, 490]:
        page=browser.new_page(viewport={'width':width,'height':320}, device_scale_factor=1)
        page.set_content('''<!doctype html><html><head><style>html,body{margin:0;padding:0;background:#080f16;color:white}#fixture{position:relative;margin:40px}</style></head><body>
<div class="f31-play-rack" id="fixture"><div class="xen-rack-import-top">
  <button data-forge-import-image="true">Import Image</button>
  <div class="xen-rack-microphone-dock" data-forge-rack-microphone-slot="true">
   <div class="xen-rack-microphone" data-forge-microphone="recording">
    <button class="xen-enough-finish">Enough!</button>
    <button id="discard" aria-label="Discard microphone recording">×</button>
    <span role="status">Microphone recording</span>
   </div>
  </div>
  <span class="xen-rack-vertical-import-anchor"><button class="xen-vertical-import-audio" data-forge-rack-import-audio="true">IMPORT AUDIO</button></span>
</div></div></body></html>''')
        page.add_style_tag(content=css)
        page.evaluate("""() => {
          window.__clicks=[];
          document.querySelector('#discard').addEventListener('click',()=>window.__clicks.push('discard'));
          document.querySelector('[data-forge-rack-import-audio]').addEventListener('click',()=>window.__clicks.push('import'));
        }""")
        detail=page.evaluate('''() => {
          const x=document.querySelector('#discard'); const imp=document.querySelector('[data-forge-rack-import-audio]');
          const a=x.getBoundingClientRect(),b=imp.getBoundingClientRect();
          const left=Math.max(a.left,b.left),right=Math.min(a.right,b.right),top=Math.max(a.top,b.top),bottom=Math.min(a.bottom,b.bottom);
          if(!(left<right && top<bottom))return {intersection:false,discard:a.toJSON(),importAudio:b.toJSON()};
          const sampleX=(left+right)/2, sampleY=(top+bottom)/2;
          const hit=document.elementFromPoint(sampleX,sampleY);
          return {intersection:true,hit:hit?.id||hit?.getAttribute('data-forge-rack-import-audio')||hit?.tagName,
            topIsDiscard:hit===x || x.contains(hit), point:[sampleX,sampleY],
            dockZ:getComputedStyle(document.querySelector('.xen-rack-microphone-dock')).zIndex,
            importZ:getComputedStyle(document.querySelector('.xen-rack-vertical-import-anchor')).zIndex};
        }''')
        if detail.get('intersection'):
            page.mouse.click(*detail['point'])
            detail['clicks']=page.evaluate('window.__clicks')
            assert detail['clicks']==['discard'], (width,detail)
        if width==1440:
            page.locator('#fixture').screenshot(path=str(root.parent/'E3_X_ueber_Import_Audio.png'))
        out.append([width,detail]);page.close()
    browser.close()
print(json.dumps(out,indent=2))
for width,detail in out:
    assert detail['intersection'], f'{width}: discard X and Import Audio do not geometrically overlap; fixture invalid'
    assert detail['topIsDiscard'], f'{width}: Import Audio obscures the discard X in overlap: {detail}'
print('PASS: microphone X overlays Import Audio at every checked breakpoint')
