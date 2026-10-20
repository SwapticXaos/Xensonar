# XenSonar P7 – Architektur, Eingriffe, Tests, offene Gates

**Quellenrelation:** Vom 19.10.2026 **N21-F2 Nodal Ball Grid** über die explizite Zwischen-Basis-Bridge zu den Refucktor-/Grid-/Live-Patches dieses Chats. Dieser Handoff aktualisiert die älteren P5/P6/P7-Berichte, ersetzt deren Annahme einer direkten unveränderten HTML-Ausgangsbasis und bezieht sich exakt auf das neu hochgeladene Codex-Archiv.

## A. Warum dieser Rebase benötigt wird

Der bisherige Chat lieferte nacheinander gebündelte, eigenständig startbare HTML-Artefakte. Diese konnten zwar im Browser getestet werden, waren aber **keine nativen Diffs der 206+ modularen Quelldateien** aus dem Codex-Archiv. Die Original-Build-Reihenfolge stammt aus `source-manifest.json` und `build.cjs`. Der neue Handoff überführt die Änderungen rückwirkend **in die ursprünglichen Module**; neue, vor das erste Modul eingeblendete Codeblöcke werden in `src/handoff/00_chat_feature_addons.js` abgetrennt und per `source-manifest.json` eingetragen.

Das ist ein historisch exakter, **reproduzierbarer Port** des bisherigen P7-Verhaltens, noch keine tiefgreifende Codebereinigung. Codex sollte die danach sichtbaren Änderungen gezielt refaktorieren und bei Bedarf das neue Add-on fachlich auf die richtigen Module verteilen. Dabei gilt: erst Laufzeit-Äquivalenz belegen, dann Strukturänderungen.

## B. Verantwortlichkeiten und Architekturgrenzen

**Refucktor Drone:** Der ursprüngliche Mai-Donor (Referenz 3.2.91.7.5.106) wird als tatsächlicher Synthese-/Effektgraph verwendet. Dark Sub / Ethereal Halo, Grundtonregler (zwei tiefe Oktaven), optionales Snap. Der historische Donor besitzt zwei Oszillatoren im 3:2-Verhältnis, LFO, Tiefpass, Verstärkung, mehrstufiges Echo und Kompressor. Die vorherige Hauptraum-Drone-Engine wird bei den transplantierten Presets klanglich abgegrenzt; keine zusätzliche Root-Follow-Drone. Später Wobble- und Mute-Raster, Drive/Flanger, Cursor-Follow optional. Unveränderte Stimme soll bei Parameterbewegung nicht neu instanziiert werden.

**Derived/Linked Bass Grid:** Das Hauptraster bleibt musikalische Keyboard-/Wellenstarter-Quelle. Ein abgeleitetes Fundament kann Tonstufen muten und punktuell verstimmen. Alternativ verweist es auf ein anderes Tuning aus Active Selection / Library, ohne dieses Raster zu kopieren und ohne **zweite** Cent-Offset-Ebene. Die gemeinsamen Zielinstrumente Bass, Drone und RFL sind unabhängig schaltbar; Partikel bleiben ihrem Wellenstarter-/Partikelsystem zugeordnet. Grid-Kompilierung außerhalb des Audio-Attacks, vorberechnete Frequenzzuordnung zur Laufzeit. Bei `Link to Other Grid` dürfen Haupt-Grid-Änderungen nicht unnötig Neuaufbereitung auslösen. **RFL** quantisiert Transpositions-/Root-Ziele, nicht einzelne Stimmen in bereits gerenderten Mehrklang-Audiodateien.

**Keyboard/Kopplung:** Keyboard-Noten werden weiterhin auf dem Hauptraster bestimmt. Wenn RFL/Bass/Drone das Basis-Grid verwenden, werden ihre Ziele aus der tatsächlichen Keyboard-Root auf den nächsten erlaubten Ton abgebildet. **Space (gehalten)** trennt die Keyboard-Tonhöhenbewegung vom harmonischen Fundament; nach Loslassen kein Catch-up auf die während Space gespielte Note. B und linkes Alt ändern in P7 den dynamischen Pegel **neu ausgelöster** Keyboard-Töne, nicht die Verstärkung bereits laufender Stimmen; AltGr wird nicht als linkes Alt behandelt. Die Legende und Hover-Hinweise zeigen die Tastenzuordnungen an.

**Live-Lifecycle/Forge:** Power Off soll Echo-Feedback unmittelbar abregeln, ohne gespeicherte Drone-Pattern zu verlieren. Drone-Workbench-Snapshot über Reload, einschließlich Wobble-Kurven, Rhythmus, Frequenz/Effekten. In der Spectral Forge spielt der ▶-Knopf links von `Save as Sample` dieselbe ausgewählte Navigatorregion in der gewählten Hörweise vor. Power-/Echo-/Region-Preview-Änderungen beeinflussen weder RFL-DSP/Ownership noch Apostroph-Notenlänge.

