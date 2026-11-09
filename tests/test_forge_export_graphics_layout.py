"""P2.8 Focused browser geometry on the real stylesheet.
Verify the NAME card gains RHS metadata without adding height or wrapped help.
Button dimensions remain 80px tall and the test tube grows only in width.
"""
import re
from pathlib import Path
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parent.parent
markup=(root/'dist/XenSonar_Standalone.html').read_text()
css='\n'.join(re.findall(r'<style(?:\s[^>]*)?>([\s\S]*?)</style>',markup))
help_text='This title is used for Material Track, direct Melodic Loop pink-track import, Root Follow, and saving the purple mask as a sample.'
fields='''<div class="xen-forge-inline-metadata" data-forge-inline-metadata="true">
<label class="xen-forge-quick-field"><span class="xen-forge-quick-caption">Number of Bars</span><input class="xen-forge-quick-input rounded border border-neutral-700 bg-neutral-950 px-2 py-1 text-neutral-100" type="number" aria-label="Number of Bars" value="4"></label>
<label class="xen-forge-quick-field"><span class="xen-forge-quick-caption">Frequency Anchor (Hz)</span><input class="xen-forge-quick-input rounded border border-neutral-700 bg-neutral-950 px-2 py-1 text-neutral-100" type="number" aria-label="Material Frequency Anchor (Hz)" placeholder="Auto"></label>
</div>'''
name='''<span class="xen-forge-name-word" aria-hidden="true">NAME</span><span class="xen-forge-name-colon" aria-hidden="true">:</span>
<span class="xen-forge-name-heading uppercase tracking-[0.18em] text-violet-300/80">Loop/Sample betiteln</span>
<input class="xen-forge-name-input w-full rounded border border-violet-800/70 bg-neutral-950 px-2 py-2 text-sm text-violet-50 outline-none focus:border-violet-500" type="text" aria-label="Loop/Sample betiteln" value="Mikrofon_2026-10-21T13-02">
<span class="xen-forge-name-help text-[10px] leading-relaxed text-violet-100/60">'''+help_text+'''</span>'''
base='''<div class="xen-forge-name-rack rounded border border-violet-900/50 bg-violet-950/15 text-[11px] text-violet-100/85">'''+name+'''</div>'''
modified='''<div class="xen-forge-name-rack rounded border border-violet-900/50 bg-violet-950/15 text-[11px] text-violet-100/85">'''+name+fields+'''</div>'''
buttons='''<div class="xen-forge-action-rack flex flex-wrap items-stretch gap-2" data-action-row="true">
 <button class="min-h-[5rem] min-w-[6.25rem]">Apply Raw</button>
 <button class="min-h-[5rem] min-w-[11rem]"><span class="xen-forge-export-tile"><span class="xen-forge-export-icon">🧬</span><span class="xen-forge-export-words"><span>Extract Timbre</span><span>(Donor Workshop)</span></span></span></button>
 <button class="min-h-[5rem] min-w-[6.5rem]">PLAY</button>
 <button class="min-h-[5rem] min-w-[11.25rem]"><span class="xen-forge-export-tile"><span class="xen-forge-export-icon">📀</span><span class="xen-forge-export-words"><span>Send raw as a loop to Material Track</span><span>(Main Room)</span></span></span></button>
 <button class="min-h-[5rem] min-w-[9.5rem]"><span class="xen-forge-export-tile"><span class="xen-forge-export-icon">🎵</span><span class="xen-forge-export-words"><span>Send as Pink Track</span><span>to Melodic Loop</span></span></span></button>
 <button class="xen-carrier-transform"><span class="xen-forge-export-tile"><span class="xen-forge-export-icon">🧪</span><span class="xen-forge-export-words"><span>Transform to</span><span>Carrier</span></span></span></button>
</div>'''
html='<!doctype html><meta charset="utf-8"><style>'+css+'''body{background:#08070c;color:#ddd; margin:0; font-family:monospace} .container{padding:10px 20px}.below{height:20px;background:#1e1e24}</style>
<div class="container" data-sample="base">'''+base+'''<div class="below"></div></div>
<div class="container" data-sample="modified">'''+modified+'''<div class="below"></div></div>
<div class="container" data-sample="buttons">'''+buttons+'''</div>'''
with sync_playwright() as playwright:
 browser=playwright.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
 for width in (1370,1290,1180,980,850,600,375):
  page=browser.new_page(viewport={'width':width,'height':1000})
  page.set_content(html)
  metrics=page.evaluate('''()=>{
   const box=e=>{if(!e)return null;const r=e.getBoundingClientRect();return{x:r.x,y:r.y,w:r.width,h:r.height,b:r.bottom,c:r.top+r.height/2}};
   const base=document.querySelector('[data-sample="base"]'),next=document.querySelector('[data-sample="modified"]');
   return {base:box(base.querySelector('.xen-forge-name-rack')),next:box(next.querySelector('.xen-forge-name-rack')),
    belowBase:box(base.querySelector('.below')),belowNext:box(next.querySelector('.below')),
    word:box(next.querySelector('.xen-forge-name-word')),nameInput:box(next.querySelector('.xen-forge-name-input')),
    colon:box(next.querySelector('.xen-forge-name-colon')),bar:box(next.querySelector('[aria-label="Number of Bars"]')),
    anchor:box(next.querySelector('[aria-label="Material Frequency Anchor (Hz)"]')),
    help:box(next.querySelector('.xen-forge-name-help')),
    cards:[...document.querySelectorAll('[data-action-row] button')].map(e=>({label:e.textContent,h:box(e).h,w:box(e).w}))
   }
  }''')
  diff=metrics['next']['h']-metrics['base']['h']
  print('width',width,'name',round(metrics['next']['h'],2),'delta',round(diff,2),'bar',round(metrics['bar']['w'],1),'anchor',round(metrics['anchor']['w'],1),'input',round(metrics['nameInput']['w'],1),'carrier',round(metrics['cards'][-1]['w'],1))
  assert diff <= 1.1,(width,'Extra height',diff)
  assert metrics['bar']['y']>metrics['next']['y'] and metrics['anchor']['b']<=metrics['next']['b']+1, (width,'metadata outside card')
  assert metrics['bar']['x']>metrics['nameInput']['x']+metrics['nameInput']['w']-1,(width,'controls not to RIGHT of title')
  assert abs(metrics['colon']['c']-metrics['nameInput']['c'])<2,(width,'colon not aligned')
  assert metrics['bar']['w']>=30 and metrics['anchor']['w']>=45,(width,'inputs too small')
  assert all(79<=x['h']<=82 for x in metrics['cards']),(width,'tile heights changed',metrics['cards'])
  if width==1290:
   (Path('/mnt/data')/'XenSonar_Forge_Export_UI_Geometry_1290.png').write_bytes(page.screenshot(full_page=True))
  page.close()
 browser.close()
print('PASS: no NAME height growth, RHS controls, icons and fixed action tile heights')
