# HOLD-LIB-01..03: gemeinsame Hold-Bibliothek, Factory-Arpeggios, Theorie-Pläne

Status: CODE_PRESENT, UNIT_VERIFIED (`tests/hold_factory_patterns.cjs`), BROWSER_CHECKED (`tests/e2e/hold_library_shared.cjs`, `tests/e2e/hold_plan_theory_presets.cjs`, `hold_pattern_plan.cjs` unverändert grün).
**Nicht gehört**, nicht USER_ACCEPTED. Zone: KALT (Pattern-Speicher und Plan-Insel laden erst bei Gebrauch). Laufzeit/Hold-Planer unverändert.
Daten-Owner: Pattern-Bibliothek = bestehende IndexedDB `xensonar-thunder-hold-patterns-v1` (Schema unverändert, keine Migration); Plan-Bibliothek `xensonar-thunder-hold-pattern-plans-v1` unverändert. Factory-Zeilen werden erzeugt, nie gespeichert.

## 01 Eine Bibliothek für Enter und Keyboard
Die Auswahl „Arpeggio Patterns“ filterte nach `sourceLane`; Enter und Keyboard sahen daher getrennte Listen, obwohl eine Datenbank dahinter liegt.
Jetzt zeigen beide Tabs alle gespeicherten Patterns („Saved · shared by Enter and Keyboard“), fremde mit dem Zusatz „· from Enter/Keyboard“. Laden schreibt wie bisher nur in die offene Spur.
Gespeicherte Daten und ihr `sourceLane` bleiben unverändert (Namen sind weiter pro Spur eindeutig). Der Pattern-Teil der Plan-Ansicht zeigte schon beide Spuren.

## 02 Factory-Arpeggios (31, schreibgeschützt)
Gruppe „Factory“ in derselben Auswahl und in der Pattern-Bibliothek der Plan-Ansicht. Tonhöhen sind Cent über der gehaltenen Taste, also in jeder Stimmung gleich; Dur/Moll sind eindeutig:
Major (Dreiklang ↑ ↓ ↑↓, Alberti, maj7, Dominant 7, add9, Pentatonik, Offbeat), Minor (Dreiklang ↑ ↓ ↑↓, Alberti, m7, Pentatonik, harmonisch Moll, Offbeat),
Diminished 7, Augmented, Sus4, Sus2, Quinten-/Oktavpuls, offene Quinte, Ganzton; rein/xenharmonisch: Just major 4:5:6, Just minor 10:12:15, Obertonreihe 4:5:6:7, Neutral (350 ¢), Septimal minor 6:7:9.
Laden, ändern, dann „Save As“; Duplicate/Rename/Delete sind für Factory gesperrt (Tooltip erklärt es). Ein Pattern umfasst höchstens eine Oktave (±1200 ¢, Hold-Vorgabe).

## 03 Hold-Pattern-Pläne aus Musiktheorie (8 Presets, gruppiert)
Im Plan-Tab „Generate from preset“, jetzt in Gruppen. Figuren in **Grid-Schritten** (+2 Terz, +4 Quinte, +6 Septime, +n Periode), also folgt Dur/Moll dem Modus des Hauptraum-Grids:
- Basics: Triads · 1 3 5 8 5 3, Sevenths · 1 3 5 7 5 3 (im Dur-Modus I Dur, II Moll, VII vermindert; maj7 / m7 / Dominant 7 je Stufe).
- Jazz: walking line (2 Takte, Annäherungston), Charleston shells (3 · 7 · 5 mit Swing und echten Pausen), functional colours (Tonika / Subdominante / Dominante mit eigenem Muster und Slotzahl).
- Baroque: Alberti-Bass, Präludium-Figur 1 3 5 8 5 3 5 8, Fugenstimmen (I Subjekt, V Beantwortung einen Slot später, II VI Episode als Terzsequenz, III IV VII Kontrasubjekt synkopiert).
Rollen lesen die Position als Stufe einer 7-Stufen-Sicht (Position × 7 ÷ Stufenzahl); bei anderer Stufenzahl (19-EDO, Pentatonik) laufen sie ohne Fehler, die Schritt-Arithmetik ergibt dann „jede zweite Stufe“-Stapel.

## Offen
- Hören: Wirkung von Swing/Mikrotiming-Werten, Pegelverhältnisse der Slots und Klang gegen Entrophon/Sample/Nodal sind nicht beurteilt.
- Theorie-Presets nehmen Quarten/Sexten nicht auf (nur Terzstapel, Skalenläufe); mehr Figuren (z. B. Kadenzfolgen über mehrere Stufen) sind erweiterbar.
- Rollback: Commit davor (08b2c60).