**UI-Doktrin:** Keine vertikale Verdrängung des Save-Buttons. Das Bass-Grid-Panel wird rechts direkt unter dem Schließen-X **überlagert** statt im Kopflayout zusätzlichen Platz zu beanspruchen. Drei unabhängige englische Zuordnungs-Checkboxes (Bass/Drone/RFL), kein überflüssiger vierter Master-Enable. Intervallhilfe im Hover (`~5th` statt `5`, sonst Gefahr Bruchzahl), weitere gebräuchliche Intervalle, aufsteigende Hörvorschau ab tiefster Tonstufe. Kein neues generelles UI-Grid.

## C. Nachweise **dieses** Rebase-Laufs (nicht historisch)

1. Ausgangs-ZIP gegen übergebenes Archiv und Quellbuild geprüft: Source-Build-SHA-256 `e8e63ffe...98313884d`.
2. **Neun** aufeinanderfolgende Quellmodul-Patches jeweils SHA-256-gated angewendet. Jede resultierende Quelle über `source-manifest.json` assembliert und **auf den Hash der historischen jeweiligen Chat-HTML** verglichen: 9/9 bestanden. Änderungsumfang/Dateiliste in `evidence/STAGES_AND_MODULES.json`.
3. Mit dem **originalen `node build.cjs`** aus den aktualisierten modularen Quellen exakt P7 nachgebaut: SHA-256 `bc0260682088a3a37a7bf9637d634b8027bc121b2546cb9b520a9760d94c002d`, **5.672.609 Bytes**. `node build.cjs --verify`: **PASS**.
4. Aus der reproduzierten HTML das eigentliche JavaScript-Modul extrahiert und mit `node --check` geprüft: **PASS**.
5. `tests_verify_final_contract.py`: exakter HTML-Hash und **13 gezielte strukturelle Eigenschaften PASS**.
6. `npm run test:live-stability`: **PASS** (RFL-Crop, Native-Fallback, Lifecycle, Materialfenster 44.1/48/96 kHz). Hinweis: Diese Suite untersucht spezialisierte RFL-Bausteine, **keine tatsächliche Opera-Audioausgabe**.
7. Bereits vorhandener `test_p7_contract.py` auf der ursprünglichen P7-HTML: **16 strukturelle Assertions PASS**.

### Noch nicht grün

`npm run test:merge` bricht in der nachgepatchten Quelle **am ersten veralteten Preservation-Hash** ab (`tests/nodal-ball-grid-preservation.cjs`, `src/nodal/07_sound_designer.js`). Dieser Test garantiert in der Codex-Basis explizit, dass dort gar nichts geändert wurde; die separat deklarierte Stage **00 BASE_BRIDGE_UI_CLEANUP** verändert dieses Modul aber absichtlich. Daher ist das zunächst ein **Baseline-Konflikt**, keine nachgewiesene funktionale Regression. Codex muss den Unterschied in Stage 00 einzeln reviewen, die Erwartung begründet neu definieren **und anschließend** den kompletten Merge-/Preservation-Test erneut ausführen. Nicht durch bloßes Aktualisieren aller erwarteten Hashes als erledigt markieren.

### Belege aus den älteren Einzelpatch-Berichten – nicht hier erneut reproduziert

- Original-Refucktor P2: historisch OfflineAudioContext-PCM-Gleichheit für Dark Sub und Ethereal Halo berichtet, jeweils 144.000 Samples mit maximal 0 Abweichung; auf aktueller Codex-Basis in diesem Handoff **nicht** neu offline gerendert.
- Refucktor Drone Workbench P3: AudioNode-Wobble/Step-Kurven, 16+16 Raster, Mute-/Curve-Scheduler, Drive und Flanger im früheren Browser-/Offline-Test berichtet.
- Bass Grid P1–P4: ursprüngliche Browser-/Node-Prüfungen für Mutes, Cent-Offsets, Bibliotheksexport, 12-/17-EDO, unabhängige Instrumentenzuordnungen; neuer Handoff hat diese durch exakte Nachbildung der historischen HTML belegt, aber die ursprünglichen Browser-Abläufe nicht nochmals vollständig durchgespielt.
- P5/P6/P7: Browserprüfungen früher protokolliert für Power/Echo, Reload-Persistenz, Forge-Preview, Space-Hold und B/Alt-Expression. Die historischen Testskripte liegen **als Provenienz**, teils mit alten `/mnt/data`-Pfaden, unter `evidence/historical_test_sources/`. Sie sind nicht als portables neues CI-Gate auszugeben.

## D. Offene Prüfungen und Codex-Härtung (priorisiert)

