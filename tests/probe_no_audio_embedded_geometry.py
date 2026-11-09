from pathlib import Path
from playwright.sync_api import sync_playwright
from subprocess import check_output
root=Path(__file__).resolve().parents[1]
markup=check_output(['node','tests/render_empty_audio_p32.cjs'],cwd=root,text=True)
css=(root/'styles/areas/040_xen-p9-m9-cockpit-canonical.css').read_text()
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
 for w in (1200,940,700,500,320):
  page=b.new_page(viewport={'width':1360,'height':880})
  html='''<html><head><style>*{box-sizing:border-box}body{margin:0;color:white;background:#090b13;font:11px monospace}.container{width:%spx;max-width:100%%;border:2px solid purple;overflow:hidden;margin:20px}.inner{display:flex;flex-direction:column} %s</style></head><body><section class="container"><div class="inner">%s</div></section></body></html>'''%(w,css,markup)
  page.set_content(html)
  m=page.evaluate('''()=>{let s=x=>document.querySelector(x),r=x=>{const z=s(x).getBoundingClientRect();return{x:z.x,y:z.y,w:z.width,h:z.height,scroll:s(x).scrollWidth,client:s(x).clientWidth}};return {outer:r('.container'),base:r('.xen-p32-empty-audio'),upper:r('.xen-p32-upper'),lower:r('.xen-p33-lower'),rack:r('.xen-p33-inactive-rack'),row:r('.xen-forge-action-row'),label:r('.xen-p32-label-row'),name:r('.xen-p33-name-dummy')}}''')
  print(w,m,flush=True)
  if w in (700,320):page.screenshot(path=f'/mnt/data/forge_embed_{w}.png',full_page=True)
  page.close()
 b.close()
