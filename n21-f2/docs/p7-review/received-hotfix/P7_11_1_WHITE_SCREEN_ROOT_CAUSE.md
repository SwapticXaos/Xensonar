# P7.11.1 — White-Screen Hotfix (20.10.2026)

The P7.11 bundle shipped with a JavaScript syntax error in src/forge_and_melodic/06_note_editor_and_material_tools.js, accidentally using `aria-label:` (unquoted hyphenated object key) for React JSX props. This prevents the module from parsing, producing a blank screen.

Replace exactly once in the modular source AND rebuilt HTML:

`aria-label:`Preview ${B.name}`` → `"aria-label":`Preview ${B.name}``

HTML original SHA256: `e1d03bb19f03dd647f5d25f810b27ac312297eb8339e35e53cf6a17f5264a571`
HTML corrected SHA256: `3d84f707cffbecfb19736194660f13282d006c6186c39a44f3129bfd530705f4`

Run Node's `node --check` on the HTML's extracted `<script type="module">` as an .mjs file, then confirm the application renders in Opera. No claims about browser execution or audio behavior from syntax validation alone. Previous P7.11 package is superseded for runtime use; the standalone hotfix script is strictly SHA gated.