1. **Stage-00-Abstammung prüfen:** Das hochgeladene `Nodal_Ball_Grid`-Projekt ist nicht die unmittelbare Byte-Basis des Drone-Piloten. Änderungen an Nodal-Raum, Installation-Sound, Audio-Ownership und Rhythmusmodulen separat mit Codex-Hauptzweig vergleichen. Nur die gewünschten Anteile übernehmen.
2. **Regression-Gates gegen tatsächliche Quelländerungen aktualisieren:** `test:merge` Preservation-Hashes, `source-index.json`, `source-manifest`-Quellindex. Nicht pauschal Tests abschalten.
3. **UI in Opera/Ubuntu:** Grid-Overlay unter dem X ohne Save-Verschiebung; Hover/Intervallhilfen; Dropdowns und Z-Index; linke Alt-Taste (Desktop-Menu) und AltGr-Grenze.
4. **Musikalische Live-A/B:** Dark Sub/Ethereal Halo und neue Wobble-Effekte bei Beat + RFL; Dauerlauf ohne Burst und ohne zusätzliche Neuinstanziierung pro Renderframe. Lasttests Nodal-Wellenstarter separat; kein vorschneller Umbau der bestehenden R19-Live-Ownership.
5. **Keyboard/Root-Routing:** schnelle Keyboard-Glissandi ohne Cursorkollision, Space halten/loslassen mit Bass-Grid 9-/12-/17-EDO, RFL-C11/Legacy-Fallback, Snap-Monotonie, Ties/Hysterese; keine Doppelquantisierung.
6. **P5-Lifecycle:** Power aus/an bei aktivem Echo, keine Feedbackschleife; Persistenz nach Reload/Projektwechsel/Import; Forge-Navigator-Preview exakt für den gewählten Ausschnitt, Stop/Reentrant-Preview.
7. **Bibliotheksdaten:** Grid-ID statt bloßem Index, Löschen referenzierter Tunings, portable Library- und Projekt-Roundtrips, keine stille Rückkehr zu 12-EDO. Kein „Linked Offset“ zur zweiten Cent-Ebene.
8. **Runtime-Performance:** Der vermeintliche CPU-Gewinn durch seltener wechselnde Bass-/RFL-Grids ist bislang eine **zu testende Hypothese**, keine belegte Messung. Prüfen, dass vorberechnete Tabellen bei unverändertem Fremd-Grid nicht neu gebaut werden und keine zusätzlichen AudioParam-Operationen im Keyboard-Attack entstehen.
9. **Ausdrucksdynamik P7:** B/Alt beeinflussen bisher die nächsten Anschläge, nicht die bereits laufenden Stimmen. Ein Live-VCA wäre **ein weiterer Patch** mit gesonderter Worklet-/Voice-Lifecycle-Absicherung, nicht stillschweigend Teil dieser Übernahme.

## E. Regeln für Code-Übernahme

- Präziser Scope: Bass/Drone/RFL-Grid-Ziele und Keyboard-Kopplung; **Apostroph-Notenlänge, Beat-/Bass-Vorfahrt, Materialspur, RFL-Audiokern und C11-Worklet** nur ändern, wenn ein konkreter Test eine Regression belegt.
- Vorfahrt: Beat + Bass + Materialspur; überfällige Wellenstarter-/Partikelereignisse **verwerfen, nicht nachholen**; keine UI-Messung auf Kosten des Live-Attacks.
- Kein einmaliger „Mega-Merge“: Stufen gegen Codex-Quellbasis in Reihenfolge reviewen; nach jedem Themenblock Build und Domänen-Tests.
- Nach gesicherter funktionaler Äquivalenz darf Codex die neu vorangestellte `src/handoff/00_chat_feature_addons.js` sauber nach Verantwortung aufteilen. Nicht parallel ein neues Tuning-Subsystem erfinden.
- Der Handoff erstellt **keinen Vollquellstand**. Die akzeptierte Quellbasis bleibt das vom Nutzer übergebene Archiv bzw. Codex-Repository.


## F. P7.1 Test-Konsolidierung (nachträglich, ohne Klangänderung)

Patch 09 ist ausschließlich test-only. Neue echte Runtime-Datenstrukturtests: 17 PASS. Zusätzlicher Quellgrenzentest: 216 Dateien byteidentisch, 20 deklarierte Änderungen und 1 Add-on. Zehn bereits vorhandene Funktionssuiten auf P7 separat PASS. **Keine Aussage über volle Merge-Gates oder Opera-Audioabnahme.** Details und Reproduktion: `P7_1_KONSOLIDIERUNGSBERICHT.md`.


## Nachtrag P7.2 – aktuelle QA- und Metadatenfreigabe

Der alte Hinweis „source-index.json noch nicht neu erzeugt“ ist durch **Stufe 10** überholt: Der Index wird jetzt als kleiner differenzieller Quellmetadatenpatch aktualisiert und mit einem Generator-Paritätstest geprüft. Die bisherigen Funktionspatches 00–08, die P7-HTML und die Tests aus 09 bleiben unangetastet. Zusätzlich gibt es einen exakten unabhängigen In-Memory-Replay aller Funktionsspans, einen Ball-Grid-Kontrolltest sowie den Source-Index-Freshness-Test. Ergebnisse und offene Risiken: `P7_2_STABILISIERUNG_BERICHT.md`.
