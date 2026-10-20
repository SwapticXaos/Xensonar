# XenSonar – Codex Review-Sammlung (20.10.2026)

## Was dieses Paket ist
Eine **Sammlung der erhaltenen Entwicklungsartefakte** zur getrennten Prüfung vor Integration in den aktuellen Codex-Quellstand. Kein Unified-Repository und keine automatische Merge-Freigabe.

## Inventar und Reihenfolge
1. `01_PATCHKETTE_00_BIS_22_P7_11.zip`: vollständige erhaltene quellmodulbasierte sequenzielle Patchkette **00–22**, Anwendung nur mit korrekt gehashter N21-F2-Originalbasis; enthält Tests/Evidence, inkl. P7.10 und P7.11.
2. `02_WHITE_SCREEN_HOTFIX_P7_11_1.zip`: separater HTML-Hotfix (Syntax `aria-label`) und Fehleranalyse. **Der Hotfix ist kein eigenständiger Quellmodul-xpatch**. Codex muss die Reparatur an der richtigen modularen Quelle prüfen.
3. `03_EXPRESSION_EXPERIMENT_P7_12_NICHT_ABGENOMMEN.zip`: vier `changed_sources` (vollständige betroffene Moduldateien), Tests, README. **Kein eigenständiger Patch gegen den Codex-Branch**. Vor Übernahme modulweise Diff gegen korrekt rekonstruierte P7.11.1-Quellen erstellen. **Praktischer B-/Alt-Hörtest beim Nutzer fehlgeschlagen.**
4. `04_P7_10_REFERENZ_HANDOFF.zip`: vorheriger Referenzstand für Review/Differenzkontrolle (inhaltlich teils redundant zu 01).

## Externe, nicht verdoppelte Quellbasis
`XenSonar_N21_F2_Nodal_Ball_Grid_Quellen(1).zip` mit SHA-256:
`0ef0eb50c84eaa18df4f03fa76959e44a011e6fc6feb1599909cb9cc0bd6e4f5`.
Diese etwa 32-MB-Datei ist **nicht enthalten**. Bitte die originale Library-Datei separat heranziehen, keine ähnlich benannte Basis substituieren.

## Tatsächlicher Freigabestand
- P7.10: Referenz für die nachfolgenden Änderungen; kein Anspruch vollständiger physischer Audioprüfung.
- P7.11: kompakter Preview-Button + Expression-Kurvenänderungen; der ursprünglich gelieferte HTML-Build hatte einen **Start-White-Screen**.
- P7.11.1: HTML-Syntax-Hotfix, nachfolgend muss Codex die entsprechende Quelle sicher korrigieren.
- P7.12: Live-Expression-VCA-Versuch; strukturelle/automatische Tests reichten nicht aus; **Nutzer meldet B/Alt weiterhin funktionslos. NICHT UNGEPRÜFT MERGEN.**
- Entrophon: sporadische unbeabsichtigte Volume-Kopplung zwischen Wave-Starter- und Keyboard-Sounds weiterhin ungelöst.
- Browser-Alt: Browser-Menü/Navigation bei Alt-Eingaben beobachtet; reproduzierbare reale Opera-Abnahme offen.
- Apostroph ist eigenständiger Keyboard-Notenlängen-Controller und nicht RFL. Nicht aus Bequemlichkeit koppeln.

## Anweisung an Codex
A) Prüfe zuerst den bestehenden Hauptquellstand und sein Commit/Build/Tests; ändere dort nichts.
B) Rekonstruiere die historische Patchkette auf einer **separaten** Kopie der SHA-geprüften Originalbasis; reviewe insbesondere Patch 00 (UI-Cleanup-Basisabweichung).
C) Ermittle, welche Änderungen im Hauptzweig bereits enthalten sind, kollidieren oder neu sind.
D) Reviewe jede Stufe in einem nachvollziehbaren Status: vorhanden / übernehmen / adaptieren / teilweise / zurückstellen / verwerfen, jeweils mit Modulbezug und Testbeleg.
E) Behandele P7.11.1 als Source-Fix-Nachtrag und P7.12 als *experimentellen nicht bestandenen* Versuch, nicht als erwiesene Live-Audio-Lösung.
F) Vor jedem Merge: Syntax der vollständigen gebauten HTML, Browser-Liveness, Tastatur/Pointer/Audio-Regressionen. Ein Build-Hash ist kein Browser-/Hörbeweis.
G) Behalte Beat/Bass/Materialspur vor Sekundärereignissen; keine zusätzlichen synchronen Arbeiten im Live-Hotpath; keine Übernahme von Änderungen am RFL nur wegen Apostroph-/Keyboard-Themen.
H) Schütze die separate Lautstärke von Wave und Keyboard sowie Speicherkopplung/Instrumentzuordnung.

## Grenzen
Dieses Paket enthält alle **hier auffindbaren** Patchartefakte der Serie bis P7.12 in einer gemeinsamen Hülle, aber keine Behauptung über unbekannte/unarchivierte Zwischenänderungen, keinen Codex-Merge und keine vollständig abgesicherte Überführung der P7.12-Vollmoduldateien in differenzielle, reviewbare xpatch-Operationen.
Siehe `CHECKSUMS.json` für die konkreten Dateiprüfsummen.
