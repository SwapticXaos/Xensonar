import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
// Use the declared TypeScript dependency; no new package required.
// A tiny transpilation loader resolves relative TypeScript imports in these isolated tests.
const dir = fs.mkdtempSync(path.join(os.tmpdir(), "xensonar-runtime-"));
try {
  const loader = path.join(dir, "loader.cjs");
  fs.writeFileSync(
    loader,
    `const fs=require('node:fs');const Module=require('node:module');const resolve=Module._resolveFilename;Module._resolveFilename=function(id,...args){return resolve.call(this,id.startsWith('@/')?require('node:path').resolve('src',id.slice(2)):id,...args);};const ts=require(${JSON.stringify(fileURLToPath(import.meta.resolve("typescript")))});require.extensions['.tsx']=require.extensions['.ts']=(m,f)=>m._compile(ts.transpileModule(fs.readFileSync(f,'utf8'),{compilerOptions:{esModuleInterop:true,jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,f);`,
  );
  for (const test of ["live-audio-123", "preview-cache-123", "browser-runtime-124", "donor-projection-125", "donor-robustness-126", "spectral-dsp-127", "forge-routing-127", "forge-ui-127", "forge-adversarial-127", "donor-body-v3-128", "root-follow-129", "wave-sample-130", "wave-body-130", "particle-runtime-130", "donor-formant-lock-131", "donor-table-cache-132"]) {
    if (process.argv[2] && test !== process.argv[2]) continue;
    const result = spawnSync(
      process.execPath,
      ["--require", loader, "-e", `require(${JSON.stringify(path.resolve("tests/runtime/" + test + ".test.ts"))})`],
      { stdio: "inherit" },
    );
    if (result.error) throw result.error;
    if (result.status !== 0) process.exitCode = 1;
  }
} finally {
  fs.rmSync(dir, { recursive: true, force: true });
}
