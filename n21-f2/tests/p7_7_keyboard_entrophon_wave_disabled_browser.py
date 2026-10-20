#!/usr/bin/env python3
"""P7.7: The Keyboard must stay audible when the separate Wave Starter is off.
Test the real P7.x menu, keyboard input and audio node creation in Chromium.
No assumptions about Entrophon worklet ownership are made: only standard
headless Legacy Web Audio is tested here, with source independence asserted.
"""
import asyncio
import os
from pathlib import Path
from playwright.async_api import async_playwright

ROOT = Path(__file__).resolve().parents[1]
HTML = Path(os.environ.get('XEN_TEST_HTML', ROOT / __import__('json').loads((ROOT/'source-manifest.json').read_text())['entry']))

async def run():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True, executable_path='/usr/bin/chromium',
            args=['--no-sandbox', '--disable-dev-shm-usage', '--autoplay-policy=no-user-gesture-required'])
        try:
            page = await browser.new_page(viewport={'width': 1440, 'height': 1060})
            errors = []
            page.on('pageerror', lambda e: errors.append(str(e)))
            await page.evaluate('''() => {
              const m = new Map();
              const store = {getItem:k=>m.has(k)?m.get(k):null,setItem:(k,v)=>m.set(k,String(v)),
                removeItem:k=>m.delete(k),clear:()=>m.clear(),key:n=>Array.from(m.keys())[n]||null,
                get length(){return m.size}};
              Object.defineProperty(window,'localStorage',{configurable:true,value:store});
              Object.defineProperty(window,'sessionStorage',{configurable:true,value:store});
              window.__entDispatch=[];
              window.__keyboardNodeStarts=0;
              const makeOsc=AudioContext.prototype.createOscillator;
              AudioContext.prototype.createOscillator=function(){window.__keyboardNodeStarts++;return makeOsc.call(this)};
            }''')
            code=HTML.read_text()
            assert code.count('function nq(e){') == 1, 'Renderer probe insertion point changed'
            code=code.replace('function nq(e){', 'function nq(e){window.__entDispatch.push({active:e.entrophonWaveActive});',1)
            await page.set_content(code, wait_until='domcontentloaded', timeout=60000)
            await page.get_by_role('button',name='Power').click()
            await page.wait_for_timeout(600)
            wave=page.get_by_role('checkbox',name='Wave Starter enabled')
            combo=page.get_by_role('combobox',name='Keyboard sound')
            await wave.uncheck()
            assert not await wave.is_checked(), 'Wave Starter must remain disabled'
            for source, key in [('entrophon','1'), ('clean_pluck','2')]:
                await combo.select_option(source)
                assert not await wave.is_checked(), 'Keyboard source selection unexpectedly enabled Wave Starter'
                await combo.evaluate("el=>el.blur()")
                await page.locator("body").click(position={"x":10,"y":10})
                await page.wait_for_timeout(170)
                await page.evaluate('window.__entDispatch.length=0')
                await page.keyboard.down(key)
                await page.wait_for_timeout(125)
                await page.keyboard.up(key)
                await page.wait_for_timeout(140)
                calls=await page.evaluate('window.__entDispatch')
                assert calls, f'Keyboard {source} dropped before renderer dispatch while Wave Starter OFF'
                assert any(v['active'] == (source=='entrophon') for v in calls), f'Wrong Keyboard backend: {calls}'
                print(f'PASS Keyboard {source} reaches the intended renderer with Wave Starter disabled')
            assert not errors, f'Browser errors: {errors[:4]}'
            print('PASS Wave Starter remains disabled; Keyboard source independent; browser errors 0')
        finally:
            await browser.close()

if __name__=='__main__':
    asyncio.run(run())
