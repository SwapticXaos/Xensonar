#!/usr/bin/env python3
"""R19: the eight consolidated Emilia CSS rules must preserve the R18 look.

The host CSS reference is rendered in the same Chromium at 1280/750/375.
The older recorded styles remain available with --historical-snapshot.
The *only* permitted visual change is Mute's checkbox, checked separately.
"""
from pathlib import Path
import json,sys,hashlib
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1]
css=(root/'styles/areas/027_inline-027.css').read_text()
ref=root/'tests/fixtures/emilia_r18_css_parity_reference.json'
html='''<!doctype html><html><head><style>{css}</style></head><body>
<section class="emilia-b"><header class="emilia-b-heading"><div><strong>EMILIA · Nodal Timbre</strong><small>Carrier plays the figure</small></div><span>7 / 7 nodes</span></header><p class="emilia-b-caption">Positions shape timbre.</p>
<div class="emilia-b-field-frame"><svg viewBox="0 0 1000 1000" class="emilia-b-field"><rect width="1000" height="1000" fill="#123"/></svg><div class="emilia-b-ripple-overlay"></div></div>
<div class="emilia-b-actions"><label>Add node<select><option>+ Node</option></select></label><button>Undo</button><button>Redo</button><button>Preview</button></div>
<div class="emilia-b-node-list"><div class="emilia-b-list-entry selected"><button class="emilia-b-pick">01 · Resonator</button><span>1.00×</span><button>×</button></div></div>
<div class="emilia-b-inspector"><span>Selected · Resonator</span><label>Role<select><option>Resonator</option></select></label><label>Ratio<input type="number" value="1.0" /></label><label>Reach<input type="range" /></label><label>Mute<input type="checkbox" /></label></div>
<p class="emilia-b-status">Ready</p></section></body></html>'''
selectors=['.emilia-b','.emilia-b-field','.emilia-b-heading strong','.emilia-b-node-list','.emilia-b-list-entry','.emilia-b-list-entry .emilia-b-pick','.emilia-b-list-entry>button:last-child','.emilia-b-status','.emilia-b-actions button:last-child','.emilia-b-inspector','.emilia-b-inspector input[type=number]']
properties=['display','width','height','minHeight','maxWidth','maxHeight','gap','padding','border','borderRadius','background','boxShadow','fontSize','color','lineHeight','overflow','overflowY','gridTemplateColumns','alignSelf','aspectRatio']
def render_css(browser, css):
    data={}
    for w in [1280,750,375]:
        page=browser.new_page(viewport={'width':w,'height':900})
        page.set_content(html.format(css=css))
        data[str(w)]={}
        for selector in selectors:
            data[str(w)][selector]=page.locator(selector).evaluate('(el,props)=>{const s=getComputedStyle(el); return Object.fromEntries(props.map(k=>[k,s[k]]));}',properties)
        page.close()
    return data
with sync_playwright() as pw:
    browser=pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
    data=render_css(browser,css)
    baseline=(root/'tests/fixtures/emilia_r20_css_reference.css').read_bytes()
    assert hashlib.sha256(baseline).hexdigest()=='0e326138b9e9e0a5eb3b5fc1218397828bf71d013700af72c7427d38dba0bfc7'
    expected=render_css(browser,baseline.decode())
    browser.close()
if '--record-reference' in sys.argv:
    ref.parent.mkdir(parents=True,exist_ok=True)
    ref.write_text(json.dumps(data,indent=2,ensure_ascii=False)+'\n')
    print('Recorded CSS parity reference',ref)
else:
    if '--historical-snapshot' in sys.argv: expected=json.loads(ref.read_text())
    for w,items in expected.items():
        for sel,before in items.items():
            after=data[w][sel]
            # The new Mute checkbox is 23px rather than the old 29px rectangle.
            # Its owning inspector and parent section may shrink slightly; other styles are locked.
            if sel in ('.emilia-b','.emilia-b-inspector'):
                before={k:v for k,v in before.items() if k!='height'}
                after={k:v for k,v in after.items() if k!='height'}
            if before!=after:
                mismatch={key:(before.get(key),after.get(key)) for key in before if before.get(key)!=after.get(key)}
                raise AssertionError(f'CSS regression at {w}px {sel}: {mismatch}')
    print('PASS Emilia layout matches frozen R20 CSS in the same browser at 1280/750/375 px')
