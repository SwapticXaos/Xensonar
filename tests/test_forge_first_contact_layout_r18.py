"""Isolated CSS/DOM geometry check of the real single NAME rack classes.
Not a full XenSonar boot or audio engine test.
"""
import re
import sys
from pathlib import Path
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parent.parent
html=(Path(sys.argv[1]) if len(sys.argv)>1 else root/'dist'/'XenSonar_P41_RC4_PCM1_Forge_R18_FirstContact_OriginalRack_Test.html').read_text()
css='\n'.join(re.findall(r'<style(?:\s[^>]*)?>([\s\S]*?)</style>',html))
assert css
fields=''.join(f'<label class="xen-forge-quick-field"><span class="xen-forge-quick-caption">{label}</span><input disabled type="number" value="{value}" class="xen-forge-quick-input rounded border border-neutral-700 bg-neutral-950 px-2 py-1 text-neutral-100"></label>' for label,value in [('Number of Bars','7'),('Number of Segments','3'),('Frequency Anchor (Hz)','440')])
name=f'''<div class="xen-forge-name-section flex flex-col gap-2"><div class="xen-forge-name-rack rounded border border-violet-900/50 bg-violet-950/15 text-[11px] text-violet-100/85"><span class="xen-forge-name-word">NAME</span><span class="xen-forge-name-colon">:</span><span class="xen-forge-name-heading">LOOP/SAMPLE BETITELN</span><input disabled class="xen-forge-name-input w-full rounded border border-violet-800/70 bg-neutral-950 px-2 py-2 text-sm text-violet-50 outline-none focus:border-violet-500" placeholder="Import audio to name a loop"><span class="xen-forge-name-help">This title is used for exported loops.</span><div data-forge-inline-metadata="true" class="xen-forge-inline-metadata">{fields}</div></div></div>'''
page_html=f'''<!doctype html><html><head><meta charset="utf-8"><style>{css}</style><style>html,body{{margin:0;padding:0;background:#08080e;color:#dde2e8}} .probe{{padding:8px;max-width:100%}} .xen-p33-inactive-rack{{opacity:.62}}</style></head><body><main class="probe"><div data-p32-empty-audio="true"><div data-p33-inactive-rack="true" class="xen-p33-inactive-rack" inert>{name}</div></div><details data-forge-advanced="v1"><summary>Additional Sound Paths &amp; Diagnostics</summary><div data-forge-material-diagnostics-slot="true">No source loaded yet · Timbre: Audio Import Missing</div></details></main></body></html>'''
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
 for width in [1280,1000,750,375]:
  page=browser.new_page(viewport={'width':width,'height':900})
  page.set_content(page_html)
  r=page.evaluate('''() => {
  const box=s=>{const a=document.querySelector(s).getBoundingClientRect();return {x:a.x,y:a.y,w:a.width,h:a.height,b:a.bottom}};
  return {name:box('.xen-forge-name-input'),fields:[...document.querySelectorAll('.xen-forge-quick-input')].map(x=>({y:x.getBoundingClientRect().top,b:x.getBoundingClientRect().bottom,disabled:x.disabled})),container:box('.xen-forge-name-rack'),advanced:box('[data-forge-advanced]'),collapsed:!document.querySelector('[data-forge-advanced]').open,diagVisible:document.querySelector('[data-forge-material-diagnostics-slot]').checkVisibility()};}''')
  assert len(r['fields'])==3 and all(x['disabled'] for x in r['fields']),(width,r)
  for x in r['fields']:
   assert abs(x['y']-r['name']['y'])<=1.1 and abs(x['b']-r['name']['b'])<=1.1,(width,r)
  assert r['advanced']['y']>=r['container']['b']-1 and r['collapsed'] and not r['diagVisible'],(width,r)
  assert r['container']['h']<=107,(width,r)
  print('PASS',width,'NAME height',round(r['container']['h'],2),'fields aligned','diagnostics collapsed')
  page.close()
 browser.close()
