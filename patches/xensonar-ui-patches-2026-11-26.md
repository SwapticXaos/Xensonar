# XenSonar UI Modernization — Self-Contained Patch Bundle (2026-11-26)

> **Purpose:** Ultra-slim, complete handoff bundle (~38 KB — no `index.html`, no `server.js`, no `package.json`).
> Feed this single file to Claude on `claude/charming-franklin-wouegz` to apply all 5 isolated UI patches cleanly, then run `python3 tools/build.py && python3 tools/build.py --check`.

## Base Provenance
- **Source Branch (imported snapshot):** `claude/stoic-knuth-a6nx6f`
- **Source Commit:** `5ee1c4b` + `ARCH-WING-01` (`docs/STATUS_2026-11-23.md`)
- **Target Branch:** `claude/charming-franklin-wouegz` (or newer)
- **Untouched invariants:** Audio/DSP (`src/audio/*`), Room III `Art Installation` (`mode === "installation"`), H4 circular header symbols (`.xen-header-unicode-icon`), 100% offline (zero external URLs).

---

## PATCH 1: `UI-TITLE-ART-01` — Art Deco / Secession Vector Display Titles (Variant 2, No Center Dot)

### 1A. Create new file `src/ui/06_room_title_art.js`
Register in `source-manifest.json` and inject `<script id="xen-room-title-art">...</script>` in `src/index.template.html` before the room chunks.

```js
/* XEN-TITLE-ART-01 · Sculptural High-Contrast Vector Display Titles (Art Deco / Secession).
 * Applied to: 'live' (Live Room), 'sounddesign' (Room III · Sound Design / Art Installation),
 *             'psylab' (Room IV · Psychedelic Lab), 'multitrack' (Room V · Multitrack).
 * 100% offline vector SVG via pure React createElement (no external fonts, no innerHTML). */
(() => {
  'use strict';
  if (typeof window === 'undefined' || window.__XenTitleArt) return;

  const PALETTES = {
    live: {
      c1: '#d8b4fe', c2: '#f0abfc', c3: '#fde68a',
      core1: '#ffffff', echo: 'rgba(240,171,252,.36)'
    },
    sounddesign: {
      c1: '#a7f3d0', c2: '#5eead4', c3: '#e0f2fe',
      core1: '#f0fdfa', echo: 'rgba(153,246,228,.34)'
    },
    psylab: {
      c1: '#f0abfc', c2: '#67e8f9', c3: '#ffd166',
      core1: '#ffffff', echo: 'rgba(126,238,255,.34)'
    },
    multitrack: {
      c1: '#fef3c7', c2: '#eab366', c3: '#f5e7cf',
      core1: '#fffbeb', echo: 'rgba(234,179,102,.34)'
    }
  };

  /* High-contrast Art Deco / Secessionist solid geometric glyphs (fill-rule=evenodd, y: 2..34) */
  const GLYPHS = {
    ' ': [13, ''],
    A: [27, 'M 1 34 L 12.2 2 L 14.3 2 L 3.3 34 Z M 12.2 2 L 16.6 2 L 26.2 34 L 20.2 34 Z M 6.4 23.2 L 20.2 23.2 L 20.8 25.1 L 5.8 25.1 Z'],
    B: [24, 'M 1.5 2 H 13.5 C 19.5 2 22.5 5 22.5 9.8 C 22.5 13.6 20.2 16.3 16.8 17.2 C 21 18.2 23.4 21.2 23.4 25.8 C 23.4 31 20 34 13.8 34 H 1.5 Z M 7.2 4 V 16.2 H 12.6 C 15.6 16.2 17 13.8 17 10.1 C 17 6.2 15.4 4 12.4 4 Z M 7.2 18.2 V 32 H 13.2 C 16.6 32 17.8 29.4 17.8 25.2 C 17.8 20.8 16.2 18.2 12.8 18.2 Z'],
    C: [25, 'M 23.2 7.5 C 20.6 3.5 16.8 1.8 12.5 1.8 C 5.2 1.8 1 8.4 1 18 C 1 27.6 5.2 34.2 12.5 34.2 C 16.8 34.2 20.6 32.5 23.2 28.5 L 21.4 27.2 C 19.2 30.8 16.4 32.2 13.4 32.2 C 9.2 32.2 7.2 26.8 7.2 18 C 7.2 9.2 9.2 3.8 13.4 3.8 C 16.4 3.8 19.2 5.2 21.4 8.8 Z'],
    D: [26, 'M 1.5 2 H 12.2 C 20.2 2 25 8.2 25 18 C 25 27.8 20.2 34 12.2 34 H 1.5 Z M 7.3 4 V 32 H 11.8 C 16.6 32 18.8 26.8 18.8 18 C 18.8 9.2 16.6 4 11.8 4 Z'],
    E: [21, 'M 1.5 2 H 7.3 V 34 H 1.5 Z M 7.3 2 H 20 V 4 H 7.3 Z M 7.3 17.5 H 17.2 V 19.4 H 7.3 Z M 7.3 32 H 20 V 34 H 7.3 Z'],
    F: [20, 'M 1.5 2 H 7.3 V 34 H 1.5 Z M 7.3 2 H 19 V 4 H 7.3 Z M 7.3 17.5 H 16.2 V 19.4 H 7.3 Z'],
    G: [26, 'M 23.4 7.5 C 20.8 3.5 17 1.8 12.6 1.8 C 5.2 1.8 1 8.4 1 18 C 1 27.6 5.2 34.2 12.8 34.2 C 18.5 34.2 22.8 31.4 24.4 27.2 V 18.2 H 13.8 V 20.1 H 18.8 V 27.4 C 17.4 30.6 15.2 32.2 13 32.2 C 9.2 32.2 7.2 26.8 7.2 18 C 7.2 9.2 9.2 3.8 13.4 3.8 C 16.4 3.8 19.2 5.2 21.4 8.8 Z'],
    H: [25, 'M 1.5 2 H 7.3 V 34 H 1.5 Z M 17.7 2 H 23.5 V 34 H 17.7 Z M 7.3 17.5 H 17.7 V 19.4 H 7.3 Z'],
    I: [9,  'M 1.6 2 H 7.4 V 34 H 1.6 Z'],
    J: [20, 'M 12.5 2 H 18.3 V 23.2 C 18.3 30.4 14.6 34.2 8.8 34.2 C 4.8 34.2 2.2 32.4 1 29.6 L 2.8 28.4 C 4 30.8 6 32.2 8.4 32.2 C 11.4 32.2 12.5 29.2 12.5 23.2 Z'],
    K: [24, 'M 1.5 2 H 7.3 V 34 H 1.5 Z M 21.6 2 H 24 L 10.6 17.6 L 7.3 17.6 Z M 10.5 16.2 L 14.4 13.8 L 24 34 H 17.6 Z'],
    L: [20, 'M 1.5 2 H 7.3 V 34 H 1.5 Z M 7.3 32 H 19.2 V 34 H 7.3 Z'],
    M: [32, 'M 1.6 2 H 3.7 V 34 H 1.6 Z M 1.6 2 H 7.6 L 17.2 28.5 L 14.8 33.4 L 3.4 5.2 Z M 15.2 32.2 L 26.4 2 H 28.5 L 17.1 33.4 Z M 24.6 2 H 30.4 V 34 H 24.6 Z'],
    N: [25, 'M 1.5 2 H 3.6 V 34 H 1.5 Z M 1.5 2 H 7.4 L 23.5 34 H 17.6 Z M 21.4 2 H 23.5 V 34 H 21.4 Z'],
    O: [28, 'M 14 1.8 C 21.8 1.8 27 8.4 27 18 C 27 27.6 21.8 34.2 14 34.2 C 6.2 34.2 1 27.6 1 18 C 1 8.4 6.2 1.8 14 1.8 Z M 14 3.8 C 9.4 3.8 7.2 9.4 7.2 18 C 7.2 26.6 9.4 32.2 14 32.2 C 18.6 32.2 20.8 26.6 20.8 18 C 20.8 9.4 18.6 3.8 14 3.8 Z'],
    P: [23, 'M 1.5 2 H 13.5 C 19.6 2 22.5 5.6 22.5 11.2 C 22.5 16.8 19.6 20.4 13.5 20.4 H 7.3 V 34 H 1.5 Z M 7.3 4 V 18.4 H 12.6 C 15.6 18.4 16.8 15.6 16.8 11.2 C 16.8 6.8 15.6 4 12.6 4 Z'],
    Q: [28, 'M 14 1.8 C 21.8 1.8 27 8.4 27 18 C 27 27.6 21.8 34.2 14 34.2 C 6.2 34.2 1 27.6 1 18 C 1 8.4 6.2 1.8 14 1.8 Z M 14 3.8 C 9.4 3.8 7.2 9.4 7.2 18 C 7.2 26.6 9.4 32.2 14 32.2 C 18.6 32.2 20.8 26.6 20.8 18 C 20.8 9.4 18.6 3.8 14 3.8 Z M 16.5 25.5 L 21.2 24.8 L 27.2 35.4 L 22.6 35.4 Z'],
    R: [25, 'M 1.5 2 H 13.5 C 19.6 2 22.5 5.4 22.5 10.8 C 22.5 15.8 19.8 19.4 14.5 19.8 L 23.8 34 H 17.4 L 8.8 20 H 7.3 V 34 H 1.5 Z M 7.3 4 V 18 H 12.6 C 15.6 18 16.8 15.4 16.8 10.9 C 16.8 6.5 15.6 4 12.6 4 Z'],
    S: [23, 'M 21 6.4 C 19 3.2 15.6 1.8 11.4 1.8 C 5.8 1.8 2 5 2 9.8 C 2 14.6 5.4 17 10.8 19.2 C 15.6 21.1 17 22.8 17 26.2 C 17 29.8 14.4 32.2 10.6 32.2 C 6.6 32.2 4 30.2 2.6 26.8 L 1 28 C 2.6 32.2 6.2 34.2 11.2 34.2 C 17.6 34.2 22.2 30.8 22.2 25.2 C 22.2 19.8 18.6 17.2 12.8 14.9 C 8.4 13.2 6.8 11.8 6.8 9 C 6.8 5.8 9.2 3.8 12.4 3.8 C 15.6 3.8 18 5.2 19.4 7.6 Z'],
    T: [23, 'M 0.8 2 H 22.2 V 4 H 0.8 Z M 8.6 4 H 14.4 V 34 H 8.6 Z'],
    U: [25, 'M 1.5 2 H 7.3 V 22.8 C 7.3 29.2 9.4 32.2 13.2 32.2 C 17.4 32.2 21.2 29.2 21.2 22.8 V 2 H 23.4 V 22.8 C 23.4 30.6 18.8 34.2 12.6 34.2 C 5.6 34.2 1.5 30.4 1.5 22.8 Z'],
    V: [26, 'M 1 2 H 7.2 L 14.2 29.6 L 12.2 34 Z M 12.2 34 L 22.8 2 H 25 L 14.2 34 Z'],
    W: [36, 'M 1 2 H 6.8 L 12.2 29.5 L 10.2 34 Z M 10.2 34 L 17.2 8 H 19.3 L 12.2 34 Z M 17.2 8 H 22.6 L 27.6 29.5 L 25.6 34 Z M 25.6 34 L 32.8 2 H 35 L 27.6 34 Z'],
    X: [24, 'M 1.5 2 H 7.6 L 22.5 34 H 16.4 Z M 20.4 2 H 22.6 L 3.6 34 H 1.4 Z'],
    Y: [24, 'M 1 2 H 7.2 L 14.2 18.5 H 9.1 Z M 11.8 18.5 L 20.6 2 H 22.8 L 14.2 18.5 Z M 9.1 18.2 H 14.9 V 34 H 9.1 Z'],
    Z: [22, 'M 1.5 2 H 20.5 V 4 H 1.5 Z M 14.4 4 H 20.5 L 7.6 32 H 1.5 Z M 1.5 32 H 20.5 V 34 H 1.5 Z']
  };

  const STYLE_ID = 'xen-title-art-style';
  const CSS = `
