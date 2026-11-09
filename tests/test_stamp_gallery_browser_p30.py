"""P30 targeted gallery geometry and visual snapshot using actual preset PCM-shaped spectrogram grids.
Standalone fixture: no claim of complete interactive Forge playback testing.
"""
from pathlib import Path
import json,re,gzip
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parent.parent
OUT=Path('/mnt/data')
compiled=(ROOT/'dist/XenSonar_Standalone.html').read_text()
css='\n'.join(re.findall(r'<style(?:\s[^>]*)?>([\s\S]*?)</style>',compiled))
js=(ROOT/'src/rooms/lab.js').read_text()
helper=js[js.index('function __forgeStampPreviewPixels('):js.index('function __ForgeStampPreviewCanvas(')]
with gzip.open(ROOT/'tests/fixtures/p30_curated_stamps.json.gz','rt',encoding='utf8') as fixture:
 all_presets=json.load(fixture)
featured=['zigzag-pentatonic','glide-call','overtone-ladder','shepard-ramp','ee-beam','click-ladder','metal-burst','grain-mist','shimmer-rain','diamond-body','cross-lattice','spiral-knot']
selected=[next(p for p in all_presets if p['id']==id) for id in featured]
# Only the 12 visible real stamp arrays enter the fixture, not all 56.
html='<!DOCTYPE html><html><head><style>'+css+'''body{margin:0;background:#050910;color:#d3eeed;font:11px monospace} .probe{margin:12px auto;box-sizing:border-box}.probe .xen-stamp-library-body{background:rgba(0,0,0,.2)}
</style></head><body><div class="probe"><section data-stamp-library="true" class="xen-stamp-gallery-section rounded border border-neutral-800 bg-black/20 p-2"><button class="xen-stamp-gallery-heading" style="width:100%;display:flex;justify-content:space-between"><span>STAMP LIBRARY</span><span>56 PRESETS · 0 CUSTOM ▴</span></button><div class="xen-stamp-library-body"><div class="xen-stamp-library-tabs"><button class="xen-stamp-library-tab is-active">Presets</button><button class="xen-stamp-library-tab">Custom</button><button class="xen-stamp-library-tab">Both</button></div><div class="xen-stamp-gallery-controls"><span class="xen-stamp-gallery-caption">SPECTRAL FORMS</span><div class="xen-stamp-gallery-filter"><button aria-pressed="true">Curated · 12</button><button>All · 56</button></div></div><input class="xen-stamp-gallery-search" placeholder="Find a shape…"><div class="xen-stamp-gallery-grid" data-stamp-gallery-grid="true">'''
for p in selected:
 html+=f'''<button type="button" class="xen-stamp-gallery-tile" data-stamp-preset="{p['id']}"><span class="xen-stamp-tile-copy"><span class="xen-stamp-tile-name">{p['name']}</span><span class="xen-stamp-tile-category" style="color:{p['previewColor']}">{p['category']}</span></span><canvas class="xen-stamp-tile-canvas" data-stamp-preview="{p['id']}" width="108" height="72"></canvas></button>'''
html+='</div></div></section></div></body></html>'
with sync_playwright() as pw:
 browser=pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
 for width in (300,385,565,740):
  page=browser.new_page(viewport={'width':width+24,'height':880},device_scale_factor=1)
  page.set_content(html)
  page.eval_on_selector('.probe','(el,w)=>el.style.width=w+"px"',width)
  page.evaluate('(presets)=>{' + helper + '''\nfor(const p of presets){const c=document.querySelector('[data-stamp-preview="'+p.id+'"]');const img=__forgeStampPreviewPixels(p,c.width,c.height);c.getContext('2d').putImageData(new ImageData(img.pixels,img.width,img.height),0,0);}}''',selected)
  geo=page.evaluate('''()=>{const grid=document.querySelector('.xen-stamp-gallery-grid'),tiles=[...grid.querySelectorAll('button')];return {columns:getComputedStyle(grid).gridTemplateColumns.split(' ').length,gridHeight:grid.getBoundingClientRect().height,scrollHeight:grid.scrollHeight,sectionHeight:document.querySelector('.xen-stamp-gallery-section').getBoundingClientRect().height,
       thumbnails:tiles.filter(x=>x.querySelector('canvas')&&x.getBoundingClientRect().height>0).length,
       firstRowY:tiles[0].getBoundingClientRect().top,secondX:tiles[1].getBoundingClientRect().x,firstX:tiles[0].getBoundingClientRect().x,
       nameSize:getComputedStyle(tiles[0].querySelector('.xen-stamp-tile-name')).fontSize}}''')
  assert geo['thumbnails']==12,(width,geo)
  if width<=300: assert geo['columns']==1,(width,geo)
  if width==385 or width==565: assert geo['columns']==2,(width,geo)
  if width==740: assert geo['columns']==3,(width,geo)
  assert geo['gridHeight']<=410.5,(width,geo)
  assert geo['scrollHeight']>geo['gridHeight'],(width,geo)
  print('P30 gallery',width,geo)
  if width in (385,740):page.screenshot(path=str(OUT/f'XenSonar_P30_Stamp_Gallery_{width}.png'),full_page=True)
  page.close()
 browser.close()
print('P30 GALLERY BROWSER PASS: real stamp shapes, adaptive columns, bounded height')
