"""P31.1: UPPER/UP typeface identity, compact vertical chevrons, centered glyph."""
from pathlib import Path
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1]
css=(root/'styles/areas/028_inline-028.css').read_text()
with sync_playwright() as pw:
    browser=pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
    page=browser.new_page(viewport={'width':1360,'height':440},device_scale_factor=1)
    page.set_content('''<!doctype html><html><body style="margin:0;background:#06070c;color:white;font-family:ui-monospace,monospace">
      <div class="xen-forge-action-rack" style="width:1360px;height:168px;position:relative;background:#080b10">
        <button type="button" class="xen-forge-upper-triangle" aria-label="Scroll to very top"><span class="xen-forge-upper-double-chevron" aria-hidden="true">⌃\n⌃</span><span class="xen-forge-upper-label">UPPER</span></button>
        <button type="button" class="xen-forge-up-triangle" aria-label="Scroll to Synth Lab"><span class="xen-forge-up-chevron" aria-hidden="true">⌃</span><span class="xen-forge-up-label">UP</span></button>
      </div></body></html>''')
    page.add_style_tag(content=css)
    result=page.evaluate('''()=>{
      const get=sel=>{const el=document.querySelector(sel),s=getComputedStyle(el),r=el.getBoundingClientRect();return {
        x:r.x,y:r.y,width:r.width,height:r.height,centerX:r.left+r.width/2, bottom:r.bottom,
        fontFamily:s.fontFamily,fontSize:s.fontSize,fontWeight:s.fontWeight,lineHeight:s.lineHeight,
        text:el.textContent.trim(),whiteSpace:s.whiteSpace
      }};
      return {outer:get('.xen-forge-upper-triangle'),inner:get('.xen-forge-up-triangle'),
        upperGlyph:get('.xen-forge-upper-double-chevron'),upperWord:get('.xen-forge-upper-label'),
        upGlyph:get('.xen-forge-up-chevron'),upWord:get('.xen-forge-up-label')};
    }''')
    assert result['upperWord']['fontFamily']==result['upWord']['fontFamily'],('UPPER must use UP font family',result)
    assert result['upperWord']['fontSize']==result['upWord']['fontSize'],('UPPER must use UP font size',result)
    assert result['upperWord']['fontWeight']==result['upWord']['fontWeight'],('UPPER must use UP font weight',result)
    assert result['upperWord']['lineHeight']==result['upWord']['lineHeight'],('UPPER must use UP line height',result)
    assert result['upperGlyph']['fontFamily']==result['upGlyph']['fontFamily'],('matching angle typographies',result)
    assert abs(result['upperGlyph']['centerX']-result['upperWord']['centerX'])<=0.5,('center UPPER glyph on UPPER word',result)
    assert result['upperGlyph']['text']=='⌃\n⌃',('stack two angles, never arrows',result)
    assert result['upperGlyph']['height']<=24,('angle pair must be tightly vertically stacked',result)
    assert 0<=result['upperWord']['y']-result['upperGlyph']['bottom']<=8,('stack angles immediately above UPPER',result)
    assert result['outer']['width']==result['outer']['height']==168
    assert result['inner']['width']==result['inner']['height']==80
    page.screenshot(path='/mnt/data/XenSonar_P31_1_UPPER_Typografie_Vorschau.png')
    print('P31.1 UPPER TYPEFACE BROWSER PASS:',result)
    browser.close()
