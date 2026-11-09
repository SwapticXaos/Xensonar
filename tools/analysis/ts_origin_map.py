#!/usr/bin/env python3
"""Map current source files (source-manifest.json order) to their September TypeScript origin
(400.2, branch reference/ts-400.2) via string-literal anchors that survive compilation.
Usage: python3 tools/analysis/ts_origin_map.py <path-to-400.2-checkout>  -> docs/TS_ORIGIN_MAP.json"""
import json,re,sys,bisect,collections
from pathlib import Path
R=Path(__file__).resolve().parents[2];TS=Path(sys.argv[1])
man=json.loads((R/'source-manifest.json').read_text('utf-8'))
files=[f for s in man['sections'] for f in s['files'] if f.endswith('.js')]
starts=[];buf=[];pos=0
for f in files:
    t=(R/f).read_text('utf-8');starts.append(pos);buf.append(t);pos+=len(t)
text=''.join(buf)
lit=re.compile(r'''(["'])((?:(?!\1)[^\\\n]|\\.){16,200})\1''')
cur2ts=collections.defaultdict(collections.Counter);ts_total=collections.Counter()
for p in sorted(TS.joinpath('src').rglob('*')):
    if p.suffix not in('.ts','.tsx') or '.test.' in p.name or p.name.endswith('.d.ts') or '/external/' in str(p):continue
    name=str(p.relative_to(TS))
    for m in lit.finditer(p.read_text('utf-8',errors='replace')):
        l=m.group(2)
        if '${' in l:continue
        i=text.find(l)
        if i<0 or text.find(l,i+1)>=0:continue
        ts_total[name]+=1;cur2ts[files[bisect.bisect_right(starts,i)-1]][name]+=1
out={f:[{'ts':k,'anchors':v} for k,v in c.most_common() if v>=2][:12] for f,c in cur2ts.items()}
out={k:v for k,v in out.items() if v}
(R/'docs/TS_ORIGIN_MAP.json').write_text(json.dumps({'method':'unique string literals (>=16 chars) from 400.2 TS found exactly once in current sources; >=2 anchors per pair','ts_ref':'branch reference/ts-400.2','files':out},indent=1,ensure_ascii=False)+'\n','utf-8')
print('current files with TS origin:',len(out),'| distinct TS files referenced:',len({e['ts'] for v in out.values() for e in v}))
