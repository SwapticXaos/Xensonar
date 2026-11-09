"""Browser geometry gate: NAME may not add vertical height in the Forge export rack.
Renders the real compiled stylesheet and both old/new component DOMs at identical viewport widths.
"""
import re
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
HTML=ROOT/'dist/XenSonar_Standalone.html'
source=HTML.read_text()
styles='\n'.join(re.findall(r'<style(?:\s[^>]*)?>([\s\S]*?)</style>',source))
help_text='This title is used for Material Track, direct Melodic Loop pink-track import, Root Follow, and saving the purple mask as a sample.'
old_card='''<label class="rounded border border-violet-900/50 bg-violet-950/15 px-3 py-2 text-[11px] text-violet-100/85">
 <span class="block uppercase tracking-[0.18em] text-violet-300/80">Loop/Sample betiteln</span>
 <input class="mt-2 w-full rounded border border-violet-800/70 bg-neutral-950 px-2 py-2 text-sm text-violet-50 outline-none focus:border-violet-500" value="Mikrofon_2026-10-21T13-02"/>
 <span class="mt-2 block text-[10px] leading-relaxed text-violet-100/60">'''+help_text+'''</span>
</label>'''
new_card='''<label class="xen-forge-name-rack rounded border border-violet-900/50 bg-violet-950/15 text-[11px] text-violet-100/85">
 <span aria-hidden="true" class="xen-forge-name-word">NAME</span>
 <span aria-hidden="true" class="xen-forge-name-colon">:</span>
 <span class="xen-forge-name-heading uppercase tracking-[0.18em] text-violet-300/80">Loop/Sample betiteln</span>
 <input aria-label="Loop/Sample betiteln" class="xen-forge-name-input w-full rounded border border-violet-800/70 bg-neutral-950 px-2 py-2 text-sm text-violet-50 outline-none focus:border-violet-500" value="Mikrofon_2026-10-21T13-02"/>
 <span class="xen-forge-name-help text-[10px] leading-relaxed text-violet-100/60">'''+help_text+'''</span>
</label>'''
aux='<div class="rounded border border-neutral-800 bg-neutral-900/40 px-3 py-2 text-[11px] text-neutral-400">Loop preview stopped.<br/>Timbre: missing<br/>Embodiment: missing</div>'
styles+="\nbody{background:#060509; color:#f6edff; margin:0}.demo{width:100%;padding:8px 16px}.below{height:20px; background:#232028}"
def parent(card,mode):
 grid='lg:grid-cols-[minmax(13rem,18rem)_minmax(12rem,18rem)_minmax(0,1fr)]' if mode=='old' else 'lg:grid-cols-[minmax(25rem,31rem)_minmax(12rem,18rem)_minmax(0,1fr)]'
 return f'<div data-kind="{mode}" class="demo"><div class="grid gap-2 {grid} lg:items-stretch">{card}{aux}</div><div class="below"></div></div>'
page_html=f'<!doctype html><html><head><meta charset="utf-8"/><style>{styles}</style></head><body>{parent(old_card,"old")}{parent(new_card,"new")}</body></html>'
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
 for width in (1180,980,850,600,375):
  page=browser.new_page(viewport={'width':width,'height':1000},device_scale_factor=1)
  page.set_content(page_html,wait_until='domcontentloaded')
  metrics=page.evaluate('''()=>Object.fromEntries(['old','new'].map(kind=>{
    const root=document.querySelector(`[data-kind="${kind}"]`), label=root.querySelector('label'), parent=label.parentElement,
      below=root.querySelector('.below'),input=label.querySelector('input'),help=label.querySelector('span:last-child'),
      word=label.querySelector('.xen-forge-name-word'),colon=label.querySelector('.xen-forge-name-colon');
    const box=x=>{if(!x)return null;const r=x.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,bottom:r.bottom,centerY:r.top+r.height/2,scrollWidth:x.scrollWidth,clientWidth:x.clientWidth}};
    return [kind,{label:box(label),parent:box(parent),below:box(below),input:box(input),help:box(help),word:box(word),colon:box(colon)}];
  }))''')
  a,b=metrics['old'],metrics['new']
  difference=round(b['parent']['height']-a['parent']['height'],2)
  print(f'width={width}: old card={a["label"]["height"]:.2f}, new card={b["label"]["height"]:.2f}, downstream shift={difference:+.2f}, name={b["word"]["height"]:.2f}, input={b["input"]["width"]:.2f}, colonDiff={abs(b["colon"]["centerY"]-b["input"]["centerY"]):.2f}')
  assert b['label']['height']<=a['label']['height']+1.1, f'Width {width}: NAME label grew by {b["label"]["height"]-a["label"]["height"]:.1f}px'
  assert b['parent']['height']<=a['parent']['height']+1.1, f'Width {width}: NAME pushed the next controls down by {difference:.1f}px'
  assert b['help']['bottom']<=b['label']['bottom']-5, 'Help text must remain inside the existing card'
  # P2.8 graphics: help is intentionally single-line; narrow viewports expose
  # its complete contents through an independently scrollable text strip.
  if b['help']['scrollWidth']>b['help']['clientWidth']+1:
   overflow=page.locator('[data-kind="new"] .xen-forge-name-help').evaluate('el => getComputedStyle(el).overflowX')
   assert overflow=='auto', 'Non-wrapping help requires a scrollable escape hatch'
  assert page.locator('[data-kind="new"] input').input_value()=='Mikrofon_2026-10-21T13-02', 'Existing title must remain editable/present'
  assert b['input']['width']>=125, 'Input field squeezed too small'
  assert abs(b['colon']['centerY']-b['input']['centerY'])<1.5, 'Colon not aligned to input'
  page.close()
 browser.close()
print('P2.8 NAME HEIGHT GATE PASS: no downstream vertical shift at desktop / tablet / mobile widths')
