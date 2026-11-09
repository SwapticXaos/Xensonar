'use strict';
// Deterministic adapter lifecycle regression. It exercises the real production
// script; CSS rendering / visual alignment still requires a browser check.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');
const scriptPath = process.argv[2] || path.resolve(__dirname, '../src/ui/05_shell_geometry_t2.js');
const source = fs.readFileSync(scriptPath, 'utf8');

function harness() {
  const pending = [];
  const classes = new Set();
  const style = () => {
    const values = new Map();
    return {
      getPropertyValue: key => values.get(key) || '',
      setProperty: (key, value) => values.set(key, String(value)),
      removeProperty(key) { const old = values.get(key) || ''; values.delete(key); return old; }
    };
  };
  const node = (top, height = 30, offsetTop = 0) => ({
    style: style(), offsetTop,
    getBoundingClientRect: () => ({ x: 130, y: top, top, bottom: top + height, width: 1100, height }),
    querySelector: () => null,
    querySelectorAll: () => []
  });
  const info = node(54), tools = node(54), row = node(87);
  const root = node(45, 80);
  root.querySelector = sel => ({ '.nd-legacy-info': info, '.nd-legacy-tools': tools, ':scope > div:last-child': row }[sel] || null);
  const ball = node(200, 100), advanced = node(500, 100);
  const heading = node(10, 30);
  const headingItems = [node(10, 10, 0), node(20, 15, 10), node(35, 10, 25)];
  heading.querySelectorAll = () => headingItems;
  let mode = 'installation';
  const room = {
    classList: {
      toggle(key, on) { if (on) classes.add(key); else classes.delete(key); },
      remove: key => classes.delete(key), contains: key => classes.has(key)
    },
    getBoundingClientRect: () => ({ x: 117.5, y: 0, top: 0, bottom: 960, width: 1420, height: 960 }),
    querySelector: sel => ({
      '.nd-legacy-meta': root,
      '[data-nodal-ball-controls]': ball,
      '.nd-legacy-card > .mt-5 > section:has(> button[aria-expanded])': advanced,
      ':scope > .nd-shared-heading': heading
    }[sel] || null)
  };
  const window = { innerWidth: 1655 };
  const context = {
    window,
    document: {
      readyState: 'loading', addEventListener() {},
      querySelector: () => mode === 'installation' ? room : null
    },
    // Mirrors 01_nodal_concave_shell_v3.css: installation's nine-slice
    // border image becomes `none` at max-width:1420px.
    getComputedStyle: () => ({
      borderImageSource: window.innerWidth > 1420 ? 'url("data:image/svg+xml,%3Cpath%20d%3D%22M0%200%20A170%20170%22%3E")' : 'none',
      width: Math.max(0, (window.innerWidth - 1420) / 2 + 2) + 'px'
    }),
    requestAnimationFrame(fn) { pending.push(fn); return pending.length; }
  };
  vm.runInNewContext(source, context, { filename: scriptPath });
  function refresh(width = window.innerWidth, nextMode = mode) {
    window.innerWidth = width; mode = nextMode;
    window.__xenNodalShellGeometryT2.refresh();
    while (pending.length) pending.shift()();
  }
  function assertDisabled() {
    assert.equal(classes.has('nd-geo-t2'), false, 'T2 selectors (including their transforms) must be inactive');
    for (const panel of [root, ball, advanced]) for (const prop of ['--nd-geo-top', '--nd-geo-bottom']) {
      assert.ok(['', '0px'].includes(panel.style.getPropertyValue(prop)), `${prop} must be cleared or zeroed`);
    }
    for (const prop of ['--nd-geo-info-shift', '--nd-geo-tool-shift', '--nd-geo-row-shift']) {
      assert.ok(['', '0px'].includes(root.style.getPropertyValue(prop)), `${prop} must be cleared or zeroed`);
    }
    assert.ok(['', '0px'].includes(heading.style.getPropertyValue('--nd-geo-heading-edge')), 'heading edge must reset');
    for (const item of headingItems) assert.ok(['', '0px'].includes(item.style.getPropertyValue('--nd-geo-heading-shift')), 'heading text shift must reset');
  }
  function enableWide() {
    refresh(1655, 'installation');
    assert.equal(classes.has('nd-geo-t2'), true);
    assert.ok(parseFloat(root.style.getPropertyValue('--nd-geo-top')) > 0, 'wide test must first apply nonzero geometry');
    assert.ok(parseFloat(headingItems[0].style.getPropertyValue('--nd-geo-heading-shift')) > 0, 'wide test must first apply a text shift');
  }
  return { refresh, assertDisabled, enableWide };
}

test('installation resets wide geometry when the shell falls back at 1420px', () => {
  const h = harness();
  h.enableWide();
  h.refresh(1300); h.assertDisabled();
  h.refresh(1050); h.assertDisabled();
  h.enableWide();
  h.refresh(1420); h.assertDisabled();
});

test('retained room DOM cannot restore stale geometry after changing mode at narrow width', () => {
  const h = harness();
  h.enableWide();
  h.refresh(1300, 'sounddesign'); h.assertDisabled();
  h.refresh(1300, 'installation'); h.assertDisabled();
  h.refresh(1050, 'sounddesign'); h.assertDisabled();
  h.refresh(1050, 'installation'); h.assertDisabled();
  h.enableWide();
});
