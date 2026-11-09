#!/usr/bin/env python3
from pathlib import Path
root = Path(__file__).resolve().parent

def c_string(s: str) -> str:
    return '\n'.join('  "'+line.replace('\\','\\\\').replace('"','\\"').replace('\n','\\n')+'"' for line in s.splitlines(True))

def emit(src_rel, out_rel, guard, symbol):
    src=(root/src_rel).read_text()
    out=root/out_rel
    out.write_text(f'#ifndef {guard}\n#define {guard}\n\nstatic const char {symbol}[] =\n'+c_string(src)+';\n\n#endif\n')
    print(out)

emit(Path('browser/p0_native_control_protocol.js'),Path('src/p0_native_control_protocol_js.h'),'P0_NATIVE_CONTROL_PROTOCOL_JS_H','P0N_CONTROL_PROTOCOL_JS')
emit(Path('browser/p0_native_control_adapter.js'),Path('src/p0_native_control_adapter_js.h'),'P0_NATIVE_CONTROL_ADAPTER_JS_H','P0N_CONTROL_ADAPTER_JS')
emit(Path('browser/p0_native_browser_lab.html'),Path('src/p0_native_browser_lab_html.h'),'P0N_BROWSER_LAB_HTML_H','P0N_BROWSER_LAB_HTML')
