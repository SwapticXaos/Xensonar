#!/usr/bin/env python3
"""XenSonar static historical-source probe, standard-library only.
Does NOT reconstruct source maps or establish true module ancestry.
Usage: python3 evidence_probe.py --runtime PATH_TO_CLAUDE_CURRENT_HTML --oct-zip OCT28.zip [--ts-zip SEP4002.zip] --out probe.json
"""
import argparse, collections, hashlib, json, re, zipfile
from pathlib import Path

def hash256(data):return hashlib.sha256(data).hexdigest()

def main():
    ap=argparse.ArgumentParser()
    ap.add_argument('--runtime',required=True)
    ap.add_argument('--oct-zip',required=True)
    ap.add_argument('--ts-zip')
    ap.add_argument('--out',default='provenance_probe.json')
    a=ap.parse_args()
    runtime=Path(a.runtime).read_bytes()
    result={'runtime_file':str(a.runtime),'runtime_sha256':hash256(runtime),'runtime_bytes':len(runtime),
      'method':'EXACT bytes and unique static literals only. No semantic/behavioral claim.', 'oct_modules':[],'ts_candidate_origins':[]}
    with zipfile.ZipFile(a.oct_zip) as z:
        for name in z.namelist():
            if not name.startswith(('XenSonar/src/','XenSonar/styles/')) or not name.endswith(('.js','.css','.ts','.tsx')):continue
            blob=z.read(name)
            if len(blob)<120:continue
            if blob in runtime:
                result['oct_modules'].append({'path':name, 'status':'EXACT_FULL', 'bytes':len(blob),'sha256':hash256(blob)})
                continue
            anchors=[]
            for off in sorted({0, max(0, len(blob)//2-256),max(0,len(blob)-512)}):
                sub=blob[off:off+512]
                if len(sub)>200 and sub in runtime:anchors.append(off)
            if anchors:
                result['oct_modules'].append({'path':name,'status':'ANCHOR_ONLY','bytes':len(blob),'anchor_offsets':anchors})
        result['oct_modules'].sort(key=lambda x:(x['status']!='EXACT_FULL', x['path']))
    if a.ts_zip:
        # Only unescaped, fully static quoted strings >= 32 characters. Very conservative.
        pat=re.compile(rb"([\"\x27])([^\n\r\\]{32,180})\1")
        corpus=[]
        with zipfile.ZipFile(a.ts_zip) as z:
            for name in z.namelist():
                if not name.startswith('src/') or not name.endswith(('.ts','.tsx')):continue
                data=z.read(name)
                literals={m.group(2) for m in pat.finditer(data) if b'${' not in m.group(2)}
                corpus.append((name,literals))
        # Unique across files: reduces, but cannot eliminate, false provenance positives.
        frequency=collections.Counter(lit for _,ls in corpus for lit in ls)
        for name,ls in corpus:
            matches=[lit for lit in ls if frequency[lit]==1 and lit in runtime]
            if matches:
                result['ts_candidate_origins'].append({'path':name,'unique_static_literals_found':len(matches),
                  'examples':[x.decode('utf-8','replace')[:90] for x in sorted(matches,key=len,reverse=True)[:4]],
                  'evidence':'LITERAL_MATCH_ONLY_NOT_MODULE_IDENTITY'})
        result['ts_candidate_origins'].sort(key=lambda x:-x['unique_static_literals_found'])
    Path(a.out).write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
    print('Runtime SHA256:', result['runtime_sha256'])
    print('October exact modules:',sum(1 for x in result['oct_modules'] if x['status']=='EXACT_FULL'))
    print('October partial-anchor modules:',sum(1 for x in result['oct_modules'] if x['status']=='ANCHOR_ONLY'))
    print('TS candidate matches:',len(result['ts_candidate_origins']))
    print('Written:',a.out)

if __name__=='__main__':main()
