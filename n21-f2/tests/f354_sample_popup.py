import os
"""F3.56.54 regression: Sample chooser is an opaque portal above drum hits.

Tests real rendered React elements and computed DOM/CSS; does not claim hardware audio.
"""
from pathlib import Path
from playwright.sync_api import sync_playwright
import json

ROOT=Path(__file__).resolve().parents[1]
HTML=(ROOT/json.loads((ROOT/'source-manifest.json').read_text())['entry']).read_text()
SEED='''() => {const m=new Map;const s={getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,String(v)),removeItem:k=>m.delete(k),clear:()=>m.clear(),key:i=>[...m.keys()][i]??null,get length(){return m.size}};Object.defineProperty(window,'localStorage',{configurable:true,value:s});Object.defineProperty(window,'sessionStorage',{configurable:true,value:s})}'''

with sync_playwright() as p:
 browser=p.chromium.launch(headless=True,executable_path=os.environ.get('XENSONAR_CHROMIUM_PATH'),args=['--no-sandbox'])
 try:
  page=browser.new_page(viewport={'width':1450,'height':950});errors=[]
  page.on('pageerror',lambda e:errors.append(str(e)))
  page.evaluate(SEED)
  page.set_content(HTML,wait_until='domcontentloaded',timeout=60000)
  page.get_by_role('button').filter(has_text='Broken Lilt').first.evaluate('(el)=>el.click()')
  editor=page.locator('.xen-main-drum-editor');editor.wait_for(timeout=25000)
  start_height=editor.evaluate('(e)=>e.getBoundingClientRect().height')
  assert editor.get_by_text('Shuffle',exact=True).count()==1,'Shuffle label not compact'
  for label in ('Sample A','Sample B','Sample C'):
   button=page.get_by_role('button',name='Choose '+label+' audio sample')
   style=button.evaluate('''e=>{const s=getComputedStyle(e);return {width:e.getBoundingClientRect().width,height:e.getBoundingClientRect().height,border:s.borderTopWidth,borderColor:s.borderTopColor}}''')
   assert style['width']>40 and style['height']>=20,style
   assert float(style['border'].removesuffix('px'))>=1,('Sample label border missing',label,style)
   button.evaluate('(el)=>el.click()')
   dialog=page.get_by_role('dialog',name=label+' selection');dialog.wait_for(timeout=4000)
   computed=dialog.evaluate('''e=>{const s=getComputedStyle(e);const c=s.backgroundColor.match(/[\\d.]+/g).map(Number);return {parent:e.parentElement.tagName.toLowerCase(),opacity:+s.opacity,bg:s.backgroundColor,alpha:c.length>=4?c[3]:1,z:+s.zIndex,height:e.getBoundingClientRect().height}}''')
   assert computed['parent']=='body',('dialog not portaled above drum UI',computed)
   assert computed['alpha']==1 and computed['opacity']==1,('dialog transparent',computed)
   assert computed['z']>=999,('dialog not highest layer',computed)
   assert abs(editor.evaluate('(e)=>e.getBoundingClientRect().height')-start_height)<2, 'layout shifted with popup'
   if label=='Sample A':
    # At any real geometric overlap, pointer hit-testing must resolve to the
    # dialog (or one of its descendants), never to the drum hit below.
    step=page.get_by_role('button',name='Sample A, step 1',exact=True)
    assert step.count()==1
    layering=page.evaluate('''() => {
      const step=document.querySelector('button[aria-label="Sample A, step 1"]');
      const dialog=document.querySelector('[role="dialog"][aria-label="Sample A selection"]');
      const s=step.getBoundingClientRect(),d=dialog.getBoundingClientRect();
      const l=Math.max(s.left,d.left),r=Math.min(s.right,d.right);
      const t=Math.max(s.top,d.top),b=Math.min(s.bottom,d.bottom);
      if(r<=l||b<=t)return {overlap:false};
      const hit=document.elementFromPoint((l+r)/2,(t+b)/2);
      return {overlap:true,dialogOnTop:!!hit?.closest('[role="dialog"]'),hitTag:hit?.tagName};
    }''')
    assert layering['overlap'],layering
    assert layering['dialogOnTop'],('hit step bleeds over dialog',layering)
   page.get_by_role('button',name='Close sample selection').evaluate('(e)=>e.click()')
   assert page.get_by_role('dialog').count()==0
  assert not errors,errors
  report={'status':'PASS','assertions':['three outlined sample selectors','compact Shuffle caption','dialog portaled to document.body','fully opaque backdrop and high z-index','hit-testing confirms chooser covers drum steps','no rack height movement','all 3 open/close'], 'pageErrors':errors}
  (ROOT/'results/f354_sample_popup.json').write_text(json.dumps(report,indent=2));print(json.dumps(report,indent=2))
 finally:browser.close()
