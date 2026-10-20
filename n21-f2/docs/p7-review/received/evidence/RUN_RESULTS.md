# Rebase-Prüfprotokoll (20.10.2026)

- Eingangs-ZIP: `0ef0eb50c84eaa18df4f03fa76959e44a011e6fc6feb1599909cb9cc0bd6e4f5`.
- Original modular: `node build.cjs --verify` PASS; SHA-256 `e8e63ffe8703fbe3ed683603e880c5e5b8a2970f04cf620e0ed291e98313884d`.
- Stage 00: PASS `a863fbd2446cb0f249b74b0aef58bf825c82f9ebba189f53a44e9989ac86caf6`.
- Stage 01: PASS `11a640eb4ae665b7b5d00b26e74b6bb9495a430864b2bbf48ad7de7037e3fb7f`.
- Stage 02: PASS `6dd0f23cb65ca6509200cc7fed91198282bd4297109ca6db1f346c1d972f61d7`.
- Stage 03: PASS `852c636ba8cb322e3d71cc1b16fdbf3717544f9704032ee5d9cfa736d8d02f18`.
- Stage 04: PASS `47ad3113aefa6f2034b11be418abf6cca6b8c909c517c052988e36953249c36b`.
- Stage 05: PASS `1b0cb29a31fbff4d532df17d8015aedcfda735113c2a4198c77f1e5af4651d3`.
- Stage 06: PASS `ddd5f5bec81bef1dada06c03476ec39d49d7742a1397d1f1c1b5418ca3954007`.
- Stage 07: PASS `d9881eb4945120f949dfa80aa0371850301a5f77aa38e1e14376e667ac64c122`.
- Stage 08: PASS `bc0260682088a3a37a7bf9637d634b8027bc121b2546cb9b520a9760d94c002d`.
- `node build.cjs`: PASS (5.672.609 Bytes); `node build.cjs --verify`: PASS.
- `node --check` auf extrahiertem JavaScript-Modul: PASS.
- Portable strukturelle Assertions: 13/13 PASS.
- Historischer `test_p7_contract.py` direkt auf originaler P7-HTML: 16/16 PASS.
- `npm run test:live-stability`: PASS (RFL Cut/Native Fallback/Lifecycle/44.1–96 kHz).
- `npm run test:merge`: **FAIL**, altes Preservation-/Unverändertheits-Gate in `tests/nodal-ball-grid-preservation.cjs` für bewusst geändertes `src/nodal/07_sound_designer.js`.
- Ein frischer Browser-/Opera- und Hörtest des **rebaseten** Artefakts wurde **nicht** durchgeführt.
