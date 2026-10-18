"""Isolated DOM/CSS geometry smoke test. Not full app/browser integration."""
from pathlib import Path
from playwright.sync_api import sync_playwright
css=Path(__file__).resolve().parents[1].joinpath('styles/08_forge_workflow.css').read_text()
head='''<style>*{box-sizing:border-box}body{margin:0;background:#06070b;color:#f4f5f6;font:12px monospace}.flex{display:flex}.items-center{align-items:center}.gap-1{gap:4px}.gap-2{gap:8px}button{font:inherit;border:1px solid #374151;background:#171923;color:#eee;border-radius:4px;padding:7px;white-space:nowrap}input{font:inherit;color:white;background:#090909;border:1px solid #333}section{min-width:0}.f3564-transport-trim{height:46px;background:#081726;border:1px solid #355;border-radius:4px}.f33-rack-destinations>button{height:36px}.f34-transport-and-status>div:first-child>button{height:33px}</style>'''
body='''<div style="height:70px">Drawing / Navigator</div>
<div data-forge-play-rack="true" class="f31-play-rack"><div class="f31-transport-main">
<div class="f34-transport-and-status"><div class="flex items-center gap-2"><button style="min-width:45px">▶</button><button style="min-width:32px">■</button></div><div class="f34-transport-status">Finishing listening-mode render</div></div>
<div class="flex items-center gap-1"><button>⬇ WAV</button><button>⬇ FLAC</button><button>💾 Canvas + JSON</button></div>
<div class="flex items-center gap-2"><label>Tempo <input style="width:60px" value="108"></label><label><input type="checkbox" checked>Loop</label></div>
<div class="f31-trim-import"><div class="f3564-transport-trim">Carrier Tuning<br>Carrier Volume</div><div class="f31-import-bars"><button>▧ Import Image</button><div class="flex items-center gap-2"><button>BARS 4</button><button>SEGMENTS 4</button></div></div></div>
<div class="f34-project-save-on-main"><section class="f33-project-save"><label class="f33-project-name-label"><span class="f33-project-name-text">Project Name:</span><input class="f33-project-name-input" value="forge3-workshop"></label><button class="f33-project-save-button">Save</button><div class="f33-project-save-feedback"></div></section></div>
</div><div class="f31-transport-bottom"><div class="f33-rack-destinations"><div class="f35-rack-hearing-picker"><select><option>Donor</option></select></div><button>📀 Send to Material Track</button><button>🎼 Use as Root Follow Loop</button><button>🎶 Send to Pink Track (Melodic Loop)</button></div><div class="f33-rack-project-corner"><button class="f33-figure-projects">🌈 FIGURE PROJECTS · LAB LIBRARY</button></div></div></div>'''
html='<!doctype html><html><head>'+head+'<style>'+css+'</style></head><body>'+body+'</body></html>'
with sync_playwright() as pw:
 browser=pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-gpu','--disable-dev-shm-usage'],timeout=8000)
 for width in [1238,1280,1680]:
  page=browser.new_page(viewport={'width':width,'height':330})
  page.set_content(html)
  positions=page.evaluate('''()=>{let q=s=>document.querySelector(s).getBoundingClientRect();let box=r=>({x:r.x,y:r.y,right:r.right,bottom:r.bottom,width:r.width,height:r.height});return {main:box(q('.f31-transport-main')),image:box(q('.f31-trim-import')),project:box(q('.f34-project-save-on-main')),status:box(q('.f34-transport-status')),bottom:box(q('.f31-transport-bottom')),rack:box(q('.f31-play-rack')),horizontalOverflow:document.body.scrollWidth>document.body.clientWidth}}''')
  print(width,positions,flush=True)
  v=positions
  assert abs(v['project']['y']-v['image']['y'])<2,(width,'project should share image row',v)
  assert v['project']['x']>=v['image']['right']-2,(width,'project must be right of import',v)
  assert v['project']['width']<=246.5,(width,'project must not stretch across whole rack',v)
  assert abs(v['project']['right']-v['main']['right'])<2,(width,'project should align to top-right corner',v)
  assert v['bottom']['y']>=v['main']['y']+35,(width,'lower row begins below upper controls',v)
  assert v['status']['bottom']<=v['bottom']['y']+1,(width,'status must fit above lower row',v)
  assert not v['horizontalOverflow'],(width,'horizontal overflow',v)
  if width==1238:page.screenshot(path='/mnt/data/Fractalia_F3_6_Rack_CSS_1238.png')
  page.close()
 browser.close()
print('PASS F3.6 representative CSS geometry at 1238, 1280, 1680; isolated DOM fixture, not app integration')
