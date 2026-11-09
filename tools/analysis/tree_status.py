#!/usr/bin/env python3
"""docs/SOURCE_TREE_STATUS.json: status of every source file vs the Oct-28 source tree.
Usage: python3 tools/analysis/tree_status.py <oct28-root>"""
import json,sys
from pathlib import Path
R=Path(__file__).resolve().parents[2];O=Path(sys.argv[1])
m=json.loads((R/'source-manifest.json').read_text('utf-8'));rows=[]
for s in m['sources']:
    for f in s['files']:
        t=(R/f).read_bytes();o=O/f
        st=('post-oct-gap' if '/post-oct/gaps/' in f else 'post-oct' if '/post-oct/' in f else
            'oct-identical' if o.exists() and o.read_bytes()==t else 'oct-evolved')
        rows.append({'file':f,'status':st,'bytes':len(t),'oct28_bytes':o.stat().st_size if o.exists() else 0})
(R/'docs/SOURCE_TREE_STATUS.json').write_text(json.dumps(rows,indent=0)+'\n')
from collections import Counter;print(Counter(r['status'] for r in rows),len(rows))
