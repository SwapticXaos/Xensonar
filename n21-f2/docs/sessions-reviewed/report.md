# XenSonar P7.38 · Prüfbericht zur Sessions-Integration

Freigabebasis ist `10178acb733db38f1801b263ac5200d98c17e69b` auf `codex/granular-sample-hold`. Der aktive Einstieg ist `Xensonar_P7_38_Sessions_Reviewed_Test.html`. Dieser Bericht beschreibt die geprüfte Integration; die endgültigen Prüfsummen stehen im Artefaktregister.

## Ergebnis und Übergabegeschichte

Die Übergabe wurde vor der Übernahme gegen den vorhandenen Stand geprüft. Die historische Bezeichnung `e3568a8` war lokal nicht verfügbar; alle 15 geänderten alten Source-Patch-Blobs passten jedoch exakt zur tatsächlichen Basis. Der unveränderte P7.24-HTML-Stand entsprach der Übergabereferenz. Ein frischer modularer P7.37-Build erreichte exakt `18445166e19116b2267cbdaf42ab2e0a0478bed951838e37d9cc87f1338cfc86`. Der zunächst direkte modulare Port des jüngsten HTML-Stands erreichte exakt `35406409a61e3cbe8d989490b2f8dedd95ac2934205248f1873f643a1219d9bb`.

Die folgenden Korrekturen sind zusätzliche geprüfte Änderungen gegenüber dieser Referenz. Die vollständigen Entscheidungen und historischen Grenzen stehen in `docs/hover-review/source-ledger.md`; Originalmanifest, Masterlog, Runbook und empfangene Patches liegen unter `docs/hover-review/received/`. Die zwei HTML-Patches sind alternative Wege und wurden nicht nacheinander angewendet. Die ursprüngliche Referenz-HTML ist im Messdaten-ZIP unter `handoff-reference/` archiviert.

| Übergabestufe | Entscheidung | Konkretes Ergebnis |
| --- | --- | --- |
| P7.24 | Erhalten | Gespeicherte Entrophon-Zulassung, getrennte Lautstärken und bestehende Live-DSP-Verträge bleiben geschützt. |
| P7.25–30 | Übernommen, korrigiert | Sessions statt aktiver Song/Part-Oberfläche; Bearbeiten und Live-Zusammenstellung getrennt. Undo/Redo stellt auch Raum-Einstellungen und Identität wieder her. |
| P7.31–33 | Endzustand übernommen | Navigation, ursprüngliche Bibliotheken, Pfeile und Dialogbesitz bleiben erhalten; kumulative Alternativen wurden nicht gestapelt. |
| P7.34–35 | Teilweise übernommen | Materialstatus und violette Bibliothek übernommen; überholtes Grid-Verfahren mit begrenzter Notenzahl verworfen. Alle Stufen einschließlich Periodenendpunkt bleiben hörbar. |
| P7.36 | Verworfen | Timer-/Lookahead-Angriffe wurden historisch durch den vollständigen P7.37-Audiopuffer ersetzt. |
| P7.37 Rhythm | Übernommen | Ein vollständiger nativer Offline-PCM-Puffer, 155-ms-Angriffe anhand der Audiozeit, gezielter Stop und Schutz vor verspäteter Renderfreigabe. |
| Profile / Workbench | Übernommen, korrigiert | Kachelidentität getrennt von Tuning-ID; unabhängige Main-/Bass-Profile. Native Markergrafik und BP-Modusregeln; keine zusätzliche Tuning- oder Bass-Bibliothek. |
| Hover / Boot Guard | Modularisiert | Bibliotheks-Taktangaben, zwei übereinstimmende RAF-Geometrien vor sichtbarem Dock und begrenzte frühe Startdiagnose. |
| P7.24 Songs | Historischen Zugang erhalten | Gespeicherte und ungespeicherte Song/Part-Hierarchien bleiben lesbar. Expliziter einzelner Part-Import mit Herkunft und Duplikatprüfung sowie unveränderter Rohdatenexport. |

## Gezielte Härtung

Die Referenz verlor bei der Profilaktivierung teilweise Stufenänderungen durch den normalen nativen Grid-Reset. Die Profilroute übergibt jetzt das vollständige Kachelprofil an die vorhandenen Besitzer. Gleiche Tuning-IDs können unterschiedliche Modi, Main-Mutes und Bass-Profile besitzen; A→B→A erhält beide Varianten. Ein Clone schreibt eine eigene Custom-Tuning-Variation und verändert die Originalkachel nicht.

