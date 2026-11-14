# Verschlankung: Befund und erste Stufe (SLIM-01), 14.11.2026

Auftrag (Nutzer, 13.11.): bei genau gleicher Funktion und gleicher oder besserer Live-Performance deutlich schlankerer, effizienterer Code; Umbau ausdrücklich erlaubt (siehe `CLAUDE.md`).
Parent: `416977b` (`index.html` 9 132 733 Bytes). Stand nach SLIM-01: `index.html` 9 110 046 Bytes (**−22 687 Bytes**), sha256 `c1d8376fcf9409a17baad3027a8d6c83bfcb98f49e84cae31688352250d5f701`. Rollback: `416977b`.

## Das Wichtigste

**Der Code enthält kaum Ballast.** Vor dem Umbauen wurde gemessen, was sich ohne Funktionsverlust entfernen ließe. Ergebnis: zusammen unter 1,5 % der Datei. Die 9,1 MB sind Funktionsumfang (fünf Räume, mehrere Klangerzeuger, Forge-Rechenkerne, Wave-Editor, Paketstation), keine Reste.

| Was | Gemessen | Anteil an `index.html` | Stand |
|---|---|---|---|
| beweisbar unerreichbare Funktionen/Konstanten | 22,7 KB (49 Stück) | 0,25 % | **entfernt (SLIM-01)** |
| …davon zusätzlich nur wegen Tests behalten | 18 Namen | – | bleiben |
| doppelte Funktionen | 25 KB (größter Posten: Standbild-Zeichner, 2×, 15 KB) | 0,3 % | offen, kleiner Gewinn |
| CSS-Regeln, die nie greifen können | 27 KB (353 Regeln) | 0,3 % | offen, kleiner Gewinn |
| Code, der nur an versteckten Adress-Schaltern hängt (nativer Begleiter, Governor-Schalter, Post-Master-Abgriff, B5-Drums) | ca. 41 KB exklusiv | 0,45 % | offen, braucht Entscheidung |
| Kommentare und Leerraum im ausgelieferten Code | ca. 0,76 MB | 8,4 % | nur per Verdichtung beim Bauen entfernbar |
| vollständige Verdichtung der Auslieferung (Namen kürzen) | ca. 1,69 MB | 18,6 % | Entscheidung, siehe unten |

In der Browser-Suite (41 Läufe) plus einer automatischen Klick-Tour durch alle Räume (348 Klicks, 0 Seitenfehler) wurde rund die Hälfte des Codes nie ausgeführt. Die Einzelprüfung der größten Blöcke zeigt aber: Das sind echte Funktionen, die diese Läufe nur nicht erreichen (Nodal-Spieler, Forge-Rechenkerne, Drum-Editor, EQ-Panel, Echo-Panel) oder die in Worklets/Workern laufen und dort nicht gezählt werden. Kein großer Block erwies sich als Altlast.

## Wo die Rechenzeit hingeht (Headless-Chromium, 4 Kerne, Software-Rasterung)

**Start** (bis Power-Knopf ca. 1,04 s): JavaScript 0,64 s, davon React-Aufbau und erste Layout-Berechnung. Ein vermuteter Bremser im Standbild-Overlay (104 ms in `setPower`) wurde gegengeprüft: Es ist die ohnehin nötige erste Layout-Berechnung; verschieben bringt nichts (6 Läufe: 719 ms → 770 ms lange Tasks, also kein Gewinn). Nicht geändert.

**Spielbetrieb** (25 s, Standard-Session, Maus bewegt): JavaScript nur **6,4 %** der Hauptthread-Zeit. 24 % sind Zeichnen im Browser selbst (hier ohne Grafikkarte gerechnet; auf einem Rechner mit GPU deutlich weniger). Größter JS-Posten: das Zeichnen der Partikelspuren (`O2e`, 2 %). Kein langer Task, kein Storage-Zugriff.

Folgerung: Der Hauptthread ist nicht der Engpass. Was im Spiel tatsächlich stören kann, ist der bekannte Punkt aus dem Audit: pro Drum-Schlag und Bass-Note werden Audioknoten erzeugt (21 bis 33 pro Sekunde in der Standard-Session, unter Last 63 bis 74 Graph-Änderungen pro Sekunde). Das ist die Ursache der veralteten Worklet-Uhr, die bisher an drei Stellen abgefangen wurde.

## SLIM-01: was jetzt geändert ist

- 49 beweisbar unerreichbare Funktionen und Konstanten in 33 Quelldateien entfernt (Zone: keine Laufzeitwirkung; gelöschter Code konnte nie laufen). Größte: `tse`, `kpe`, `__XenLegacySongImport`, `Cpe`, `sQe`, `__xenM6ApplySelectedRemoval`, `__forgeDisplayDonor`.
- Beweisführung: jede Funktionsdeklaration, Klasse und Konstante mit nebenwirkungsfreiem Anfangswert ist ein Knoten; lebendig ist, was von ausgeführtem Code aus erreichbar ist, auch über die per `eval` geladenen Räume. Tote Zyklen werden mit erfasst. Nach dem Löschen findet das Werkzeug nichts mehr.
- Vorsichtsregeln nach einem Fehlversuch: Namen, die in Tests als Wort vorkommen, bleiben auf jeder Ebene (ein Test schnitt Quelltext an `const DB=`); Kommentare werden nur zusammen mit Funktionen entfernt und nur, wenn sie kürzer sind als diese.
- Werkzeuge: `tools/slim/` (siehe dortige README). `CLAUDE.md`: Umbau-Regel nach Nutzerentscheidung neu gefasst.

Tests: `build.py --check` OK, `run_tests.sh` 119/119, `run_e2e.sh` alle 41 Läufe grün (gegen den bereinigten Stand). Nicht gehört (es wurde kein ausführbarer Code verändert).

## Was „deutlich schlanker“ tatsächlich bedeuten würde

Aufräumen allein bringt es nicht. Es bleiben drei Wege, alle sind Entscheidungen:

1. **Auslieferung verdichten** (Quelltext bleibt lesbar, nur die gebaute `index.html` wird kleiner): −8 % ohne jedes Risiko für das Verhalten (nur Kommentare/Leerraum), bis −19 % mit gekürzten Namen. Über das Netz (gzip) 2,67 → 2,25 MB. Kosten: Der Build braucht dann Node; etwa ein Dutzend der 119 Regressionstests lesen Text in der gebauten Datei und müssten auf die Quellen umgestellt werden. Die App wird dadurch nicht schneller spürbar, nur die Datei kleiner.
2. **Funktionen streichen, die nicht in der Oberfläche vorkommen** (versteckte Schalter für nativen Begleiter und Motor-Experimente, XMEM-Labor, Diagnose-Dialoge): geschätzt 0,1 bis 0,25 MB. Nur sinnvoll, wenn der Nutzer sicher ist, dass er sie nie braucht.
3. **Teilsysteme neu und kompakter bauen.** Hier liegt der eigentliche Gewinn für das Spielgefühl, nicht für die Dateigröße: Drum- und Bass-Stimmen mit festen, wiederverwendeten Knoten statt neuer Knoten pro Schlag. Das nimmt die Ursache der Uhr-Sprünge weg (statt sie in jedem Worklet abzufangen), spart Speicherbewegung im Spiel und macht den heißen Pfad einfacher. Es ist ein Eingriff in den Audiopfad und braucht PCM-Vergleich vorher/nachher und Abhören.

Empfehlung: Weg 3 als nächstes Vorhaben, weil nur er die Live-Performance verbessert; Weg 1 nur, wenn die Dateigröße selbst stört; Weg 2 nach Rückfrage.
