"""Focused visual accordion geometry probe (not a full Forge audio/runtime test).
The markup uses the unchanged NAME card and the native details element used by P29.
"""
import re
from pathlib import Path
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parent.parent
compiled=(root/'dist/XenSonar_Standalone.html').read_text()
css='\n'.join(re.findall(r'<style(?:\s[^>]*)?>([\s\S]*?)</style>',compiled))
lab=(root/'src/rooms/lab.js').read_text()
assert 'data-forge-material-diagnostics-slot' in lab
assert 'ao.createPortal(__diagnosticsP29, __diagTargetP29)' in lab
assert 'data-forge-diagnostic-timbre-source' in lab
html='''<!doctype html><html><head><style>'''+css+'''body{background:#08070b;color:#c7bfd5;font-family:monospace;margin:0}.p29-probe{max-width:1290px;margin:auto;padding:8px}.diag-status{border:1px solid #34313b;padding:8px 12px;font-size:11px}.p29-info{font-size:11px;padding:8px 12px;border:1px solid #34313b}.p29-info p{margin:8px 0}.p29-gap{height:10px}</style></head><body><section class="p29-probe">
<div class="xen-forge-name-rack rounded border border-violet-900/50 bg-violet-950/15 text-[11px] text-violet-100/85"><span class="xen-forge-name-word">NAME</span><span class="xen-forge-name-colon">:</span><span class="xen-forge-name-heading">LOOP/SAMPLE BETITELN</span><input class="xen-forge-name-input" aria-label="Loop/Sample betiteln" value="Mikrofon_2026-10-21"><span class="xen-forge-name-help">This title is used for Material Track, direct Melodic Loop pink-track import, Root Follow, and saving the purple mask as a sample.</span></div>
<details data-forge-advanced="v1" class="mx-3 mb-3 rounded border border-neutral-800 bg-neutral-950/50 text-xs text-neutral-300"><summary>Additional Sound Paths & Diagnostics</summary><div data-forge-material-diagnostics-slot="true" class="space-y-2 border-t border-neutral-800 p-3"><div class="diag-status">Loop preview stopped.<br>Timbre: Current Purple Mask · auto-extract when listening to Donor<br>Embodiment: V2 Ready</div><section data-forge-material-metadata class="p29-info"><div>RAW AUDIO · METADATA</div><p>Sample / Loop · usable in Particles, Wave Starter, Melodic Loop and Drums.</p><p>Original Tempo 1079.7 BPM</p><details><summary>Melodic Loop · visual guides</summary>Bar Segments</details></section></div></details><div id="downstream" class="p29-gap"></div></section></body></html>'''
with sync_playwright() as pw:
 browser=pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
 for width in (1370,980,600,375):
  page=browser.new_page(viewport={'width':width,'height':700})
  page.set_content(html)
  data=page.evaluate('''()=>{const rect=q=>document.querySelector(q).getBoundingClientRect();const details=document.querySelector('[data-forge-advanced]');
    const a={open:details.open,summaryTop:rect('[data-forge-advanced]').top,nameBottom:rect('.xen-forge-name-rack').bottom,downstream:rect('#downstream').top,cardH:rect('.xen-forge-name-rack').height,metaVisible:!!(rect('[data-forge-material-metadata]').height&&getComputedStyle(document.querySelector('[data-forge-material-metadata]')).display!=='none')};details.open=true;return {...a,expandedDownstream:rect('#downstream').top,expanded:details.open,metaH:rect('[data-forge-material-metadata]').height}}''')
  assert not data['open'] and data['expanded']
  assert data['summaryTop']>=data['nameBottom']-1,(width,data)
  assert data['expandedDownstream']>data['downstream']+75,(width,data)
  print('width',width,'NAME',round(data['cardH'],2),'summary gap',round(data['summaryTop']-data['nameBottom'],2),'expanded growth',round(data['expandedDownstream']-data['downstream'],2))
  page.close()
 browser.close()
print('P29 BROWSER PROBE PASS: native details collapses statuses, source metadata and guides, NAME remains above')
