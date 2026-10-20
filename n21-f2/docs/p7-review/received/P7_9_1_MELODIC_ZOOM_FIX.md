# P7.9.1 – Horizontal Zoom Window pointermove repair

Basis P7.9 SHA256 `616e0ad378b1c1f33660165064f64c345167812a28b085ece07c5720039bed88`; rebuilt result SHA256 `943c39d4e63e4652d9343dce283dd10bb2432b4c4efb260df8b23bdfb34284d2`.

The existing `h7e()` Melodic Loop overview captures the pointer in its `onPointerDown` handler. Under Chromium's pointer capture, dragging emits `pointermove` without accompanying `mousemove` for the held pointer. The viewport drag processor registered only `window.mousemove`, so `PUe()` was not called and the viewport rectangle stayed at 0–100%.

Stage 19 adds `pointermove` to the existing controller listener and cleanup, leaving keyboard, MIDI, audio and zoom mathematics unchanged. In direct HTML browser testing, the identical drag starts with `left:0%; width:100%`, and after the fix ends with `left:10.9375%; width:89.0625%`.

Note: Browser tests load the bundled document through `page.set_content()` with an isolated localStorage and randomUUID polyfill; browser navigation to file or localhost is blocked by administrator policy in this tool environment. This verifies DOM pointer behavior, not physical touchpad or Opera audio timing. Separate acceptance still needed.

Not part of stages 18/19: saved Entrophon library sounds, Material Track import preview, power-off Material Track preview. No claims of repair for these unrelated issues.
