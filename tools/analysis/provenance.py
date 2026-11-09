#!/usr/bin/env python3
"""Per-file provenance of the current source tree across historical waypoint HTMLs.
Static text evidence only (no source maps, no behaviour claims).
Usage: python3 tools/analysis/provenance.py <waypoints-dir> [oct26 source-manifest.json oct28 source-manifest.json]
  waypoints-dir contains the HTMLs listed in WAYPOINTS (branch reference/waypoints).
Writes docs/provenance/FILE_PROVENANCE.json."""
import json,re,sys,hashlib
from pathlib import Path
R=Path(__file__).resolve().parents[2];W=Path(sys.argv[1])
WAYPOINTS=[('2026-10-26','oct26_UI2_UI3_Integrity_SP1_Reverted_Test.html'),('2026-10-28','oct28_Gesamtmerge.html'),
           ('2026-11-05','nov05_STAGE05_REFERENCE_ONLY.html'),('2026-11-08','nov08_W31_LIVEGUARD02_e4fc.html')]
stmt=re.compile(r'[^;\n{}]{40,}')
def units(t):return {hashlib.blake2b(m.group(0).strip().encode(),digest_size=8).digest() for m in stmt.finditer(t)}
wp=[]
for date,name in WAYPOINTS:
    t=(W/name).read_text('utf-8');wp.append((date,name,t,units(t),hashlib.sha256(t.encode()).hexdigest()))
man=json.loads((R/'source-manifest.json').read_text('utf-8'))
status={r['file']:r['status'] for r in json.loads((R/'docs/SOURCE_TREE_STATUS.json').read_text())}
tsmap=json.loads((R/'docs/TS_ORIGIN_MAP.json').read_text())['files']
rows=[]
for s in man['sections']:
    for f in s['files']:
        t=(R/f).read_text('utf-8');u=units(t)
        pres={d:(t in txt) for d,_,txt,_,_ in wp}
        sim={d:(round(len(u&uu)/len(u),3) if u else None) for d,_,_,uu,_ in wp}
        first=next((d for d,_,_,_,_ in wp if pres[d]),None)
        if pres['2026-11-08']: since=f'unverändert seit {first}'
        elif first: since=f'bis {max(d for d in pres if pres[d])} vorhanden, danach geändert'
        else:
            prev=[d for d in sim if sim[d] and sim[d]>=.5]
            since='nach 2026-11-08 geändert (Claude)' if sim['2026-11-08'] and sim['2026-11-08']>=.9 else ('weiterentwickelt, nächster Stand '+max(prev,key=lambda d:sim[d])) if prev else 'neu oder stark umgebaut, Herkunft ungeklärt'
        claude=not pres['2026-11-08']
        cat=('HERKUNFT_UNBEKANNT' if claude and not any(v and v>=.5 for v in sim.values()) else
             'GEAENDERT_NACH_UEBERGABE' if claude else
             'ERHALTEN_OKT_IDENTISCH' if status[f]=='oct-identical' else
             'VERAENDERT_OKT_MODUL' if status[f]=='oct-evolved' else
             'NEU_NACH_OKT_EINSCHUB' if status[f]=='post-oct-gap' else 'NEU_NACH_OKT_BLOCK')
        rows.append({'file':f,'section':s['id'],'oct28_status':status[f],'bytes':len(t.encode()),'category':cat,'history':since,
                     'exact_in':[d for d in pres if pres[d]],'statement_similarity':sim,
                     'ts_origin_candidates':[e['ts'] for e in tsmap.get(f,[])][:6]})
out={'generated_from':{'source_manifest':'source-manifest.json','runtime_sha256':hashlib.sha256((R/'index.html').read_bytes()).hexdigest()},
 'waypoints':[{'date':d,'file':n,'sha256':h} for d,n,_,_,h in wp],
 'evidence':'EXACT = full file text verbatim in waypoint HTML; statement_similarity = share of statements (>=40 chars, split at ; { } newline) found in waypoint; ts_origin_candidates = LITERAL_MATCH_ONLY_NOT_MODULE_IDENTITY',
 'files':rows}
def layout(man_path):
    m=json.loads(Path(man_path).read_text('utf-8'));base=Path(man_path).parent
    return {f:hashlib.sha256((base/f).read_bytes()).hexdigest() for sec in m['sources'] for f in sec['files']}
if len(sys.argv)>3:
    l26=layout(sys.argv[2]);l28=layout(sys.argv[3])
    out['layout_oct26_to_oct28']={'same_path_same_content':sum(1 for k in l26 if l28.get(k)==l26[k]),
      'same_path_changed':sorted(k for k in l26 if k in l28 and l28[k]!=l26[k]),
      'only_oct26':sorted(set(l26)-set(l28)),'only_oct28':sorted(set(l28)-set(l26))}
spread={}
for f,es in tsmap.items():
    for e in es:spread.setdefault(e['ts'],[]).append(f)
out['ts_files_spread_over_several_current_files']={k:v for k,v in sorted(spread.items()) if len(v)>1}
p=R/'docs/provenance/FILE_PROVENANCE.json';p.parent.mkdir(parents=True,exist_ok=True);p.write_text(json.dumps(out,indent=1,ensure_ascii=False)+'\n','utf-8')
from collections import Counter
print(Counter(r['category'] for r in rows));print(Counter(r['history'].split(',')[0] if r['history'].startswith('bis') else r['history'] for r in rows).most_common(12))
