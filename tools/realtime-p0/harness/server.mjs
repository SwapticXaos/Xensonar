import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const port = Number(process.env.PORT || 32191);
const types = {'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.wasm':'application/wasm','.json':'application/json; charset=utf-8','.md':'text/plain; charset=utf-8','.ts':'text/plain; charset=utf-8'};
http.createServer((req,res)=>{
  let rel;try {rel=decodeURIComponent((req.url||'/').split('?')[0]);} catch {res.writeHead(400);return res.end('bad path');}
  if(rel==='/') rel='/web/index.html';
  const file=path.resolve(root,'.'+rel); if(file!==root&&!file.startsWith(root+path.sep)){res.writeHead(403);return res.end('forbidden');}
  fs.stat(file,(err,st)=>{ if(err||!st.isFile()){res.writeHead(404);return res.end('not found');}
    res.setHeader('Content-Type',types[path.extname(file)]||'application/octet-stream');
    res.setHeader('Cache-Control','no-store'); res.setHeader('Cross-Origin-Opener-Policy','same-origin'); res.setHeader('Cross-Origin-Embedder-Policy','require-corp');
    fs.createReadStream(file).pipe(res);
  });
}).listen(port,'127.0.0.1',()=>console.log(`P0-W lab http://127.0.0.1:${port}/web/index.html`));
