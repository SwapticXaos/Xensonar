# XenSonar: Warum das Projekt existiert und wie sich seine Bedienung anfühlen soll

## Instrument statt gewöhnlicher sequenzierter DAW

XenSonar ist ein offener digitaler Klangraum. Verschiedene Instrumenten-/Generatormodelle, Drone/Particle/Root-Follow-Bezüge, Nodal-/Spectral-Forge-Materialien, Drumsequenzen, Klangparameter, Aufnahme und Bearbeitung sollen **komponierbar** bleiben. Es gibt keine Norm, nach der andere Musikbegriffe nur Abweichungen von 12 Halbtönen und 4/4 wären.

## Klang- und Zeitverständnis

- Harmonische Zahlenverhältnisse, mikrotonale/alternative Stimmungen und verschachtelte Bezugsstrukturen sind erstklassige Konzepte.
- Polyrhythmisches Timing bedeutet veränderbare Beziehungen: N:D, N-in-M, markerverschobene Unterteilungen, freie Zeit/Beat- oder Millisekundenmodelle, odd und asymmetrisch. Standards dürfen als schnelle Presets vorhanden sein, aber nicht als versteckte Einschränkung.
- Effektparameter können frei/fließend sein; sinnvolle Snapshots und schnelle Schritte ergänzen die Freiheit, ersetzen sie nicht.
- Dub Echo: Transienten, Schläge, Markerspuren und das aktive Timing beeinflussen das rhythmische Gefühl. Die aktuell implementierten DUB03-Begriffe stehen in `docs/STATUS_AND_PROVENANCE.md`.

## UI-Grundsätze (aus der Nutzerarbeit)

- Der **Aufmerksamkeitsweg** ist entscheidend: Nutzer erkennt → handelt → sieht/hört sofort die Rückmeldung, nahe der ausgelösten Funktion.
- Mehrere passende Zugänge dürfen sinnvoll sein, aber keine verwirrenden Duplikate eines Owners oder durch einen zweiten Speicherweg konkurrierende Einstellungen schaffen.
- Konsistente visuelle Unterscheidung von Steuerelementen, symbolhafte Orientierung, gute Touch-/Desktop-Geometrie und einfache Rücknahme (Undo) sind wichtiger als Dekoration.
- Kleines überraschendes Feedback kann Entdeckung fördern; es muss vom tatsächlichen Funktionswechsel getragen sein. Keine übertriebenen Animationen/Confetti, die Klang und Bedienung überlagern.
- Zentrale Hauptaktionen (z.B. Paste/Mixpaste, Download, Save, Record, Preset Load, Undo/Redo) müssen End-to-End funktionieren. Ein bestandener Edge-Case-Test beweist nicht den zentralen Bedienweg.
- Wenn Layoutvarianten verglichen werden sollen: **alle Varianten in EINER eigenständigen offlinefähigen HTML mit direktem Umschalter und gleicher Geometrie** liefern, nicht mehrere Dateien.

## Ökonomie der Änderungen

Stabilisierung, Beseitigung technischer Schulden, Kontrolle redundanter Strukturen und Performance sind erwünschter als das ständige Beginnen neuer unfertiger Features. Neue Synthesizer sollen vorhandene Verträge nutzen, nicht in konkurrierende Systeme ausweichen. Die endgültige Wertung einer Verbesserung ist spielerisch-praktisch: Kann ein Mensch sie finden, verwenden und musikalisch sinnvoll erleben?