.xta-host{display:inline-flex;align-items:center;margin:0;padding:0;line-height:1}
.xta-sr{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}
.xta-svg{display:block;height:var(--xta-h,34px);width:auto;max-width:100%;overflow:visible;flex:0 1 auto}
.xta-live-wrap{display:flex;flex-direction:column;gap:3px;min-width:0}
.xta-live-eyebrow{font-family:ui-sans-serif,system-ui,sans-serif;font-size:10px;font-weight:500;letter-spacing:.24em;text-transform:uppercase;color:#c4b5fd;line-height:1.2}
@media(max-width:720px){.xta-svg{height:var(--xta-h-sm,26px)}}
`;
  function ensureStyle() {
    if (typeof document === 'undefined' || document.getElementById(STYLE_ID)) return;
    const s = document.createElement('style');
    s.id = STYLE_ID;
    s.textContent = CSS;
    document.head.appendChild(s);
  }

  function layoutLetters(text) {
    const chars = String(text || '').toUpperCase().split('');
    const items = [];
    let x = 2;
    const tracking = 5.0;
    for (let i = 0; i < chars.length; i++) {
      const g = GLYPHS[chars[i]] || GLYPHS[' '];
      if (g[1]) items.push({ x, d: g[1] });
      x += g[0] + (i < chars.length - 1 ? tracking : 0);
    }
    return { items, width: Math.max(40, x + 4) };
  }

  let uidCounter = 0;

  function Title({ react, room, text, height, smallHeight }) {
    const R = react || globalThis.P || globalThis.React;
    R.useEffect(() => { ensureStyle(); }, []);
    const pal = PALETTES[room] || PALETTES.live;
    const h = R.createElement;
    const gid = R.useMemo(() => 'xta_' + room + '_' + (++uidCounter % 99999), [room]);
    const { items, width } = layoutLetters(text);

    return h('span', { className: 'xta-host', 'data-xta-room': room },
      h('span', { className: 'xta-sr' }, text),
      h('svg', {
        className: 'xta-svg',
        viewBox: `0 -4 ${width.toFixed(1)} 49`,
        fill: 'none',
        'aria-hidden': 'true',
        style: { '--xta-h': (height || 34) + 'px', '--xta-h-sm': (smallHeight || 26) + 'px' }
      },
        h('defs', null,
          h('linearGradient', { id: gid + '_g', x1: '0%', y1: '0%', x2: '100%', y2: '12%' },
            h('stop', { offset: '0%', stopColor: pal.c1 }),
            h('stop', { offset: '52%', stopColor: pal.c2 }),
            h('stop', { offset: '100%', stopColor: pal.c3 })
          ),
          h('linearGradient', { id: gid + '_r', x1: '0%', y1: '0%', x2: '100%', y2: '0%' },
            h('stop', { offset: '0%', stopColor: pal.c1, stopOpacity: 0.72 }),
            h('stop', { offset: '62%', stopColor: pal.c2, stopOpacity: 0.34 }),
            h('stop', { offset: '100%', stopColor: pal.c3, stopOpacity: 0 })
          )
        ),
        // Offset engraved wireframe echo
        h('g', { fill: 'none', stroke: pal.echo, strokeWidth: 0.72, transform: 'translate(2.0,1.6)' },
          items.map((it, i) => h('path', { key: 'e' + i, d: it.d, transform: `translate(${it.x.toFixed(1)},0)` }))
        ),
        // Solid metallic-gradient sculptural fills
        h('g', { fill: `url(#${gid}_g)`, fillRule: 'evenodd' },
          items.map((it, i) => h('path', { key: 'f' + i, d: it.d, transform: `translate(${it.x.toFixed(1)},0)` }))
        ),
        // Subtle hairline edge glint
        h('g', { fill: 'none', stroke: pal.core1, strokeOpacity: 0.24, strokeWidth: 0.45 },
          items.map((it, i) => h('path', { key: 's' + i, d: it.d, transform: `translate(${it.x.toFixed(1)},0)` }))
        ),
        // Clean hairline underline rule (no center dot/diamond)
        h('line', { x1: 2, y1: 40.5, x2: (width - 2).toFixed(1), y2: 40.5, stroke: `url(#${gid}_r)`, strokeWidth: 0.8 })
      )
    );
  }

  window.__XenTitleArt = Object.freeze({ Title });
})();
```

### 1B. Wire Live Room title in `src/rhythm/02_bass_and_rack.js`
Replace the `Live Room` `<h2>` block with:
```js
u.jsxs("div",{className:"xta-live-wrap",children:[u.jsx("div",{className:"xta-live-eyebrow",children:"ROOM I · LIVE PERFORMANCE"}),u.jsx("h2",{className:"text-2xl text-purple-200",children:window.__XenTitleArt?u.jsx(window.__XenTitleArt.Title,{react:P,room:"live",text:"Live Room",height:33,smallHeight:26}):"Live Room"})]})
```

### 1C. Wire Room III Sound Design title in `src/rooms/nodal.js`
Inside `NodalRoomHeader` (leave `installation` untouched!):
```js
h('h2', null, mode === 'sounddesign' && window.__XenTitleArt ? h(window.__XenTitleArt.Title, {react: P, room: 'sounddesign', text: current[0], height: 30, smallHeight: 24}) : current[0])
```

*(Psychedelic Lab and Multitrack `<h2>` calls are included inside PATCH 4 below.)*

---

## PATCH 2: `UI-SOUND-DESIGN-HDR-01` — Room III "Sound Design" Stacked Header

In `styles/areas/026_nodal-sound-designer-style.css`, ensure these rules apply to `[data-nodal-mode="sounddesign"]` so `ROOM III / NODAL CENTER` sits above `Sound Design` and `Material · Resonance · Constellation` sits below (never affecting `installation`):

```css
.nd-room[data-nodal-mode="sounddesign"]>.nd-shared-heading{margin-bottom:10px;padding-bottom:10px;align-items:center}
.nd-room[data-nodal-mode="sounddesign"]>.nd-shared-heading .nd-heading-copy{display:flex;flex-direction:column;align-items:flex-start;gap:4px}
.nd-room[data-nodal-mode="sounddesign"] .nd-eyebrow{font-size:10px;margin-bottom:0}
.nd-room[data-nodal-mode="sounddesign"] .nd-heading-copy p{margin:2px 0 0;font-size:11px}
```

---

## PATCH 3: `UI-PSYLAB-MODAL-01` — Internal XenSonar Modal Dialogs in Psychedelic Lab

In `src/post-oct/034-xen-room-psylab.js`, replace all `prompt()` and `confirm()` calls (Save Sound, Delete Sound, Exact Parameter Value) with an internal portal dialog.

### 3A. Append modal CSS at end of `CSS` template string
```css
.xpl-modal-back{position:fixed;inset:0;z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px;background:rgba(5,3,14,.76);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px)}
.xpl-modal{position:relative;width:min(460px,100%);border:1px solid #443570;border-radius:12px;background:linear-gradient(168deg,rgba(24,16,48,.98),rgba(10,7,22,.99));box-shadow:0 24px 64px rgba(0,0,0,.68),0 0 0 1px rgba(240,171,252,.08) inset;color:#e9e4ff;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:12px;overflow:hidden}
.xpl-modal::before{content:'';position:absolute;left:0;right:0;top:0;height:1px;background:linear-gradient(90deg,transparent,rgba(240,171,252,.8) 28%,rgba(126,238,255,.55) 72%,transparent);pointer-events:none}
.xpl-modal-head{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:16px 18px 13px;border-bottom:1px solid #2b2149}
.xpl-modal-brand{display:flex;align-items:center;gap:11px;min-width:0}
.xpl-modal-emblem{width:28px;height:28px;flex:0 0 28px;display:block;filter:drop-shadow(0 0 10px rgba(240,171,252,.22))}
.xpl-modal-eyebrow{font-family:ui-sans-serif,system-ui,sans-serif;font-size:9.5px;font-weight:500;letter-spacing:.22em;text-transform:uppercase;color:#d9a8f5;line-height:1.2}
.xpl-modal-title{font-family:Georgia,"Iowan Old Style","Palatino Linotype","Times New Roman",serif;font-size:21px;font-weight:400;letter-spacing:-.02em;line-height:1.12;margin:2px 0 0;color:#f6f1ff}
.xpl-modal-close{background:transparent;color:#aba2d1;border:1px solid #3a2e62;border-radius:6px;width:28px;height:28px;display:inline-flex;align-items:center;justify-content:center;font-size:16px;line-height:1;cursor:pointer;padding:0}
.xpl-modal-close:hover{background:#22184a;border-color:#8f7bff;color:#fff}
.xpl-modal-body{padding:16px 18px;display:flex;flex-direction:column;gap:12px}
.xpl-modal-desc{font-family:ui-sans-serif,system-ui,sans-serif;color:#b8afd9;font-size:12px;line-height:1.5;margin:0}
.xpl-modal-field{display:flex;flex-direction:column;gap:6px}
.xpl-modal-field span{font-family:ui-sans-serif,system-ui,sans-serif;font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:#cfc6f2}
.xpl-modal-input{width:100%;box-sizing:border-box;background:#0c081a;color:#f6f1ff;border:1px solid #524287;border-radius:7px;padding:9px 11px;font:13px/1.3 ui-monospace,SFMono-Regular,Menlo,monospace;outline:none}
.xpl-modal-input:focus{border-color:#7eeeff;box-shadow:0 0 0 2px rgba(94,242,255,.16)}
.xpl-modal-check{display:flex;align-items:flex-start;gap:8px;padding:9px 0;border-top:1px solid #261d42;border-bottom:1px solid #261d42;font-family:ui-sans-serif,system-ui,sans-serif;font-size:12px;color:#cfc6f2;cursor:pointer}
.xpl-modal-check input{margin-top:2px;accent-color:#d9a8f5}
.xpl-modal-check small{display:block;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:11px;color:#9f96c4;margin-top:2px}
.xpl-modal-warn{padding:8px 10px;border-radius:6px;border:1px solid rgba(255,209,102,.38);background:rgba(255,209,102,.08);color:#ffe29a;font-family:ui-sans-serif,system-ui,sans-serif;font-size:11.5px;line-height:1.45}
.xpl-modal-saved{display:flex;flex-direction:column;gap:6px}
.xpl-modal-saved-label{font-family:ui-sans-serif,system-ui,sans-serif;font-size:10.5px;letter-spacing:.08em;text-transform:uppercase;color:#9f96c4}
.xpl-modal-saved-list{display:flex;flex-wrap:wrap;gap:6px;max-height:92px;overflow-y:auto}
.xpl-modal-saved-btn{background:#140e29;color:#d8cff7;border:1px solid #3a2e62;border-radius:5px;padding:4px 8px;font:11px/1.2 ui-monospace,SFMono-Regular,Menlo,monospace;cursor:pointer}
.xpl-modal-saved-btn:hover,.xpl-modal-saved-btn.is-match{background:#251a4e;border-color:#d9a8f5;color:#fff}
.xpl-modal-foot{display:flex;align-items:center;justify-content:flex-end;gap:8px;padding:13px 18px 16px;border-top:1px solid #2b2149;background:rgba(7,4,16,.45)}
.xpl-modal-btn{background:#140e29;color:#e9e4ff;border:1px solid #4b3d7a;border-radius:7px;padding:7px 14px;font:12px/1.2 ui-sans-serif,system-ui,sans-serif;font-weight:500;cursor:pointer;min-height:33px}
.xpl-modal-btn:hover:not(:disabled){background:#24194c;border-color:#8f7bff}
.xpl-modal-btn:disabled{opacity:.42;cursor:default}
.xpl-modal-btn.is-primary{background:linear-gradient(180deg,#5b2d86,#3d1d61);border-color:#d9a8f5;color:#fff;box-shadow:0 0 18px rgba(217,168,245,.18)}
.xpl-modal-btn.is-primary:hover:not(:disabled){background:linear-gradient(180deg,#6e38a1,#4b2476);border-color:#f0abfc}
.xpl-modal-btn.is-danger{background:linear-gradient(180deg,#691f3d,#471329);border-color:#e06c96;color:#ffe4ee}
.xpl-modal-btn.is-danger:hover:not(:disabled){background:linear-gradient(180deg,#80264a,#5a1934);border-color:#ff94b9}
.xpl-modal-btn.is-subtle{margin-right:auto;background:transparent;border-color:#35295b;color:#aba2d1}
.xpl-modal-btn.is-subtle:hover{background:#1c143a;color:#e9e4ff}
.xpl-modal :focus-visible{outline:2px solid #5ef2ff;outline-offset:2px}
```

### 3B. Update `PsySlider` signature & value button click
- Signature: `function PsySlider({p,patchRef,engine,onTouched,onEditParam})`
- Value button `onClick`: `onClick:()=>onEditParam(p,value,apply)`
- Pass prop when rendering sliders: `u.jsx(PsySlider,{p,patchRef,engine,onTouched:touched,onEditParam:openParamDialog},p[1]+":"+epoch)`

### 3C. Add modal state & keyboard guard inside `PsyLabRoom`
Add state right after `morphAmt`:
```js
const[dialog,setDialog]=P.useState(null);
 const modalOpenRef=P.useRef(false);modalOpenRef.current=!!dialog;
 const modalInputRef=P.useRef(null);
 P.useEffect(()=>{if(!dialog)return;
  if(dialog.kind==='save'||dialog.kind==='param'){const el=modalInputRef.current;if(el){el.focus();el.select()}}
  const onKey=e=>{if(e.key==='Escape'){e.preventDefault();e.stopPropagation();setDialog(null)}};
  window.addEventListener('keydown',onKey,true);return()=>window.removeEventListener('keydown',onKey,true)},[dialog?.kind,dialog?.openedAt]);
```
Guard keyboard handler `down`:
```js
const down=e=>{if(modalOpenRef.current||Qp(e.target)||!inside(e.target))return;
```

### 3D. Replace save/delete handlers & add `openParamDialog` / commit handlers
```js
const initialName=current&&!current.id.startsWith('factory:')?current.name:(patchRef.current.name&&!FACTORY.some(f=>f.name===patchRef.current.name)?patchRef.current.name:'My Sound');
  setDialog({kind:'save',name:initialName,includeGrid:true,openedAt:Date.now()})};
 const commitSaveDialog=()=>{if(!dialog||dialog.kind!=='save')return;const cleanName=dialog.name.trim();if(!cleanName)return;
  const existing=user.find(x=>x.name===cleanName);
  const saved=sanitizePatch({...patchRef.current,name:cleanName,id:existing?existing.id:'user:'+uid(),grid:dialog.includeGrid?gridRef.current?.gridTuning:undefined});
  patchRef.current={...saved,id:'working'};
  setUser(list=>existing?list.map(x=>x.id===existing.id?saved:x):[...list,saved]);
  setSelected(saved.id);
  setDialog(null);
  setStatus((existing?'Updated “':'Saved “')+saved.name+'”'+(dialog.includeGrid?' (with current grid tuning as suggestion).':'.'))};
 const openDeleteDialog=()=>{const p=user.find(x=>x.id===selected);if(!p)return;setDialog({kind:'delete',patch:p,openedAt:Date.now()})};
 const commitDeleteDialog=()=>{if(!dialog||dialog.kind!=='delete')return;const p=dialog.patch;
  setUser(list=>list.filter(x=>x.id!==p.id));setSelected('');setDialog(null);setStatus('Deleted “'+p.name+'”.')};
 const openParamDialog=P.useCallback((p,value,apply)=>{setDialog({kind:'param',p,text:String(+value.toPrecision(6)),apply,error:'',openedAt:Date.now()})},[]);
 const commitParamDialog=()=>{if(!dialog||dialog.kind!=='param')return;const v=Number(String(dialog.text).replace(',','.'));
  if(!Number.isFinite(v)){setDialog(d=>d?{...d,error:'Please enter a valid number.'}:null);return}
  dialog.apply(v);setDialog(null)};
```

### 3E. Append portal dialog at the end of `PsyLabRoom` return children
```js
dialog&&typeof document!=='undefined'?ao.createPortal(
   u.jsx('div',{className:'xpl-modal-back','data-psy-modal':dialog.kind,onPointerDown:e=>e.stopPropagation(),onClick:e=>{e.stopPropagation();if(e.target===e.currentTarget)setDialog(null)},onKeyDown:e=>{e.stopPropagation();if(e.key==='Escape'){e.preventDefault();setDialog(null)}},children:
    u.jsxs('section',{className:'xpl-modal',role:'dialog','aria-modal':'true','aria-label':dialog.kind==='save'?'Save Sound':dialog.kind==='delete'?'Delete Sound':dialog.p[2],children:[
     u.jsxs('header',{className:'xpl-modal-head',children:[
      u.jsxs('div',{className:'xpl-modal-brand',children:[
       u.jsxs('svg',{className:'xpl-modal-emblem',viewBox:'0 0 40 40',fill:'none','aria-hidden':'true',children:[
        u.jsx('circle',{cx:20,cy:20,r:18.2,stroke:'#f0abfc',strokeOpacity:.62,strokeWidth:1.1}),
        u.jsx('ellipse',{cx:20,cy:20,rx:13.4,ry:6.5,transform:'rotate(-28 20 20)',stroke:'#7eeeff',strokeOpacity:.78,strokeWidth:1}),
        u.jsx('ellipse',{cx:20,cy:20,rx:13.4,ry:6.5,transform:'rotate(32 20 20)',stroke:'#f0abfc',strokeOpacity:.82,strokeWidth:1}),
        u.jsx('circle',{cx:20,cy:20,r:2,fill:'#f6f1ff'})
       ]}),
       u.jsxs('div',{children:[
        u.jsx('div',{className:'xpl-modal-eyebrow',children:dialog.kind==='param'?'Room IV · Parameter Value':'Room IV · Sound Archive'}),
        u.jsx('h3',{className:'xpl-modal-title',children:dialog.kind==='save'?'Save Sound':dialog.kind==='delete'?'Delete Sound':dialog.p[2]})
       ]})
      ]}),
      u.jsx('button',{type:'button',className:'xpl-modal-close','aria-label':'Close dialog',onClick:()=>setDialog(null),children:'×'})
     ]}),
     dialog.kind==='save'?(()=>{const trimmed=dialog.name.trim(),match=trimmed?user.find(x=>x.name===trimmed):null;
      return u.jsxs('form',{onSubmit:e=>{e.preventDefault();commitSaveDialog()},children:[
       u.jsxs('div',{className:'xpl-modal-body',children:[
        u.jsx('p',{className:'xpl-modal-desc',children:'Store the current sound settings in your local Psychedelic Lab archive.'}),
        u.jsxs('label',{className:'xpl-modal-field',children:[
         u.jsx('span',{children:'Sound name'}),
         u.jsx('input',{ref:modalInputRef,className:'xpl-modal-input',type:'text',maxLength:80,placeholder:'e.g. Glass Hydra, Velvet Drift …',value:dialog.name,onChange:e=>setDialog(d=>d?{...d,name:e.target.value}:null)})
        ]}),
        match?u.jsx('div',{className:'xpl-modal-warn',role:'status',children:'“'+match.name+'” already exists — saving will replace the saved sound.'}):null,
        activeGridLabel?u.jsxs('label',{className:'xpl-modal-check',children:[
         u.jsx('input',{type:'checkbox',checked:!!dialog.includeGrid,onChange:e=>setDialog(d=>d?{...d,includeGrid:e.target.checked}:null)}),
         u.jsxs('span',{children:['Link current grid tuning as suggestion',u.jsx('small',{children:activeGridLabel+(activeBaseHz?' · '+activeBaseHz+' Hz':'')})]})
        ]}):null,
        user.length?u.jsxs('div',{className:'xpl-modal-saved',children:[
         u.jsx('span',{className:'xpl-modal-saved-label',children:'Saved sounds (click to overwrite)'}),
         u.jsx('div',{className:'xpl-modal-saved-list',children:user.map(p=>u.jsx('button',{type:'button',className:'xpl-modal-saved-btn'+(trimmed===p.name?' is-match':''),onClick:()=>setDialog(d=>d?{...d,name:p.name}:null),children:p.name},p.id))})
        ]}):null
       ]}),
       u.jsxs('footer',{className:'xpl-modal-foot',children:[
        u.jsx('button',{type:'button',className:'xpl-modal-btn',onClick:()=>setDialog(null),children:'Cancel'}),
        u.jsx('button',{type:'submit',className:'xpl-modal-btn is-primary',disabled:!trimmed,children:match?'Overwrite Sound':'Save Sound'})
       ]})
      ]})})():null,
     dialog.kind==='delete'?u.jsxs(u.Fragment,{children:[
      u.jsx('div',{className:'xpl-modal-body',children:
       u.jsx('p',{className:'xpl-modal-desc',children:'Delete the saved sound “'+dialog.patch.name+'” from your archive? The sound you hear right now stays active as your working patch.'})
      }),
      u.jsxs('footer',{className:'xpl-modal-foot',children:[
       u.jsx('button',{type:'button',className:'xpl-modal-btn',onClick:()=>setDialog(null),children:'Cancel'}),
       u.jsx('button',{type:'button',className:'xpl-modal-btn is-danger',onClick:commitDeleteDialog,children:'Delete Sound'})
      ]})
     ]}):null,
     dialog.kind==='param'?u.jsxs('form',{onSubmit:e=>{e.preventDefault();commitParamDialog()},children:[
      u.jsxs('div',{className:'xpl-modal-body',children:[
       u.jsx('p',{className:'xpl-modal-desc',children:'Range: '+dialog.p[3]+' … '+dialog.p[4]+(dialog.p[7]?' '+dialog.p[7]:'')+' · Default: '+fmt(dialog.p,dialog.p[5])}),
       u.jsxs('label',{className:'xpl-modal-field',children:[
        u.jsx('span',{children:'Exact value'}),
        u.jsx('input',{ref:modalInputRef,className:'xpl-modal-input',type:'text',inputMode:'decimal',value:dialog.text,onChange:e=>setDialog(d=>d?{...d,text:e.target.value,error:''}:null)})
       ]}),
       dialog.error?u.jsx('div',{className:'xpl-modal-warn',role:'alert',children:dialog.error}):null
      ]}),
      u.jsxs('footer',{className:'xpl-modal-foot',children:[
       u.jsx('button',{type:'button',className:'xpl-modal-btn is-subtle',onClick:()=>{dialog.apply(dialog.p[5]);setDialog(null)},children:'Reset Default'}),
       u.jsx('button',{type:'button',className:'xpl-modal-btn',onClick:()=>setDialog(null),children:'Cancel'}),
       u.jsx('button',{type:'submit',className:'xpl-modal-btn is-primary',children:'Apply'})
      ]})
     ]}):null
    ]})
   }),document.body):null
```

---

## PATCH 4: `UI-EMBLEM-STARS-01` — Aligned Emblems + 8 XenSonar Star Triangles (PsyLab & Multitrack)

### 4A. Psychedelic Lab (`src/post-oct/034-xen-room-psylab.js`)
Replace header CSS (`.xpl-head` .. before `.xpl-bar`):
```css
.xpl-head{position:relative;display:flex;justify-content:space-between;align-items:flex-end;flex-wrap:wrap;gap:12px 24px;padding:2px 0 13px;margin:0 0 12px;border-bottom:1px solid #2e244d}
.xpl-head::after{content:'';position:absolute;left:0;bottom:-1px;width:min(380px,58%);height:1px;background:linear-gradient(90deg,rgba(240,171,252,.72),rgba(126,238,255,.35) 55%,transparent);pointer-events:none}
.xpl-brand{display:block;min-width:0;flex:1 1 380px}
.xpl-title-row{display:flex;align-items:center;gap:11px;margin-top:4px;min-width:0}
.xpl-emblem{width:38px;height:38px;flex:0 0 38px;display:block;transform:translateY(-2px);filter:drop-shadow(0 0 13px rgba(240,171,252,.28))}
.xpl-head-copy{min-width:0}
.xpl-eyebrow{font-family:ui-sans-serif,system-ui,sans-serif;font-size:10px;font-weight:500;letter-spacing:.24em;text-transform:uppercase;color:#d9a8f5;line-height:1.2}
.xpl h2{font-family:Georgia,"Iowan Old Style","Palatino Linotype","Times New Roman",serif;font-size:clamp(24px,2.1vw,29px);font-weight:400;letter-spacing:-.025em;line-height:1.08;margin:0;color:#f6f1ff;text-wrap:balance;text-shadow:0 1px 20px rgba(216,180,254,.18)}
.xpl-sub{font-family:ui-sans-serif,system-ui,sans-serif;color:#aba2d1;font-size:12px;margin:4px 0 0;max-width:74ch;line-height:1.45}
.xpl-head-meta{display:flex;flex-wrap:wrap;align-items:center;justify-content:flex-end;gap:6px;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:11px;font-variant-numeric:tabular-nums;color:#9f96c4;white-space:nowrap}
.xpl-head-meta b{font-weight:500;color:#e9e4ff}
.xpl-head-meta .sep{color:#5e5288}
@media(max-width:820px){.xpl-head{align-items:flex-start}.xpl-head-meta{justify-content:flex-start}.xpl-emblem{width:32px;height:32px;flex-basis:32px}}
```
Replace the `.xpl-brand` JSX block inside `header.xpl-head`:
```js
u.jsx('div',{className:'xpl-brand',children:
    u.jsxs('div',{className:'xpl-head-copy',children:[
     u.jsx('div',{className:'xpl-eyebrow',children:'Room IV · Synthesis Lab'}),
     u.jsxs('div',{className:'xpl-title-row',children:[
      u.jsxs('svg',{className:'xpl-emblem',viewBox:'0 0 64 64',fill:'none','aria-hidden':'true',children:[
       u.jsxs('g',{fill:'#f0abfc',fillOpacity:.18,stroke:'#f0abfc',strokeOpacity:.84,strokeWidth:1.2,strokeLinejoin:'round',children:[
        u.jsx('polygon',{points:'32,3.5 37.5,10.2 26.5,10.2'}),
        u.jsx('polygon',{points:'60.5,32 53.8,37.5 53.8,26.5'}),
        u.jsx('polygon',{points:'32,60.5 26.5,53.8 37.5,53.8'}),
        u.jsx('polygon',{points:'3.5,32 10.2,26.5 10.2,37.5'}),
        u.jsx('polygon',{points:'11.85,11.85 20.47,12.70 12.70,20.47'}),
        u.jsx('polygon',{points:'52.15,11.85 43.53,12.70 51.30,20.47'}),
        u.jsx('polygon',{points:'11.85,52.15 20.47,51.30 12.70,43.53'}),
        u.jsx('polygon',{points:'52.15,52.15 43.53,51.30 51.30,43.53'})
       ]}),
       u.jsx('circle',{cx:32,cy:32,r:19.2,stroke:'#f0abfc',strokeOpacity:.78,strokeWidth:1.25}),
       u.jsx('ellipse',{cx:32,cy:32,rx:14.2,ry:6.8,transform:'rotate(-28 32 32)',stroke:'#7eeeff',strokeOpacity:.88,strokeWidth:1.2}),
       u.jsx('ellipse',{cx:32,cy:32,rx:14.2,ry:6.8,transform:'rotate(32 32 32)',stroke:'#f0abfc',strokeOpacity:.88,strokeWidth:1.2}),
       u.jsx('circle',{cx:32,cy:32,r:6.4,stroke:'#ffd166',strokeOpacity:.72,strokeWidth:1.05}),
       u.jsx('circle',{cx:32,cy:32,r:2.1,fill:'#f6f1ff'})
      ]}),
      u.jsx('h2',{children:window.__XenTitleArt?u.jsx(window.__XenTitleArt.Title,{react:P,room:'psylab',text:'Psychedelic Lab',height:31,smallHeight:24}):'Psychedelic Lab'})
     ]}),
     u.jsx('p',{className:'xpl-sub',children:'Feedback-FM hydra · Escher staircase · vocal formants · spiral echo · grid crystals · Lorenz chaos — on the Main Room grid.'})
    ]})
   })
```

### 4B. Multitrack (`src/post-oct/032-xen-room-multitrack.js`)
Replace header CSS (`.xmt-head` .. before `.xmt-title-input`):
```css
.xmt-head{position:relative;display:flex;justify-content:space-between;align-items:flex-end;flex-wrap:wrap;gap:12px 24px;padding:4px 0 13px;margin:0 0 10px;border-bottom:1px solid #26252b}
.xmt-head::after{content:'';position:absolute;left:0;bottom:-1px;width:min(360px,55%);height:1px;background:linear-gradient(90deg,rgba(253,230,138,.65),rgba(253,230,138,.12) 68%,transparent);pointer-events:none}
.xmt-brand{display:block;min-width:0;flex:1 1 360px}
.xmt-title-row{display:flex;align-items:center;gap:11px;margin-top:4px;min-width:0}
.xmt-emblem{width:38px;height:38px;flex:0 0 38px;display:block;transform:translateY(-2px);filter:drop-shadow(0 0 12px rgba(253,230,138,.22))}
.xmt-head-copy{min-width:0}
.xmt-eyebrow{font-family:ui-sans-serif,system-ui,sans-serif;font-size:10px;font-weight:500;letter-spacing:.24em;text-transform:uppercase;color:#d9bc6e;line-height:1.2}
.xmt h2{font-family:Georgia,"Iowan Old Style","Palatino Linotype","Times New Roman",serif;font-size:clamp(24px,2.1vw,29px);font-weight:400;letter-spacing:-.025em;line-height:1.08;margin:0;color:#f7f1e1;text-wrap:balance;text-shadow:0 1px 18px rgba(253,230,138,.12)}
.xmt-sub{font-family:ui-sans-serif,system-ui,sans-serif;font-size:12px;line-height:1.45;color:#a8a29e;margin:4px 0 0;max-width:68ch}
.xmt-head-side{display:flex;flex-direction:column;align-items:flex-end;gap:6px;flex:0 1 auto}
.xmt-head-meta{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:11px;font-variant-numeric:tabular-nums;color:#a8a29e;letter-spacing:.02em;white-space:nowrap}
.xmt-head-meta b{font-weight:500;color:#e7e0cf}
.xmt-head-controls{display:flex;flex-wrap:wrap;gap:8px;align-items:center}
```
Replace the `.xmt-brand` JSX block inside `header.xmt-head`:
```js
u.jsx('div',{className:'xmt-brand',children:
    u.jsxs('div',{className:'xmt-head-copy',children:[
     u.jsx('div',{className:'xmt-eyebrow',children:'Room V · Arrangement'}),
     u.jsxs('div',{className:'xmt-title-row',children:[
      u.jsxs('svg',{className:'xmt-emblem',viewBox:'0 0 64 64',fill:'none','aria-hidden':'true',children:[
       u.jsxs('g',{fill:'#fde68a',fillOpacity:.18,stroke:'#fde68a',strokeOpacity:.82,strokeWidth:1.2,strokeLinejoin:'round',children:[
        u.jsx('polygon',{points:'32,3.5 37.5,10.2 26.5,10.2'}),
        u.jsx('polygon',{points:'60.5,32 53.8,37.5 53.8,26.5'}),
        u.jsx('polygon',{points:'32,60.5 26.5,53.8 37.5,53.8'}),
        u.jsx('polygon',{points:'3.5,32 10.2,26.5 10.2,37.5'}),
        u.jsx('polygon',{points:'11.85,11.85 20.47,12.70 12.70,20.47'}),
        u.jsx('polygon',{points:'52.15,11.85 43.53,12.70 51.30,20.47'}),
        u.jsx('polygon',{points:'11.85,52.15 20.47,51.30 12.70,43.53'}),
        u.jsx('polygon',{points:'52.15,52.15 43.53,51.30 51.30,43.53'})
       ]}),
       u.jsx('circle',{cx:32,cy:32,r:19.2,stroke:'#fde68a',strokeOpacity:.78,strokeWidth:1.25}),
       u.jsx('circle',{cx:32,cy:32,r:14.6,stroke:'#fde68a',strokeOpacity:.24,strokeWidth:1,strokeDasharray:'2.5 3.5'}),
       u.jsx('line',{x1:21,y1:25.5,x2:36.5,y2:25.5,stroke:'#fde68a',strokeOpacity:.92,strokeWidth:1.8,strokeLinecap:'round'}),
       u.jsx('line',{x1:25,y1:32,x2:43,y2:32,stroke:'#f59e0b',strokeOpacity:.88,strokeWidth:1.8,strokeLinecap:'round'}),
       u.jsx('line',{x1:22.5,y1:38.5,x2:39.5,y2:38.5,stroke:'#38bdf8',strokeOpacity:.82,strokeWidth:1.8,strokeLinecap:'round'}),
       u.jsx('line',{x1:32,y1:19.5,x2:32,y2:44.5,stroke:'#fafaf9',strokeOpacity:.88,strokeWidth:1.2}),
       u.jsx('circle',{cx:32,cy:32,r:2.1,fill:'#fde68a'})
      ]}),
      u.jsx('h2',{children:window.__XenTitleArt?u.jsx(window.__XenTitleArt.Title,{react:P,room:'multitrack',text:'Multitrack',height:32,smallHeight:25}):'Multitrack'})
     ]}),
     u.jsx('p',{className:'xmt-sub',children:'Arrange harvested material on free-meter tracks · Live Room and Mycelium sleep while open · Right-click anywhere for options.'})
    ]})
   })
```

---

## PATCH 5: `UI-LIVE-CONSOLE-BURL-01` — Dark Reddish Burl Wood Console, Echo Push-Button & Remove Mycelium Drive Relic

### 5A. Create new file `styles/merge_meta_additions/047_xen-live-console-wood.css`
Register in `source-manifest.json` and inject `<style id="xen-live-console-wood">...</style>` directly AFTER `<style id="xen-h4-h1-icons-hairline-vector">` in `src/index.template.html`.

```css
/* XENSONAR LIVE CONSOLE FASCIA — Dark Reddish Automotive Burl Wood ("Wurzelholz") & Satin Brass.
   Distinguishes the Live Room menu console ([data-xensonar-performance-strip])
   unmistakably from the obsidian top room-navigation bar above it.
   Preserves all H1/H4 circle symbols (.xen-header-unicode-icon), slot widths,
   24px button heights, and overflow:visible overhang geometry. */

[data-xensonar-performance-strip] {
  position: relative;
  overflow: visible !important;
  border-radius: 8px;
  padding: 8px 14px !important;
  margin-bottom: 10px !important;
  /* Deep dark reddish mahogany burl wood ("Wurzelholz") with automotive clear-coat lacquer */
  background-color: #210807 !important;
  background-image:
    /* Layer 1: High-gloss automotive clear-coat piano lacquer reflection */
    linear-gradient(
      180deg,
      rgba(255, 224, 206, .22) 0%,
      rgba(255, 198, 174, .08) 28%,
      rgba(255, 186, 160, .02) 44%,
      rgba(10, 2, 2, .15) 52%,
      rgba(7, 1, 1, .44) 100%
    ),
    /* Layer 2: Organic swirling burl-whorl figure & dark root knots (100% offline inline SVG) */
    url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='340' height='72' viewBox='0 0 340 72'%3E%3Cpath d='M0 10 C42 2,74 22,118 14 C162 6,198 26,246 16 C288 8,314 18,340 10' fill='none' stroke='%23100202' stroke-opacity='.56' stroke-width='2.3'/%3E%3Cpath d='M0 24 C36 32,82 10,128 24 C172 36,212 12,260 26 C298 36,320 20,340 24' fill='none' stroke='%23922818' stroke-opacity='.38' stroke-width='1.9'/%3E%3Cpath d='M0 40 C48 28,86 52,138 38 C184 26,224 50,276 38 C306 30,324 44,340 40' fill='none' stroke='%23110202' stroke-opacity='.58' stroke-width='2.5'/%3E%3Cpath d='M0 56 C44 64,92 44,146 58 C196 70,236 46,286 58 C314 64,326 52,340 56' fill='none' stroke='%23a6341c' stroke-opacity='.30' stroke-width='1.7'/%3E%3Cellipse cx='54' cy='34' rx='26' ry='14' transform='rotate(-9 54 34)' fill='none' stroke='%239f2e1a' stroke-opacity='.40' stroke-width='2.5'/%3E%3Cellipse cx='54' cy='34' rx='16' ry='8.5' transform='rotate(-12 54 34)' fill='none' stroke='%23110202' stroke-opacity='.68' stroke-width='2.3'/%3E%3Cellipse cx='55' cy='34' rx='7' ry='3.8' transform='rotate(-8 55 34)' fill='%230d0202' fill-opacity='.76'/%3E%3Cellipse cx='146' cy='22' rx='22' ry='11' transform='rotate(11 146 22)' fill='none' stroke='%23b53c20' stroke-opacity='.32' stroke-width='2.1'/%3E%3Cellipse cx='147' cy='22' rx='12' ry='6' transform='rotate(10 147 22)' fill='none' stroke='%23100202' stroke-opacity='.64' stroke-width='2.1'/%3E%3Cellipse cx='147' cy='22' rx='4.8' ry='2.5' fill='%230c0202' fill-opacity='.72'/%3E%3Cellipse cx='226' cy='48' rx='29' ry='14' transform='rotate(-7 226 48)' fill='none' stroke='%23962916' stroke-opacity='.42' stroke-width='2.6'/%3E%3Cellipse cx='225' cy='48' rx='18' ry='8.5' transform='rotate(-6 225 48)' fill='none' stroke='%23100202' stroke-opacity='.68' stroke-width='2.4'/%3E%3Cellipse cx='224' cy='48' rx='8' ry='3.8' fill='%230d0202' fill-opacity='.76'/%3E%3Cellipse cx='302' cy='26' rx='20' ry='10' transform='rotate(13 302 26)' fill='none' stroke='%23aa361c' stroke-opacity='.34' stroke-width='2.1'/%3E%3Cellipse cx='302' cy='26' rx='10' ry='5' transform='rotate(12 302 26)' fill='none' stroke='%23100202' stroke-opacity='.64' stroke-width='2'/%3E%3Cellipse cx='303' cy='26' rx='4' ry='2.1' fill='%230c0202' fill-opacity='.74'/%3E%3Ccircle cx='98' cy='50' r='3.5' fill='%230f0202' fill-opacity='.62'/%3E%3Ccircle cx='98' cy='50' r='7.5' fill='none' stroke='%239e3019' stroke-opacity='.32' stroke-width='1.5'/%3E%3Ccircle cx='186' cy='38' r='2.8' fill='%230f0202' fill-opacity='.58'/%3E%3Ccircle cx='186' cy='38' r='6.5' fill='none' stroke='%23922816' stroke-opacity='.32' stroke-width='1.4'/%3E%3Ccircle cx='268' cy='18' r='3' fill='%230f0202' fill-opacity='.58'/%3E%3Ccircle cx='268' cy='18' r='6.8' fill='none' stroke='%23a6341b' stroke-opacity='.30' stroke-width='1.4'/%3E%3C/svg%3E"),
    /* Layer 3: Asymmetric reddish-mahogany & dark garnet burl clouds and shadow eyes */
    radial-gradient(ellipse 14% 72% at 11% 42%, rgba(146, 36, 22, .44) 0%, rgba(72, 16, 12, .16) 54%, transparent 100%),
    radial-gradient(ellipse 9% 54% at 24% 68%, rgba(12, 2, 2, .70) 0%, rgba(118, 28, 18, .28) 58%, transparent 100%),
    radial-gradient(ellipse 16% 68% at 39% 30%, rgba(160, 46, 24, .36) 0%, rgba(64, 14, 11, .16) 58%, transparent 100%),
    radial-gradient(ellipse 10% 58% at 54% 64%, rgba(10, 2, 2, .72) 0%, rgba(132, 34, 20, .30) 56%, transparent 100%),
    radial-gradient(ellipse 15% 66% at 70% 34%, rgba(148, 38, 22, .40) 0%, rgba(58, 12, 10, .15) 58%, transparent 100%),
    radial-gradient(ellipse 11% 56% at 86% 62%, rgba(12, 2, 2, .68) 0%, rgba(126, 32, 18, .28) 58%, transparent 100%),
    /* Layer 4: Deep dark reddish mahogany-oxblood veneer base */
    linear-gradient(90deg, #160505 0%, #2d0b09 17%, #3e110c 36%, #260908 55%, #3a100b 78%, #160505 100%) !important;
  background-size: 100% 100%, 340px 72px, 100% 100%, 100% 100%, 100% 100%, 100% 100%, 100% 100%, 100% 100%, 100% 100% !important;
  /* Beveled warm champagne-gold automotive trim + lacquered dark-mahogany side cheeks */
  border: 1px solid rgba(218, 166, 108, .50) !important;
  border-left: 3px solid #4e1812 !important;
  border-right: 3px solid #4e1812 !important;
  box-shadow:
    inset 0 1px 0 rgba(255, 226, 194, .30),
    inset 0 -1px 0 rgba(9, 2, 2, .90),
    inset 0 0 0 1px rgba(20, 5, 4, .52),
    0 8px 24px rgba(0, 0, 0, .64),
    0 1px 0 rgba(218, 166, 108, .18) !important;
}

/* Fine horizontal brushed-gold pinstripe inlay along the top edge of the burl fascia */
[data-xensonar-performance-strip]::before {
  content: '';
  position: absolute;
  left: 12px;
  right: 12px;
  top: 2px;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(246, 210, 152, .46) 14%, rgba(246, 210, 152, .22) 50%, rgba(246, 210, 152, .46) 86%, transparent);
  pointer-events: none;
}

/* Left readout: recessed dark smoked-glass instrument bezel for Particles */
[data-xensonar-performance-strip] [data-xen-status-particles] {
  padding: 4px 10px;
  border-radius: 4px;
  background: linear-gradient(180deg, rgba(11, 4, 4, .86), rgba(22, 8, 7, .76));
  border: 1px solid rgba(212, 156, 98, .28);
  box-shadow: inset 0 1px 3px rgba(0, 0, 0, .76), 0 1px 0 rgba(255, 222, 186, .10);
}
[data-xensonar-performance-strip] [data-xen-status-particles] > span:first-child {
  color: #deb078 !important;
}

/* Fretboard button: chamfered dark ebony-mahogany console key (icon circle preserved) */
[data-xensonar-performance-strip] [data-xen-status-fretboard] {
  border-radius: 5px !important;
  background: linear-gradient(180deg, rgba(36, 16, 14, .94) 0%, rgba(17, 7, 6, .97) 100%) !important;
  border: 1px solid rgba(216, 164, 104, .40) !important;
  box-shadow:
    inset 0 1px 0 rgba(255, 224, 188, .16),
    0 2px 5px rgba(0, 0, 0, .56) !important;
  color: #f4e6d8 !important;
  transition: background .16s ease, border-color .16s ease, box-shadow .16s ease !important;
}
[data-xensonar-performance-strip] [data-xen-status-fretboard] > span:nth-of-type(2) {
  color: #d9ac79 !important;
}
[data-xensonar-performance-strip] [data-xen-status-fretboard]:hover,
[data-xensonar-performance-strip] [data-xen-status-fretboard]:focus-visible {
  background: linear-gradient(180deg, rgba(58, 24, 19, .96) 0%, rgba(28, 11, 9, .98) 100%) !important;
  border-color: rgba(244, 198, 132, .76) !important;
  box-shadow:
    inset 0 1px 0 rgba(255, 234, 200, .28),
    0 0 12px rgba(232, 174, 104, .22) !important;
}

/* Right-side Live Room menu buttons: sculpted dark ebony-mahogany hardware keys with brass rim */
[data-xensonar-performance-strip] [data-xen-status-menus] > button {
  border-radius: 5px !important;
  background: linear-gradient(180deg, rgba(40, 17, 14, .94) 0%, rgba(21, 9, 8, .97) 55%, rgba(13, 5, 5, .99) 100%) !important;
  border: 1px solid rgba(216, 164, 104, .40) !important;
  color: #f4e6d8 !important;
  box-shadow:
    inset 0 1px 0 rgba(255, 224, 188, .17),
    inset 0 -1px 0 rgba(0, 0, 0, .60),
    0 2px 5px rgba(0, 0, 0, .58) !important;
  transition: background .16s ease, border-color .16s ease, color .16s ease, box-shadow .16s ease !important;
}
[data-xensonar-performance-strip] [data-xen-status-menus] > button:hover,
[data-xensonar-performance-strip] [data-xen-status-menus] > button:focus-visible {
  background: linear-gradient(180deg, rgba(66, 28, 22, .96) 0%, rgba(34, 13, 11, .98) 100%) !important;
  border-color: rgba(246, 202, 136, .80) !important;
  color: #fff8ef !important;
  box-shadow:
    inset 0 1px 0 rgba(255, 236, 202, .30),
    0 0 12px rgba(236, 178, 108, .24) !important;
}

/* Preserve live playing (emerald) and active hotkey target (gold) clearly on the burl fascia */
[data-xensonar-performance-strip] [data-xen-status-menus] > button[class*="bg-emerald-950"] {
  background: linear-gradient(180deg, rgba(16, 68, 49, .95) 0%, rgba(9, 40, 29, .98) 100%) !important;
  border-color: rgba(88, 214, 158, .68) !important;
  color: #e6fff3 !important;
  box-shadow:
    inset 0 1px 0 rgba(167, 243, 208, .28),
    0 0 12px rgba(34, 197, 94, .22) !important;
}
[data-xensonar-performance-strip] [data-xen-status-menus] > button[class*="border-amber-400"] {
  border-color: rgba(251, 191, 36, .92) !important;
  box-shadow:
    inset 0 1px 0 rgba(254, 243, 199, .30),
    0 0 0 1px rgba(251, 191, 36, .35),
    0 0 12px rgba(251, 191, 36, .24) !important;
}

/* Flagship Meta-Menu hardware switch: deep petrol inlay with bright aqua-gold rim */
[data-xensonar-performance-strip] [data-xen-status-menus] > button.xen-meta-rack {
  background: linear-gradient(180deg, rgba(22, 52, 66, .95) 0%, rgba(12, 30, 40, .98) 100%) !important;
  border-color: rgba(132, 204, 232, .58) !important;
  color: #eaf8ff !important;
  box-shadow:
    inset 0 1px 0 rgba(186, 230, 253, .26),
    0 2px 6px rgba(0, 0, 0, .58) !important;
}
[data-xensonar-performance-strip] [data-xen-status-menus] > button.xen-meta-rack:hover,
[data-xensonar-performance-strip] [data-xen-status-menus] > button.xen-meta-rack:focus-visible {
  background: linear-gradient(180deg, rgba(30, 70, 88, .98) 0%, rgba(15, 39, 52, .99) 100%) !important;
  border-color: rgba(165, 224, 248, .86) !important;
  color: #ffffff !important;
  box-shadow:
    inset 0 1px 0 rgba(224, 242, 254, .34),
    0 0 14px rgba(102, 182, 216, .28) !important;
}

/* Keep the mature H4 circular icons untouched, only ground their drop shadow cleanly on the burl wood */
[data-xensonar-performance-strip] .xen-header-unicode-icon {
  box-shadow: 0 0 0 2px #160605, 0 3px 9px rgba(0, 0, 0, .72) !important;
}

/* Passive right-side status indicators (Octave / Sustain / Detach / Pedal / Swell / Damp):
   recessed smoked-glass readout windows flush inside the burl fascia so they clearly read as indicators */
[data-xensonar-performance-strip] [data-xen-status-controls] > div,
[data-xensonar-performance-strip] [data-xen-status-controls] > span {
  border-color: rgba(196, 144, 92, .24);
  background-color: rgba(12, 4, 4, .76);
  box-shadow: inset 0 2px 4px rgba(0, 0, 0, .76), 0 1px 0 rgba(255, 220, 186, .08);
}

/* Interactive Echo toggle button: unmistakably raised, chamfered hardware push-button with label
   so it stands apart from the flat recessed status indicators beside it */
[data-xensonar-performance-strip] [data-xen-status-controls] > button[data-xen-status-toggle="echo"] {
  width: auto !important;
  height: 34px !important;
  margin-left: 4px !important;
  padding: 0 10px 0 8px !important;
  gap: 5px !important;
  border-radius: 6px !important;
  opacity: 1 !important;
  cursor: pointer !important;
  background: linear-gradient(180deg, #431d16 0%, #260f0c 52%, #170807 100%) !important;
  border: 1.5px solid rgba(228, 178, 114, .72) !important;
  color: #f6e7d4 !important;
  box-shadow:
    inset 0 1px 0 rgba(255, 232, 198, .32),
    inset 0 -1px 0 rgba(0, 0, 0, .74),
    0 3px 8px rgba(0, 0, 0, .64) !important;
  transition: background .16s ease, border-color .16s ease, color .16s ease, box-shadow .16s ease, transform .10s ease !important;
}
[data-xensonar-performance-strip] [data-xen-status-controls] > button[data-xen-status-toggle="echo"]::after {
  content: "Echo";
  font-size: 10.5px;
  font-weight: 600;
  letter-spacing: .04em;
  line-height: 1;
}
[data-xensonar-performance-strip] [data-xen-status-controls] > button[data-xen-status-toggle="echo"]:hover,
[data-xensonar-performance-strip] [data-xen-status-controls] > button[data-xen-status-toggle="echo"]:focus-visible {
  background: linear-gradient(180deg, #59261d 0%, #32130f 55%, #1e0a08 100%) !important;
  border-color: rgba(110, 231, 183, .88) !important;
  color: #ecfff6 !important;
  box-shadow:
    inset 0 1px 0 rgba(209, 250, 229, .34),
    inset 0 -1px 0 rgba(0, 0, 0, .70),
    0 0 12px rgba(52, 211, 153, .26),
    0 3px 8px rgba(0, 0, 0, .64) !important;
}
[data-xensonar-performance-strip] [data-xen-status-controls] > button[data-xen-status-toggle="echo"][aria-pressed="true"] {
  background: linear-gradient(180deg, rgba(16, 94, 66, .97) 0%, rgba(8, 52, 36, .99) 55%, rgba(6, 36, 25, 1) 100%) !important;
  border-color: rgba(74, 222, 128, .92) !important;
  color: #ebfff5 !important;
  box-shadow:
    inset 0 1px 0 rgba(167, 243, 208, .42),
    inset 0 -1px 0 rgba(0, 0, 0, .62),
    0 0 14px rgba(34, 197, 94, .36),
    0 2px 7px rgba(0, 0, 0, .62) !important;
}
[data-xensonar-performance-strip] [data-xen-status-controls] > button[data-xen-status-toggle="echo"]:active {
  transform: translateY(1px) !important;
  box-shadow:
    inset 0 2px 4px rgba(0, 0, 0, .72),
    0 1px 2px rgba(0, 0, 0, .55) !important;
}
```

### 5B. Remove legacy rightmost `Mycelium Drive` indicator in `src/myzel/01_effect_mapping.js`
Inside `Noe` (`[data-xen-status-controls]`), delete this exact trailing child after `kind:"echo"`:
```js
,u.jsx(kb,{kind:"drive",active:E,title:"Mycelium Drive · additional nonlinear saturation on the Mycelium sound path; not a master effects switch"})
```
