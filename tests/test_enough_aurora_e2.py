"""E2: Actual saturated interior, working micro-rack cascade, 2 controls, accessible animation.
No audio or external dependencies; browser screenshots sample both small production-like sizes.
"""
import sys, json, re
from pathlib import Path
from io import BytesIO
from PIL import Image
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1]
css=(root/'styles/areas/028_inline-028.css').read_text()
header=(root/'src/runtime/instrument/05_timing_and_admission.js').read_text()
mic=(root/'src/rooms/lab.js').read_text()
html=Path(sys.argv[1]).read_text()
for name,source in [('header',header),('mic',mic)]:
 assert all(s in source for s in ('xen-enough-veil--left','xen-enough-veil--right','xen-enough-ripples','xen-enough-filaments','xen-enough-legend')),name
assert 'xen-enough-aurora-left' in html and 'xen-enough-aurora-right' in html
assert 'xen-enough-aurora-halo' in html
assert 'xen-library-delete' in html or 'library-delete' in html
assert '@media(prefers-reduced-motion:reduce)' in css
assert 'button.xen-enough-finish:first-child' in css, 'microphone earlier first-child style must be overridden'
assert 'mask-image:' in css and 'filter:blur' in css

with sync_playwright() as p:
 browser=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage'])
 page=browser.new_page(viewport={'width':410,'height':110},device_scale_factor=1,reduced_motion='no-preference')
 page.set_content('''<html><head><style>
 body{margin:0;padding:14px;background:#080b0e;color:white;font-family:system-ui}
 .row{display:flex;align-items:start;gap:30px}
 button{border-radius:6px;font:700 11px system-ui;white-space:nowrap;height:28px;width:132px;}
 </style></head><body><div class="row">
 <button class="xen-enough-finish" data-xen-header-record="true" data-xen-header-recording="true"><span class="xen-enough-layers"><span class="xen-enough-veil xen-enough-veil--left" aria-hidden="true"></span><span class="xen-enough-veil xen-enough-veil--right" aria-hidden="true"></span><span class="xen-enough-ripples" aria-hidden="true"></span><span class="xen-enough-filaments" aria-hidden="true"></span><span class="xen-enough-legend">Enough! 00:06</span></span></button>
 <div class="xen-rack-microphone" data-forge-microphone="recording"><button class="xen-enough-finish" style="border:1px solid #f87171;background:#6b1620;color:#e5f6f5" type="button"><span class="xen-enough-layers"><span class="xen-enough-veil xen-enough-veil--left" aria-hidden="true"></span><span class="xen-enough-veil xen-enough-veil--right" aria-hidden="true"></span><span class="xen-enough-ripples" aria-hidden="true"></span><span class="xen-enough-filaments" aria-hidden="true"></span><span class="xen-enough-legend">🎙 Enough!</span></span></button></div>
 </div></body></html>''')
 page.add_style_tag(content=css)
 sel=['button[data-xen-header-recording="true"]','.xen-rack-microphone button.xen-enough-finish']
 obs={}
 for t in [0,1.8,3.0,4.8,6.5,8.7]:
  page.evaluate('''t=>document.querySelectorAll('button.xen-enough-finish').forEach(b=>b.style.setProperty('--enough-phase',`${-t}s`))''',t)
  page.wait_for_timeout(75)
  for i,kind in enumerate(['header','mic']):
   b=page.locator(sel[i]);im=Image.open(BytesIO(b.screenshot(animations='allow'))).convert('RGB');w,h=im.size
   # Sample inside frame, above and below label.
   pixels=[im.getpixel((x,y)) for y in (5,8,h-9,h-6) for x in range(6,w-5,5)]
   green=sum(g>r*1.26 and g>bl*1.09 and g>58 for r,g,bl in pixels)
   red=sum(r>g*1.3 and r>bl*1.14 and r>65 for r,g,bl in pixels)
   obs[(kind,t)]={'red':red,'green':green,'n':len(pixels),'bg':b.evaluate('b=>getComputedStyle(b).backgroundImage.slice(0,55)')}
   assert obs[(kind,t)]['bg']!='none', (kind,t,'background blocked by previous CSS')
 for kind in ('header','mic'):
  assert obs[(kind,0)]['green']>20,obs
  assert obs[(kind,4.8)]['red']>20,obs
  assert obs[(kind,8.7)]['green']>20,obs
  assert obs[(kind,0)]['green'] > obs[(kind,0)]['red']*3,obs
  assert obs[(kind,4.8)]['red'] > obs[(kind,4.8)]['green']*3,obs
 page.emulate_media(reduced_motion='reduce')
 for selector in sel:
  b=page.locator(selector)
  assert b.evaluate('b=>getComputedStyle(b).animationName')=='none'
  for c in ('--left','--right'):
   assert b.locator('.xen-enough-veil'+c).evaluate('e=>getComputedStyle(e).animationName')=='none'
  assert b.locator('.xen-enough-ripples').evaluate('e=>getComputedStyle(e).animationName')=='none'
  assert b.locator('.xen-enough-filaments').evaluate('e=>getComputedStyle(e).animationName')=='none'
 browser.close()
print('E2_AURORA_PASS',json.dumps({f'{k}@{t}':v for (k,t),v in obs.items()},ensure_ascii=False))
