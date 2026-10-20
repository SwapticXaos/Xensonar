# XenSonar P7.10 — Konsolidierung (20–21)

Basis: P7.9.1 (Patches 00–19). Neue, strikt getrennte Patches:

- **20 ENTROPHON LIVE STALE REVISION:** Live-Tastaturauswahl verweist nach Revision eines gespeicherten Entrophon-Instruments ggf. noch auf alte @-Revision. Bei fehlender exakter Live-Revision wird nur die neueste Revision **derselben Bibliotheks-ID** herangezogen, sofern sie neuer ist. Andere IDs, entfernte Instrumente und historische Projekt-Snapshots bleiben unangetastet. Wenn alte Revisionen nicht in einem Projekt-Snapshot erhalten wurden, ist deren exakter Klang nicht mehr rekonstruierbar; live ertönt in diesem Fall die neueste Version derselben ID.
- **21 INDEPENDENT MATERIAL PREVIEW:** Eigenständiges HTMLAudioElement aus dem Originalmaterial-Blob, keine Power-/Transport-Abhängigkeit, Stop bei erneutem Klick, Ressourcen/Blob-URL freigeben. Preview-Knopf im Material-Track-Panel und bei gerenderten Raw-Audio-Einträgen in Import Material Track. Bei rein strukturierter Audio Paint ohne Audio-Blob bleibt der Knopf disabled: kein erfundener Preview-Klang.

**Tests** (TDD): ``node tests/test_entrophon_live_revision.cjs`` und ``node tests/test_material_standalone_preview.cjs``; beide Tests waren auf 19 rot und auf P7.10 grün. HTML auf dem Rechner in Opera abnehmen: ältere Entrophon-Auswahl im Keyboard bei deaktiviertem Wellenstarter sowie Material Track bei Power off. Weitere C11-Surface-Varianten und alle historischen Browser-/Audiozustände sind dadurch nicht vollständig abgenommen.

**Wichtige offene Probleme:** Historischer Preservation-Hash aus Patch 00; ältere p3b2-Testhilfe erwartet ``__XenBassGridRuntime`` im Mock. Bei Bedarf separat reparieren, nicht als Audiobug ausgeben. Kein Worklet/Audioengine-Umbau durch diese Runde.

**Neuaufbau:** originale ``XenSonar_N21_F2_Nodal_Ball_Grid_Quellen(1).zip`` entpacken, ``python3 Handoff/apply_patches.py ./n21-f2 --to 21`` ausführen, anschließend Node-Tests. Patches verifizieren die Bytefolge jedes Vorgängers. Es sind keine vollständigen Quellen im Handoff enthalten.
