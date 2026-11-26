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
