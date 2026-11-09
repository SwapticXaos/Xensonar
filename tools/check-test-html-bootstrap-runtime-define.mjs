#!/usr/bin/env node
import fs from 'node:fs';

const htmlPath = process.argv[2] ?? 'dist/index.html';
if (!fs.existsSync(htmlPath)) {
  console.error(`[test-html-bootstrap] missing html: ${htmlPath}`);
  process.exit(1);
}
const html = fs.readFileSync(htmlPath, 'utf8');
const moduleScriptMatch = html.match(/<script\b[^>]*type=[\"']module[\"'][^>]*>/);
if (!moduleScriptMatch) {
  console.error('[test-html-bootstrap] missing inline module script');
  process.exit(1);
}
const moduleIndex = moduleScriptMatch.index ?? -1;
const scriptStart = moduleIndex + moduleScriptMatch[0].length;
const scriptHead = html.slice(scriptStart, scriptStart + 320);
const hasRuntimeDefine = scriptHead.includes('const __XENSONAR_CORE_TEST_BUILD__ = false;')
  || scriptHead.includes('const __XENSONAR_CORE_TEST_BUILD__ = true;');
const hasUnreplacedDefine = html.includes('__XENSONAR_CORE_TEST_BUILD__');
if (!hasRuntimeDefine && hasUnreplacedDefine) {
  console.error('[test-html-bootstrap] unreplaced runtime define for __XENSONAR_CORE_TEST_BUILD__ detected');
  process.exit(1);
}
if (!html.includes('createRoot')) {
  console.error('[test-html-bootstrap] bundled React entry not detected');
  process.exit(1);
}
console.log('[test-html-bootstrap] ok');