Engage prüft und sichert die beteiligten Zustände und stellt Quick Access und Raum-Einstellungen bei zurückgewiesenen Schreibvorgängen wieder her. Eine fehlgeschlagene Operation veröffentlicht keine aktive Session-Palette. Drei unabhängige Kontrollen scheiterten an der gelieferten Referenz: Profil-Reset, fehlendes Einstellungen-Undo und unvollständige Engage-Kompensation. Die korrigierte Integritätsprüfung besteht; Rohlogs und Vergleichsmanifest liegen unter `results/sessions-reviewed/source-review/`.

Die getrennten localStorage-Schlüssel und React-/externen Stores bilden keine gemeinsame Datenbanktransaktion. Auch die kompensierende Wiederherstellung kann bei einem anhaltenden Fehler scheitern; dieser Fall wird sichtbar als **Restore failed** gemeldet. Das bleibt eine begrenzte technische Schuld.

## Native Vorschauen

Grid behält den vollständigen Bowed-Glass-Puffer und verändert dafür keine Keyboard-/Wave-Klangwahl. Material nutzt den vorhandenen Standalone-PCM-Besitzer. RFL verwendet den bereits vorhandenen nativen Preview-Callback und dessen echte Klangmaschine auch bei ausgeschaltetem Haupt-Power. Die Vorschau kann dabei vorübergehend RFL-Zustand besitzen; Stop stellt vorherige Werte nur wieder her, solange diese Vorschau sie noch besitzt. Sie ist keine Session-Aktivierung und ersetzt keine Quick-Access-Sammlung. Drums und Bass nutzen ihre ursprünglichen Bibliotheksdaten und Klangwege. Generations-/Abbruchschutz verwirft überholte Vorbereitung und verhindert verspäteten Wiedereinstieg nach Stop.

Die jeweiligen Klangbesitzer bleiben maßgeblich. Der neue Adapter ist keine alternative RFL-Roh-PCM-Klangmaschine. Die vorhandenen Echtzeit-Worklets, Nodal-/Entrophon-Synthesekerne und der endgültige Master-Limiter wurden nicht ersetzt.

## Erhaltung und Prüfbarkeit

Die neue Baseline friert **208 Source-Einheiten, 28 Styles und drei Templates** exakt am tatsächlichen P7.24-Commit ein. Jede bestehende Korrektur ist mit eindeutigen Vorher-/Nachhersegmenten reversibel. Neue Source-/Style-Einheiten, die beiden Head-Erweiterungen, ihre Reihenfolge und Wrapper sowie der geänderte Builder sind exakt gehasht. Die alte Song-Source und ihr Style bleiben bytegleich vorhanden, sind aber ausdrücklich aus dem aktiven Manifest genommen. Die alte P7.24-Prüfung läuft auf der nachgewiesenen Rückprojektion; die weitere historische Prüfungskette behält ihre ursprünglichen Kontrollen.

**935 historische Pfade** einschließlich ursprünglicher Song-Tests, HTMLs, Resultate und Artefakte sowie der exakte **116-Einträge-Präfix** des bisherigen SHA256-Registers werden geprüft. Historische Ergebnisse werden nach Erfassung ihrer neuen Messwerte wiederhergestellt. Sieben negative Kontrollen erkennen unerlaubte Änderungen an unberührter Source, einer korrigierten Source, neuer und stillgelegter Source, Source-Reihenfolge, Head-Wrapper und Builder.

Originale Song-Host- und Chromium-Verträge werden weiterhin mit unveränderten Tests auf dem exakt zurückprojizierten P7.24-Stand ausgeführt. Die neue Sessions-Migration hat zusätzliche echte Origin-/Reload-Prüfungen und ersetzt diesen historischen Vertrag nicht.

## Messungen und Grenzen

Der endgültige HTML-Stand hat **5.859.506 Bytes** und SHA-256 **`64f5bda8b01595dc265f2945397b83443b123b3f3babdf7eda511f8635eaed01`**. Der gezielte Schlusslauf besteht **22/22 Prüfungen** auf diesem eingefrorenen Stand. Gegenüber der Vorprüfung änderten sich genau drei Source-Einheiten (RFL-Besitz, Meta-Menü, Sessions-Vorschau); **242 Einheiten** bleiben bytegleich und behalten ihre vollständige Vorprüfungsabdeckung.

