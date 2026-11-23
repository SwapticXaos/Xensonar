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

test('wide geometry: panels run parallel to the pixel-exact arch, arch art is set and reset', () => {
  const pending = [];
  const classes = new Set();
  const makeStyle = () => {
    const values = new Map();
    return {
      getPropertyValue: key => values.get(key) || '',
      setProperty: (key, value) => values.set(key, String(value)),
      removeProperty(key) { const old = values.get(key) || ''; values.delete(key); return old; }
    };
  };
  const makeNode = (top, height = 30, offsetTop = 0) => ({
    style: makeStyle(), offsetTop,
    getBoundingClientRect: () => ({ x: 265, y: top, top, bottom: top + height, width: 1374, height }),
    querySelector: () => null, querySelectorAll: () => []
  });
  const info = makeNode(200, 34), tools = makeNode(200, 34), row = makeNode(242, 20);
  const root = makeNode(190, 82);
  root.querySelector = sel => ({ '.nd-legacy-info': info, '.nd-legacy-tools': tools, ':scope > div:last-child': row }[sel] || null);
  const ball = makeNode(295, 96), advanced = makeNode(780, 50);
  const heading = makeNode(106, 92);
  const headingItems = [makeNode(119, 15, 13), makeNode(137, 27, 31), makeNode(168, 16, 62)];
  const nav = makeNode(135, 34);
  heading.querySelectorAll = () => headingItems;
  heading.querySelector = sel => sel === '.nd-modes' ? nav : null;
  const room = {
    style: makeStyle(),
    classList: {
      toggle(key, on) { if (on) classes.add(key); else classes.delete(key); },
      remove: key => classes.delete(key), contains: key => classes.has(key)
    },
    getBoundingClientRect: () => ({ x: 242, y: 82, top: 82, bottom: 3122, width: 1420, height: 3040 }),
    querySelector: sel => ({
      '.nd-legacy-meta': root,
      '[data-nodal-ball-controls]': ball,
      '.nd-legacy-card > .mt-5 > section:has(> button[aria-expanded])': advanced,
      ':scope > .nd-shared-heading': heading
    }[sel] || null)
  };
  const window = { innerWidth: 1920 };
  const context = {
    window,
    document: { readyState: 'loading', addEventListener() {}, querySelector: () => room },
    getComputedStyle: () => ({
      borderImageSource: window.innerWidth > 1380 ? 'url("data:image/svg+xml,%3Cpath%20d%3D%22M0%200%20A170%20170%22%3E")' : 'none',
      width: window.innerWidth > 1380 ? '252px' : '34px'
    }),
    requestAnimationFrame(fn) { pending.push(fn); return pending.length; }
  };
  vm.runInNewContext(source, context, { filename: scriptPath });
  const run = w => { window.innerWidth = w; window.__xenNodalShellGeometryT2.refresh(); while (pending.length) pending.shift()(); };

  run(1920);
  assert.equal(classes.has('nd-geo-t2'), true);
  const headTop = parseFloat(heading.style.getPropertyValue('--nd-geo-top'));
  const headBot = parseFloat(heading.style.getPropertyValue('--nd-geo-bottom'));
  const navShift = parseFloat(heading.style.getPropertyValue('--nd-geo-nav-shift'));
  const copyShifts = headingItems.map(el => parseFloat(el.style.getPropertyValue('--nd-geo-heading-shift')));
  const toolShift = parseFloat(root.style.getPropertyValue('--nd-geo-tool-shift'));
  const ballShift = parseFloat(ball.style.getPropertyValue('--nd-geo-ball-shift'));
  // Arch: A=176, spring 14px under the ball controls (y=405 -> Hs=323). Heading top (dy=24) sits high on the
  // arch, its bottom (dy=116) much lower: the trapezoid narrows downward along the arch.
  assert.ok(headTop > 95 && headTop < 125, `expected headTop in (95,125), got ${headTop}`);
  assert.ok(headBot > 30 && headBot < headTop, `expected headBot < headTop, got ${headBot} vs ${headTop}`);
  assert.match(room.style.getPropertyValue('--nd-arch-svg'), /^url\("data:image\/svg\+xml,/, 'arch art is published on the room');
  const geo = window.__xenNodalShellGeometryT2.inspect();
  const rootGeo = geo.find(g => g.name === 'root');
  assert.ok(rootGeo.ext.length >= 5 && rootGeo.ext.every((e, i, a) => i === 0 || e <= a[i - 1] + 1e-9), 'panel edge narrows monotonically downward (follows the arch)');
  assert.equal(geo.find(g => g.name === 'advanced').top, 0, 'panels below the spring line stay rectangular');
  assert.equal(copyShifts[0], copyShifts[1], 'all header copy lines share one vertical editorial spine');
  assert.equal(copyShifts[1], copyShifts[2], 'all header copy lines share one vertical editorial spine');
  assert.ok(copyShifts[0] <= headBot - 13, 'header copy must stay cleanly inside frieze bottom clearance');
  assert.ok(navShift > 40 && navShift < headTop, `nav must align symmetrically inside right frieze, got ${navShift}`);
  assert.ok(toolShift <= parseFloat(root.style.getPropertyValue('--nd-geo-top')) - 14, 'tools must stay inside slanted border');
  assert.ok(ballShift >= 0 && ballShift <= parseFloat(ball.style.getPropertyValue('--nd-geo-bottom')), 'ball shift stays inside trapezoid');

  run(1280);
  assert.equal(classes.has('nd-geo-t2'), false);
  for (const prop of ['--nd-geo-top', '--nd-geo-bottom', '--nd-geo-heading-edge', '--nd-geo-nav-shift']) {
    assert.equal(heading.style.getPropertyValue(prop), '', `heading ${prop} must reset`);
  }
  assert.equal(ball.style.getPropertyValue('--nd-geo-ball-shift'), '', 'ball shift must reset');
  assert.equal(room.style.getPropertyValue('--nd-arch-svg'), '', 'arch art must reset');
});
