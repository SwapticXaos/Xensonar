#!/usr/bin/env python3
"""No third-party dependencies: ownership checks for canonical base CSS rules.
Scoped @media rules are intentionally separate and are covered by browser matrix.
"""
from pathlib import Path
import re
root=Path(__file__).resolve().parents[2]/'styles/areas'
checks={
 '027_inline-027.css':['.emilia-b','.emilia-b-field','.emilia-b-heading strong','.emilia-b-list-entry','.emilia-b-list-entry .emilia-b-pick','.emilia-b-list-entry>button:last-child','.emilia-b-node-list','.emilia-b-status'],
 '026_nodal-sound-designer-style.css':['.melodic-import-sounds-stack','.melodic-instrument-plus-column','.melodic-instrument-violin','.melodic-import-sounds-stack .nd-library-manager-content'],
}
for file,selectors in checks.items():
 s=(root/file).read_text()
 for selector in selectors:
  count=len(re.findall(r'(?m)^'+re.escape(selector)+r'\s*\{',s))
  assert count==1,(file,selector,'duplicate canonical base rule',count)
s=(root/'030_inline-030.css').read_text()
assert 'bottom:62px' not in s,'legacy quick dock mobile bottom override still present'
assert '.xen-quick-collection{max-height:100%}' not in s,'legacy max-height override remains'
assert '.xen-quick-dock{padding:0}' not in s,'padding still patched at the end'
assert '.xen-quick-tile{font-size:10px}' not in s,'font-size still patched at the end'
assert '.xen-quick-dock.is-migrated{background:transparent}' in s,'migrated pointer state layering changed'
print('PASS canonical UI CSS ownership (no duplicate base owners, dead mobility overrides)')