Die ursprüngliche Hostmatrix umfasst **80/80 bestandene Zeilen**; der erste Navigator-Fixturefehler und sein gezielter erfolgreicher Nachlauf bleiben als Versuche dokumentiert. Die native Vorprüfung umfasst **25 Zeilen, zunächst 23 bestanden und zwei fehlgeschlagen**. Der unveränderte Forge-Pitch-Test bestand anschließend vollständig, einschließlich acht Engines, Detune/Off, Undo/Redo und responsivem Footer. Ein isolierter Vergleich mit unveränderter Basis `10178ac` bestand ebenfalls; reine Checkpoint-Protokollierung bestand auf beiden Ständen. Der ursprüngliche Timeout bleibt als begrenzte Aussage dieses ersten Laufs erhalten; daraus wurde kein Produktionsfehler abgeleitet. Die Sessions-Tab-Fixture verwendete getrennte Icon-/Textspans statt des gemeinsamen Produktionslabels; die korrigierte Fixture besteht mit den ursprünglichen übrigen Geometrie-/Klickkontrollen. Diese Vorprüfungen tragen ihren tatsächlichen älteren HTML-Hash; sie werden nicht als vollständiger Lauf auf dem Schlussstand ausgegeben.

Der neue native Grid-Test verwechselte zunächst verzögerte Klangteiltöne mit Notenanfängen. Die korrigierte Messung beobachtet echte Gain-Attackhüllkurven und prüft zusätzlich drei Bowed-Glass-Teiltöne pro Note. 19 EDO und Tritave bestehen mit PCM-Energie pro Stufe, 155-ms-Angriffen, Periodenendpunkt, genau einem Live-Puffer und Stop während einer absichtlich verzögerten Renderfreigabe. Auch dieser erste fehlgeschlagene Versuch bleibt in `final-validation.json` erhalten. Native Sessions-Vorschau prüft reales Ausgangs-PCM für alle drei Kategorien, stumm bleibenden abgebrochenen RFL-Taktstart, manuelle Auswahlhoheit, 19-EDO-Bass nach gleichzeitigem Grid-Wechsel, gespeichertes dreitaktiges Sample-Drum-Timing und exakt **0 PCM-Differenz** für den unveränderten Standard-Bass.

Maschinenlesbare Matrizen, Nachläufe, Unit-Deltas, Origin-/Reload-Daten, native PCM sowie Extraktions-/Patch-Paketnachweise stehen unter `results/sessions-reviewed/`. Sieben gezielte Negativkontrollen erkennen unerlaubte Erhaltungsänderungen; die historischen Song-Host- und Chromium-Verträge bestehen auf der exakt nachgewiesenen P7.24-Rückprojektion.

Im tatsächlichen Sessions-Editor werden 1490 und 720 Pixel Breite, Profil-/Bass-/Period-Dialoge, sichtbare Dock-Geometrie nach zwei RAFs, Resize, Raumwechsel und echte Fullscreen-Ein-/Austritte geprüft. Das belegt die getesteten Bedienabläufe und Geometrien, keine allgemeine Fullscreen- oder Absturzfreiheit.

Native Chromium-/WebAudio-Prüfungen belegen PCM, Besitz-/Stop-Verträge und Browserbedienung. Physische Audiogeräte, Opera/PipeWire, langfristige Last, mehrere Tabs, Hängerfreiheit und Crash-Ursachen wurden damit nicht geprüft. Die neun Sekunden begrenzte Long-Task-Diagnose ist eine Beobachtungshilfe; sie beweist keine Beschleunigung und behebt keine nachgewiesene Crash-Ursache.

Implementierung, Tests und Integration wurden über das Agentenwerkzeug mit **GPT-6.1-Sol (High)** ausgeführt; die Inventarisierung mit **GPT-6-Luna (High)**. Die Astra-Variante des Leitmodells ist technisch nicht verifizierbar. Diese Angabe dokumentiert die tatsächlich konfigurierte Modellauswahl des Agentenwerkzeugs.

## Weiterverwendung

Build und Tests: `README_P7_38_SESSIONS_REVIEWED.md`. Das Quellen-ZIP bleibt unter 32 MiB, enthält den aktiven Stand und benötigte Vergleichs-HTMLs; weitere historische HTMLs/Screenshots bleiben im Repository und in ihren bisherigen Archiven erhalten. Die neue Lieferung besteht aus aktiver HTML, Quellen-ZIP, Patch gegen `10178ac`, deutschem Bericht und Messdaten-ZIP. Die fünf neuen Prüfsummen werden an die unveränderten 116 bisherigen Einträge angehängt.
