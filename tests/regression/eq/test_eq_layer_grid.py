"""UI-Integrity contract: meta wins over EQ, native popovers win over meta;
left-edge pitch-grid triangle cursor communicates vertical drag.
Usage: python test_eq_layer_grid.py html_file
"""
from pathlib import Path
import sys,re
html=Path(sys.argv[1]).read_text()
css=re.search(r'<style id="xen-eq-p1">([\s\S]*?)</style>', html).group(1)
for target in ('.xen-eq-trigger','.xen-eq-flyout'):
    m=re.search(re.escape(target)+r'\{([^}]*)\}',css)
    assert m, 'missing CSS '+target
    zi=re.search(r'z-index:\s*(\d+)', m.group(1))
    assert zi, 'missing z-index for '+target
    assert int(zi.group(1))<100,(target,zi.group(1),'meta is-native-behind z-index 100')
assert 'gridTuningHandle' in html, 'missing dynamic grid triangle hit-test cursor'
assert "style.cursor=(gridTuningHandle" in html, 'must assign cursor on hover'
assert "'ns-resize'" in html, 'vertical drag cursor missing'
assert "onCanvasMouseLeave:t=>{t.currentTarget.style.cursor=''" in html, 'cursor needs mouseleave reset'
assert 'xen-eq-command-strip' in html and 'xen-eq-pattern-actions' in html, 'old P1.3 layout removed'
print('PASS EQ stack + grid tuning cursor contracts')
