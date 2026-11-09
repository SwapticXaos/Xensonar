"""Browser geometry check using markup from the *actual* P32 element tree.
Not a synthetic screenshot substituted for source: Node renders the source using
React.createElement-compatible no-effect adapter, Chromium performs layout.
"""
from pathlib import Path
import subprocess
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1]
markup=subprocess.check_output(['node','tests/render_empty_audio_p32.cjs'],cwd=root,text=True)
css=(root/'styles/areas/040_xen-p9-m9-cockpit-canonical.css').read_text()
html=f'''<!doctype html><html><head><style>*{{box-sizing:border-box}}body{{background:#080911;color:#bccbd7;font-family:monospace;margin:0}}.scene{{width:100%;padding:8px}}.rack{{height:181px;position:relative;background:#090c15;border:1px solid #263b44}}[data-forge-rack-import-audio]{{position:absolute;right:16%;top:36px;width:46px;height:104px;background:#02212c;color:#8bedff;border:2px solid #45cadb}}[data-forge-rack-import-audio] svg{{width:40px;height:23px}}.sibling{{height:31px;background:#171222;border:1px solid #322148}}{css}</style></head><body><section class="scene"><div class="rack"><button data-forge-rack-import-audio><span>IMPORT AUDIO</span><svg viewBox="0 0 44 23"><path d="M2 2 H42 L22 21 Z" fill="currentColor"/></svg></button></div>{markup}<div class="sibling" id="after">Downstream</div></section></body></html>'''
with sync_playwright() as pw:
 browser=pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
 for width in (1360, 900, 540, 375):
  page=browser.new_page(viewport={'width':width,'height':770})
  page.set_content(html)
  metrics=page.evaluate('''() => {const q=s=>document.querySelector(s),r=s=>q(s).getBoundingClientRect();
    const upper=r('.xen-p32-upper'),mirror=r('[data-p32-import-mirror-triangle]'),lower=r('[aria-label^="No Sound"]'),after=r('#after');
    return {upperHeight:upper.height,lowerHeight:lower.height,redBeforeMeasure:getComputedStyle(q('.xen-p32-mirror-button')).visibility,
      importExists:!!q('.xen-p32-mirror-button'),order:upper.top<lower.top,
      oldWords:document.querySelectorAll('.xen-p32-wave-word').length,after:after.top,
      overflow:document.documentElement.scrollWidth-innerWidth}
  }''')
  assert metrics['oldWords']==0,(width,metrics)
  assert abs(metrics['upperHeight']-102)<2 and abs(metrics['lowerHeight']-124)<2,(width,metrics)
  assert metrics['redBeforeMeasure']=='hidden' and metrics['importExists'] and metrics['order'],(width,metrics)
  assert metrics['overflow']<2,(width,metrics)
  print('P32 geometry',width,metrics)
  if width==1360:
   page.screenshot(path='/mnt/data/XenSonar_P32_NoSignal_NoSound_Browser_Vorschau.png',full_page=True)
  page.close()
 browser.close()
print('P37 first-contact geometry PASS: source masks, no overflow, no stale triangle before actual font measurement')
