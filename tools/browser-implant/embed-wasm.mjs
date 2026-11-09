import fs from "node:fs";
const input=process.argv[2]??"build-wasm/xensonar-c11.wasm";
const output=process.argv[3]??"build-wasm/xensonar-c11.embedded.ts";
const bytes=fs.readFileSync(input); const b64=bytes.toString("base64");
fs.writeFileSync(output,`/* generated */\nexport const XENSONAR_C11_WASM_BASE64=${JSON.stringify(b64)};\nexport function decodeXensonarC11Wasm(){const s=atob(XENSONAR_C11_WASM_BASE64);const b=new Uint8Array(s.length);for(let i=0;i<s.length;i++)b[i]=s.charCodeAt(i);return b.buffer;}\n`);
console.log(`embedded ${bytes.length} bytes`);
