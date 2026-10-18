'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'src/forge/editor/07_composition_and_preview_ui.js'), 'utf8');
const styles = fs.readFileSync(path.join(root, 'styles/08_forge_workflow.css'), 'utf8');
assert.ok(/\bf6e=\{width:42,minWidth:42,height:34,minHeight:34,padding:0\}/.test(source),
 'Play is rendered as a 42 × 34 px external rectangle');
const select = '.f31-play-rack .f34-project-save-on-main .f33-project-save-button';
const i = styles.lastIndexOf(select);
assert(i >= 0, 'rack Save styling should exist');
const rule = styles.slice(i + select.length, styles.indexOf('}', i));
for (const [prop, value] of [
 ['width', '42px'], ['min-width', '42px'], ['max-width', '42px'],
 ['height', '34px'], ['min-height', '34px'], ['max-height', '34px'],
 ['box-sizing', 'border-box'], ['padding', '0'],
 ['border-radius', '4px'], ['display', 'flex'],
 ['align-items', 'center'], ['justify-content', 'center']
]) {
  assert.match(rule, new RegExp(`(?:^|[;\\s])${prop}\\s*:\\s*${value.replace('.', '\\.')}(?:\\s*[;\\n]|$)`), `${prop} should be ${value}`);
}
assert.match(styles.slice(styles.lastIndexOf('.f31-play-rack .f34-project-save-on-main .f33-project-save{')),
 /grid-template-rows:26px 8px 12px;row-gap:0/,
 'Project Name remains on an independent 26px row with feedback underneath');
console.log('PASS Forge rack Play/Save exact 42×34px geometry, unchanged Project Name and centered Save');
