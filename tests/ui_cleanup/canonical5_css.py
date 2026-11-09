#!/usr/bin/env python3
"""Canonical ownership in meta Session and Nodal layout; preserve mobile cascade."""
from pathlib import Path
import re
root=Path(__file__).resolve().parents[2]/'styles/areas'
meta=(root/'036_xen-meta-menu.css').read_text()
checks={
 '.xen-meta-browser-heading':2,  # canonical + intentional later mobile row-gap
 '.xen-meta-browser-heading input':2, # canonical + 760px responsive
 '.xen-meta-tile':1,
 '.xen-meta-tile-index':1,
 '.xen-meta-tile-name':1,
 '.xen-quick-tile.is-parallel-material':1,
}
for sel,want in checks.items():
 actual=len(re.findall(r'(?<![\w.\-#\[:])'+re.escape(sel)+r'\{',meta))
 # browser-heading matches one responsive selector in addition to base+mobile override
 if sel=='.xen-meta-browser-heading':want=3
 assert actual==want,(sel,actual,want)
assert '.xen-meta-browser-heading{row-gap:8px}' in meta,'explicit mobile gap correction required'
assert meta.index('@media(max-width:760px){.xen-meta-browser-heading') < meta.index('.xen-meta-browser-heading{row-gap:8px}'), 'mobile correction order changed'
assert not re.search(r'\.xen-meta-tile\{box-sizing:border-box;border-width:3px;',meta),'old tile frame override still present'
assert not re.search(r'\.xen-meta-tile\{position:relative;box-sizing:border-box;',meta),'new tile frame still lives in override'
nodal=(root/'026_nodal-sound-designer-style.css').read_text()
for legacy in [
 'grid-template-columns:minmax(0,1fr) 176px',
 'grid-template-columns:minmax(0,1fr) 30px',
 ' .nd-open-workshop .nd-stage{max-width:360px}\n',
 ' .nd-open-workshop .nd-spectrum canvas{height:21px}\n',
 ' .nd-open-workshop .nd-modal-space>svg{height:60px}\n',
]: assert legacy not in nodal, ('obsolete layout candidate remains',legacy)
assert 'grid-template-columns:minmax(0,1fr) 184px' in nodal
assert 'grid-template-columns:minmax(0,1fr) 54px' in nodal
print('PASS Meta Session canonical tile/heading owners and Nodal superseded same-breakpoint declarations')
