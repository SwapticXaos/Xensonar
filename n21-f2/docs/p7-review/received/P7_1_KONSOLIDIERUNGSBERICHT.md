# XenSonar P7.1 – Konsolidierung / Laufzeit-Gates (20.10.2026)

## Entscheidung
**Keine Audio-/UI-Änderung in P7.1.** Die aktuelle P7-HTML bleibt bitidentisch. Der 10. Patch (09) fügt ausschließlich drei ausführbare Tests in `tests/` ein. Die bestehenden Patches 00–08 bleiben unverändert. Das ist eine QA-/Handoff-Stufe, keine funktionale Neuerung.

## Reproduzierbare Ergebnisse dieses aktuellen Konsolidierungslaufs

1. **Unveränderte Nutzer-Codex-Basis**: `npm run test:merge` vollständig **PASS**. Die ursprüngliche Basis ist somit nicht defekt.
2. **Nach Patch 00–08**: Alle zehn individuell gestarteten, echten Domänentests **PASS** (Forge Play/Save, ready-from-cache, Navigation, Apostroph-Notenlänge, Quickdock, Keyboard-Direktheit, C11-Keyboard, Power-Owner, Nodal-Grid-Sources, Nodal-Grid-Bank).
3. **Neue P7-Grids/Space-Verhaltenstests**: **17 PASS** gegen die tatsächlich extrahierte P7-Implementierung mit gestubbten Browser-/Library-Abhängigkeiten. 12/9/5/17-EDO, unabhängiges Bass/Drone/RFL-Routing, Linked-Tuning-Persistenz, fehlende Bibliotheksreferenz, kein Recompile bei unabhängiger Hauptstimmungsänderung, Space Hold/Release/Reattach, Blur/Visibility.
4. **Neue Quellgrenze**: **216** ursprüngliche Source/Style/Template-Dateien byteidentisch, **20** ausschließlich in 00–08 deklarierte Änderungen und **1** Add-on-Datei. Originale Modulreihenfolge intakt.
5. Der unveränderte Build reproduziert weiterhin **P7 SHA-256 `bc0260682088a3a37a7bf9637d634b8027bc121b2546cb9b520a9760d94c002d`**.

## Abgesicherte alte Funktionen
- **Apostroph-Live-Notenlänge** und separate Keyboard-Attacks: Tests bestanden, keine inhaltliche P7.1-Änderung.
- **C11 Nodal-Grid**: PCM-Parität und vorbereiteter Grid-Bank-Pfad im vorhandenen Test bestanden.
- **Forge Play/Save**: Maße und Ready-State bestanden, ersetzt aber keinen visuellen Test des Navigator-Preview-Buttons.
- **Bass-Grid**: Reales `__XenBassGrid`-Objekt getestet; Quantisierung und unabhängige Cache-Invaliderung bestätigt. Die Tests imitieren *nicht* die Rasterimplementierung, nur ihre Umgebung.

## Offene Punkte / bewusst nicht kaschiert
- `npm run test:merge` bleibt **nach P7** beim historischen Preservation-Hash in `tests/nodal-ball-grid-preservation.cjs` rot. Diese Hash-Invariante stammt von *vor* der beabsichtigten Stage-00-Änderung. Baseline grün, P7 Testkonflikt offen. 10 erfolgreiche Domänentests **ersetzen die rote Gesamtsuite nicht**.
- **Stage 00 ist nicht nur UI:** Sie ändert Installation-Sound-Gating und den eigenen Myzel-/Ball-Klangpegel, zusätzlich zu UI/CSS. Review als **audio-relevanten Donor-Bridge-Patch**, nicht nur als kosmetische Korrektur.
- **Modularität:** `src/handoff/00_chat_feature_addons.js` bündelt verschiedene Verantwortlichkeiten und sollte später fachlich aufgeteilt werden, aber erst nach abgenommener Klangäquivalenz.
- `source-index.json` ist gegenüber den P7-Moduländerungen nicht regeneriert. Der Index ist ein bekanntes weiteres QA-Thema; Node-/TS-Tooling des Quellarchivs im Testcontainer teilweise nicht installiert.
- Keine Audioausgabe-/Latenzmessung auf Opera/PipeWire, kein Langzeittest mit hoher Nodal-Last, kein vollständiger Projekt-Library-Roundtrip in diesem Lauf. Nicht als erfüllt ausgeben.
- Kein unabhängiger Beleg, dass der zweite, stabilere Bass-Grid-Lauf CPU einspart: bestätigte Cache-Invariante **ist kein gemessener CPU-Gewinn**.

## Empfohlene Integration / Checkpoints
A. 00 isoliert reviewen: Installation Sound On/Off, BallToneLevel/RootLevel, alte Nodal-/Audio-Ownership. Unerwünschte Basistransferänderungen aussortieren statt Änderungen massenhaft zu akzeptieren.
B. 01–08 in Reihenfolge anwenden; die durchgehenden SHA-Gates schützen vor falsch zugeordneten Source-ZIPs.
C. 09 optional als test-only Patch ergänzen. Danach die 3 neuen Tests ausführen.
D. Historische Preservation-Tests **nach** dem Nachweis der erwarteten funktionalen Deltas neu spezifizieren. Keine Hash-Blindaktualisierung.
E. Erst wenn Opera-Hörtest reproduzierbare Auffälligkeiten zeigt: fokussierten Codex-Audit im betroffenen Pfad verwenden.

## Lokale Testbefehle

```bash
node tests/p7_live_grid_space_behavior.cjs .
node tests/p7_core_smoke_without_preservation.cjs .
node tests/p7_unchanged_source_boundary.cjs . /pfad/zur/entpackten/originalbasis/n21-f2 /pfad/zum/entpackten/handoff/patches
node build.cjs --verify
```

Die Testskripte benötigen die Patch-Stufe 09. Beim Quellgrenzen-Test immer einen separaten **originalen** Nodal-Ball-Grid-Stand übergeben; er darf kein gepatchter Stand sein.
