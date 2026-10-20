# P7.9 – Sample Database rack orientation rays

**Basis:** P7.8 HTML SHA256 `28e1a810570c4e7e3308a33b5b711e275c913bf40a654bdba62a7ec0076adcb0`.
**Reconstruction:** `616e0ad378b1c1f33660165064f64c345167812a28b085ece07c5720039bed88`.

## Change
Small, visual-only stage 18 in `src/forge_and_melodic/06_note_editor_and_material_tools.js`.
The Sample Database count button (`67 Samples` or dynamic count) now displays three subtle cyan rays ending at the open panel top edge, helping identify the controlling button. No layout push-down and no new text. Rays are absent when the rack is closed. SVG `pointer-events:none`, `aria-hidden:true`; button and rack retain original click handling. Position recomputed by `ResizeObserver`, scroll and resize events through at most one scheduled `requestAnimationFrame` per event frame. No continuous animation loop, timers or audio graph changes.

## Tests and caveats
- Source gate `node Handoff/tests/test_p79_sample_rack_rays.cjs <module-path>`: PASS.
- `node build.cjs`: PASS; JavaScript parsed/build output rebuilt.
- **Browser visual acceptance NOT available here**: Chromium blocks both file:// and local HTTP navigation with ERR_BLOCKED_BY_ADMINISTRATOR. Must check connector alignment in Opera, full/closed state, scrollbar and hit targets.
- **Out of scope / still open from preceding user requests:** saved Entrophon preset live playback vs Current, Melodic Loop horizontal zoom drag, power-off preview for Material Track and import dialog. These must not be marked fixed on account of this stage.
