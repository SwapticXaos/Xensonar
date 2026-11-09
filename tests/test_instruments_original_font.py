"""Regression guard: original tintable Instruments navigation survives global emoji fallback.

Does not need the application to boot; compares source ownership and renders a focused
browser fixture. This is intentionally different from counting DOM codepoints alone.
"""
import asyncio
import json
import re
import sys
from pathlib import Path
from playwright.async_api import async_playwright

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'docs' / 'INSTRUMENTS_NAV_RESTORATION.json'


def font_range_contains(ranges, cp):
    for lo, hi in re.findall(r'U\+([0-9a-fA-F]+)(?:-([0-9a-fA-F]+))?', ranges):
        if int(lo, 16) <= cp <= int(hi, 16) if hi else int(lo, 16) == cp:
            return True
    return False


def stylesheet(tag):
    return (ROOT / 'styles' / 'areas' / tag).read_text()


def unique_rule(css, selector):
    matches = re.findall(r'(?m)^' + re.escape(selector) + r'\s*\{[^}]+\}', css)
    assert len(matches) == 1, (selector, len(matches))
    return matches[0]


async def browser_probe(font_css, left_css, right_css):
    # A locally generated fixture avoids this sandbox's direct file:// restrictions.
    # The actual CSS declarations, CSS custom-properties and glyphs come from sources.
    fixture = f'''<!doctype html><html><head><meta charset="utf-8"><style>
    {font_css}
    body{{background:#060608;color:#fff;font-family:var(--font-sans,system-ui,sans-serif);}}
    .xen-performance header{{display:flex;}}
    {left_css}
    {right_css}
    </style></head><body>
    <div class="xen-performance"><header><button id="left">◀</button></header></div>
    <div class="xen-quick-collection" style="position:relative;width:200px;height:80px">
      <button id="right" class="xen-quick-collapse-trigger">&gt;</button>
    </div>
    <p id="emoji">📀 🎼 🎸 🥁</p>
    </body></html>'''
    async with async_playwright() as p:
        browser = await p.chromium.launch(executable_path='/usr/bin/chromium', headless=True,
                                          args=['--no-sandbox', '--disable-dev-shm-usage'])
        try:
            page = await browser.new_page(viewport={'width': 500, 'height': 240}, device_scale_factor=1)
            await page.set_content(fixture, wait_until='domcontentloaded', timeout=15000)
            await page.evaluate('document.fonts.ready')
            session = await page.context.new_cdp_session(page)
            await session.send('DOM.enable'); await session.send('CSS.enable')
            doc = await session.send('DOM.getDocument')
            proof = {}
            for selector, positions in [('#left', ('◀', '▶')), ('#right', ('>', '<'))]:
                for direction in positions:
                    button = page.locator(selector)
                    await button.evaluate('(el, txt) => el.textContent=txt', direction)
                    info = await button.evaluate('''el => {const s=getComputedStyle(el);
                       const r=el.getBoundingClientRect();return {glyph:el.textContent,
                       color:s.color,background:s.backgroundColor,font:s.fontFamily,
                       width:r.width,height:r.height,tag:el.tagName};}''')
                    node = await session.send('DOM.querySelector', {'nodeId':doc['root']['nodeId'], 'selector':selector})
                    result = await session.send('CSS.getPlatformFontsForNode', {'nodeId':node['nodeId']})
                    info['platform_fonts'] = result['fonts']
                    assert any(f['glyphCount'] and 'Emoji' not in f['familyName'] for f in result['fonts']), info
                    assert not any(f['glyphCount'] and 'Emoji' in f['familyName'] for f in result['fonts']), info
                    assert info['color'].startswith('rgb(232, 121, 249)') or info['color'].startswith('rgb(241, 145, 255)'), info
                    assert info['tag'] == 'BUTTON'
                    if selector == '#left':
                        assert info['background'] == 'rgb(0, 0, 0)', info
                        assert info['width'] >= 26 and info['height'] == 26, info
                    proof[selector + direction] = info
            node = await session.send('DOM.querySelector', {'nodeId':doc['root']['nodeId'], 'selector':'#emoji'})
            fonts = (await session.send('CSS.getPlatformFontsForNode', {'nodeId':node['nodeId']}))['fonts']
            assert any('Emoji' in f['familyName'] and f['glyphCount'] >= 4 for f in fonts), fonts
            proof['emoji_fonts'] = fonts
            await page.screenshot(path=str(ROOT / 'docs' / 'INSTRUMENTS_NAV_FOCUSED.png'))
            return proof
        finally:
            await browser.close()


def main():
    font_css = (ROOT/'styles/ui-fonts.css').read_text()
    left_css = unique_rule(stylesheet('029_inline-029.css'), '.xen-performance header button')
    right_css = unique_rule(stylesheet('030_inline-030.css'), '.xen-quick-collapse-trigger')
    # Compare the *original* rules from Final Merge, not a later override.
    orig_left = '.xen-performance header button{color:#e879f9;background:#000;min-width:26px;min-height:26px;font-size:20px;letter-spacing:0;line-height:1}'
    orig_right = '.xen-quick-collapse-trigger{position:absolute;z-index:5;top:26px;right:-29.5px;left:auto;display:grid;place-items:center;box-sizing:border-box;width:26px;height:26px;min-width:26px;min-height:26px;padding:0;border:0;border-radius:0;background:#000;color:#e879f9;font:20px/1 sans-serif;cursor:pointer}'
    assert left_css == orig_left, 'Instruments control must be the original Final Merge rule (not an override)'
    assert right_css == orig_right, 'quickrack sibling must keep its original non-identical shape'
    m = re.search(r'@font-face\{font-family:"XenSonar Emoji";[^}]*?unicode-range:([^}]+)\}', font_css)
    assert m, 'Emoji range not found'
    ranges = m.group(1)
    assert not font_range_contains(ranges, 0x25C0), 'Global emoji font still hijacks original ◀ text arrow'
    assert not font_range_contains(ranges, 0x25B6), 'Global emoji font still hijacks original ▶ text arrow'
    # Others that should remain text, not converted into pictogram squares.
    for cp in (0x25B2,0x25BC,0x25C2,0x25B8,0x25CB,0x25CF,0x266A,0x266C):
        assert not font_range_contains(ranges, cp), hex(cp)
    for cp in (0x1F4BF,0x1F3BC,0x1F3B8,0x1F941,0x2705):
        assert font_range_contains(ranges, cp), 'real emoji missing '+hex(cp)
    proof = asyncio.run(browser_probe(font_css, left_css, right_css))
    OUT.write_text(json.dumps(proof,ensure_ascii=False,indent=2))
    print('PASS: exact Final Merge controls, original tintable triangle, distinct right arrow, real Emoji glyphs')


if __name__=='__main__':
    main()
