#!/usr/bin/env python3
import argparse, json, re, sys
from pathlib import Path
ROOT=Path(__file__).resolve().parent
MANIFEST=ROOT/'contracts/P0N_CONTROL_PROTOCOL.json'
C_OUT=ROOT/'src/p0_native_control_protocol.h'
JS_OUT=ROOT/'browser/p0_native_control_protocol.js'

def macro(s):
    return re.sub(r'(?<!^)(?=[A-Z])','_',s).upper()

def c_quote(v): return json.dumps(str(v))

def render_c(m):
    lines=['#ifndef P0_NATIVE_CONTROL_PROTOCOL_H','#define P0_NATIVE_CONTROL_PROTOCOL_H','',f'#define P0N_PROTOCOL_VERSION {c_quote(m["version"])}','']
    for k,v in m['routes'].items(): lines.append(f'#define P0N_ROUTE_{macro(k)} {c_quote(v)}')
    lines.append('')
    for k,v in m['headers'].items(): lines.append(f'#define P0N_HEADER_{macro(k)} {c_quote(v)}')
    lines.append('')
    for k,v in m['status'].items(): lines.append(f'#define P0N_HTTP_{macro(k)} {int(v)}')
    lines.append('')
    for k,v in m['errors'].items(): lines.append(f'#define P0N_ERROR_{macro(k)} {c_quote(v)}')
    lines += ['','#endif','']
    return '\n'.join(lines)

def render_js(m):
    payload=json.dumps(m,separators=(',',':'),ensure_ascii=False)
    return "(function(global){'use strict';global.XensonarNativeProtocol=Object.freeze("+payload+");})(typeof globalThis!=='undefined'?globalThis:window);\n"

def write_or_check(path,content,check):
    if check:
        try: current=path.read_text()
        except FileNotFoundError: return False
        return current==content
    path.write_text(content);return True

def main():
    ap=argparse.ArgumentParser();ap.add_argument('--check',action='store_true');a=ap.parse_args()
    m=json.loads(MANIFEST.read_text())
    route_vals=list(m['routes'].values())
    if len(route_vals)!=len(set(route_vals)): raise SystemExit('duplicate protocol routes')
    status_vals=list(m['status'].values())
    if any(not isinstance(x,int) or x<100 or x>599 for x in status_vals): raise SystemExit('invalid HTTP status')
    oks=[write_or_check(C_OUT,render_c(m),a.check),write_or_check(JS_OUT,render_js(m),a.check)]
    if a.check and not all(oks):
        print('control-protocol-generated-files-out-of-date',file=sys.stderr);return 2
    if not a.check: print(C_OUT);print(JS_OUT)
    return 0
if __name__=='__main__': raise SystemExit(main())
