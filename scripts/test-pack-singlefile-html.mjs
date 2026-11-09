import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { packSinglefileHtml } from './pack-singlefile-html.mjs';

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'xensonar-singlefile-'));
try {
  const input = path.join(dir, 'index.html');
  const output = path.join(dir, 'packed.html');
  fs.mkdirSync(path.join(dir, 'assets'));
  fs.writeFileSync(path.join(dir, 'assets/main.js'), 'const text="</script>";');
  fs.writeFileSync(path.join(dir, 'assets/main.css'), 'body{color:red}');
  fs.writeFileSync(input, '<div id="root"></div><script type="module" src="/assets/main.js"></script><link rel="stylesheet" href="/assets/main.css">');
  packSinglefileHtml(input, output);
  const html = fs.readFileSync(output, 'utf8');
  assert.ok(html.includes('<script type="module"'));
  assert.ok(html.includes('const text="<\\/script>";'));
  assert.ok(html.includes('<style>body{color:red}</style>'));
  assert.ok(!html.includes('src='));
  for (const target of ['https://example.test/bundle.js', '../outside.js']) {
    fs.writeFileSync(input, `<script src="${target}"></script>`);
    assert.throws(() => packSinglefileHtml(input, output));
  }
  console.log(JSON.stringify({ proofClass: 'build-packaging', passed: 3,
    results: ['inlines local JS/CSS with safe closing tags', 'rejects remote bundle dependency', 'rejects path traversal'] }));
} finally { fs.rmSync(dir, { recursive: true, force: true }); }
