# THUNDER-HPP01 · Hold Pattern Plan (11.11.2026)

Parent: `claude/laughing-maxwell-9odnve` @ `ce6d6b7` (ROOM4-15), `index.html` 8 888 945 B, SHA-256 `c404b4ee53a724bfd86ab5a6708ec9873e705f0c3e539092978b8c8a73b28a2f`.
Ergebnis: `index.html` 8 926 522 B, SHA-256 `456cb8073be8ccd38188707c3e9e8ca96d430baf27752ad5af0551ad988dd4a7` (+37 577 B, davon 28 671 B lazy Funktionsinsel).
Rollback: Parent-Commit `ce6d6b7`.

## Idee
Bisher spielt jede Taste dasselbe Hold-Pattern. Ein **Hold Pattern Plan** gibt jeder **hörbaren Stufe einer Periode** (Oktave, Tritave, …) ein eigenes Pattern. Die Zuordnung hängt nicht an physischen Tasten: die Stufe einer Taste wird aus ihrer eigenen Frequenz bestimmt. Damit gilt der Plan auf allen Keyboard-Zeilen, im verschobenen Tastenfenster und bei Oktavsprüngen. Gemutete Grid-Stufen gehören nicht zum Plan.

Der Plan speichert sein **natives Grid** (Stimmung, Modus, Mutes, Feinstimmung, Grundton). Wird danach anders gestimmt (z. B. 22 EDO Phrygisch → 19 EDO Lydisch), spielt der Plan weiter, nach Stufenreihenfolge projiziert; die Oberfläche zeigt nur einen Hinweis („Deviation …“) mit zwei Wegen: *Restore plan Grid* oder *Adopt current Grid*. Mehr Stufen als Plan-Einträge → Positionen wiederholen sich; weniger → obere Positionen unerreichbar (grau).

## Bedienung (Keyboard-Hold → „↗ Hold Pattern Studio“)
Der bisherige Prototyp „Detailed Editor“ heißt jetzt **Hold Pattern Studio** mit zwei Ansichten:
- **Pattern** – der bisherige Editor unverändert (fretless Latte, Referenzmarken, Hz-Eingabe, Slot-Dynamik, Vorhören).
- **Plan** (nur Keyboard) – drei Spalten im Stil des Editors:
  - *Pattern library*: gespeicherte Hold Patterns (HPM) + „Current working pattern“. Ziehen auf eine Stufe, oder anklicken (= „armed“) und dann Stufen anklicken („malen“); „Fill empty steps with armed“.
  - *Leiter*: Stufen von unten (Grundton) nach oben, mit römischer Ziffer, Grid-Grad, Cent, Funktionsname bei 7 Stufen (Tonic … Subdominant, Dominant …), Mini-Pattern, ▶ Vorhören an dieser Stufe, ✕ leeren. Stufen lassen sich auf andere Stufen ziehen (kopieren). Die zuletzt gespielte Taste leuchtet (live).
  - *Plan*: aktiv/aus, Deviation-Hinweis, ausgewählte Stufe mit **technischem Namensvorschlag** („22 EDO Phrygian · IV Subdominant“, frei änderbar), *Edit in Pattern view*, *Save to library*, Plan-Bibliothek (Save As, Overwrite, Load, Delete), Presets, *Remove plan from Keyboard*.
- *Edit in Pattern view*: lädt das Stufen-Pattern in den Pattern-Editor, Vorhör-Grundton = Frequenz dieser Stufe. Banner „Store into IV / Cancel“; danach kehrt das ursprüngliche Lane-Pattern zurück (nichts geht verloren).

Presets (Generatoren in Skalenschritten, auf das aktuelle Grid aufgelöst, daher auch für Tritave/beliebige Stufenzahl): Scale triads ↑↓, Seventh arpeggios, Cadence colours, Alberti figure, Fifth & period, Neighbour shimmer, **Odd-meter walk** (je Stufe 5/7/3/4/6/5/7 Slots → Polyrhythmus über die Tasten).

## Daten-Owner
- Aktiver Plan = Arbeitskopie `nParamsUI.keyboardHoldPlan` (eigenständig: natives Grid + Pattern-Kopien, keine Verweise). Wird mit Session-Raumeinstellungen gespeichert. Sessions ohne Plan (alle bisherigen) schalten den Plan beim Laden aus (`apply` setzt `keyboardHoldPlan:null` vor dem Snapshot).
- Plan-Bibliothek: eigene IndexedDB `xensonar-thunder-hold-pattern-plans-v1` (Hold-Pattern-Speicher-DB unverändert, keine Versionsmigration). Package Station: gleiche Rubrik, jetzt „Thunder Hold-Patterns & Pläne“ (Anzahl Rubriken unverändert 28).
- Pattern-Bibliothek: bestehender HPM-Owner (`__XenHoldPatternMemory`), nur `saveAs/list/validate` genutzt.

## Heiß/Kalt
- **HEISS**: `__XenHoldPlanRuntime.forHz` läuft **einmal pro Tastenanschlag** (Keyboard-Lane). Stufentabelle nur bei Grid-Änderung neu, aufgelöste Overrides pro Eintrag gecacht (WeakMap). Die Geste trägt ihr eingefrorenes Override (`gesture.hpp`); `Nie` liest pro Geste Slots/Takte/Mutes/Volumes/Microtiming daraus – ohne Plan identisch zum bisherigen Pfad (Lane-Werte). Accessoren in `Jxe` (`w,I,E,H,V,U,X,nativeX`) nehmen optional die Geste; Resident-Hold, Nodal-Hold-Clock, Sample-Clock-Signatur und Sofortanschlag (`bPe`) lesen das Stufen-Pattern. Kein React/Storage/JSON pro Tick.
- **WARM**: Plan-Änderungen sind Klicks (ein `updateNParams`); Live-Hervorhebung per 150-ms-Intervall nur solange das Studio offen ist.
- **KALT**: Plan-Ansicht, Presets, Bibliothek und CSS liegen in der Funktionsinsel `__xenHoldPatternPlanFactory` (lädt erst beim Klick auf „Plan“; Test prüft „nicht beim Start geladen“).
- Enter-Hold bleibt unverändert (Plan nur Keyboard).

## Prüfungen
- `python3 tools/build.py --check` OK; Syntax 35 Skriptblöcke OK.
- `./tools/run_tests.sh`: **101/101** (neu: `thunder_hpp01_plan.cjs` – Stufenauflösung über Oktaven, Mutes, Feinstimmung, 13-EDT/Tritave, Wrap, Cache; `Nie` mit Plan-Geste neben Lane-Geste). Auf dem Parent rot (Funktion fehlt).
- `./tools/run_e2e.sh`: alle grün, neu `tests/e2e/hold_pattern_plan.cjs` (echte App): Insel lazy, Preset → 7 Stufen, Resolver für 5 Perioden, **echte Tastenanschläge 1–4 → Positionen 4,5,6,0** (Fensterversatz), Live-Hervorhebung, Deviation-Hinweis bei 19 EDO + Restore, Stufen-Edit/Store mit Rückkehr des Lane-Patterns, Plan Save As übersteht Reload, alter Snapshot ohne Plan → Plan aus, keine Seitenfehler.
- Proben: `hold_pattern_lazy_probe` (HPM weiter lazy, Save/List ok), `thunder_q_probe` (Q-Schalter ok; `mobileOverflow:true` ist auf dem Parent identisch).
- Screens (Desktop 1500 px, Mobil 390 px) geprüft; Mobil scrollt einspaltig.

## Status
CODE_PRESENT · UNIT_VERIFIED · BROWSER_CHECKED (Chromium headless, ohne Abhören). **Nicht geprüft:** Hören/PCM der Plan-Patterns (Synth, Sample, Nodal, Entrophon), Firefox, Hardware-Latenz, zwei gleichzeitig gehaltene Tasten mit verschiedenen Plan-Patterns im Gehör, Netlify. Nicht USER_ACCEPTED.

## Offene Punkte / Risiken
- Songs (Song-Quellen) speichern den Plan nicht separat; er reist mit den Raumeinstellungen einer Session.
- Plan-Änderung während gehaltener Taste wirkt beim nächsten Anschlag.
- Preset-Intervalle sind skalierte Schrittzahlen (Terz = 2/7 der Stufen); bei sehr großen Stufenzahlen eher „Farben“ als klassische Akkorde.
- Mehr als 64 hörbare Stufen pro Periode werden auf 64 Plan-Positionen begrenzt.

## Nachtrag HPP01b (11.11.2026): neutrales Stufenmodell statt eingebauter Tonalität
Nutzerkritik: Der Plan darf keine westliche Harmonik oder feste Stufenzahl voraussetzen. Befund: Die Stufenzahl kam schon aus dem Raum-Grid (der Screenshot zeigte 7, weil der Raum auf 12 EDO Aeolian stand). Westliche Annahmen steckten aber trotzdem im Code: automatische Funktionsnamen bei 7 Stufen (Tonic … Subdominant), Presets mit „Terz = 2/7 der Stufen“ (Triads, Sevenths, Cadence, Alberti, Fifth), römische Ziffern und eine Obergrenze von 64 Stufen.

Geändert (nur KALT, Funktionsinsel + Studio):
- **Basis = Grid des Hauptraums**, sichtbar als Karte „Basis · Main Room Grid“: Stimmung, Modus, Periode in Cent (Oktave/Tritave/frei), *k von M Stufen hörbar*, Grundton und eine Gradleiste der ganzen Periode (gemutet = dunkel). Einstellen geschieht im Raum: Knopf **Grid Workbench…** öffnet den vorhandenen Grid Workbench (kein zweiter Editor). Jede hörbare Stufe wird eine Plan-Stufe: 19 EDO chromatisch → 19, Bohlen-Pierce → 13, 31 EDO → 31 (E2E geprüft). Obergrenze jetzt 256.
- Ein Plan ohne zugewiesene Stufe folgt dem Raum-Grid automatisch; ein belegter Plan behält sein natives Grid (Deviation-Hinweis wie bisher).
- **Neutrale Benennung**: „step 7/19 · deg 6 · 379¢“. Keine Funktionsnamen aus der Stufenzahl. Optional ein **eigenes Label pro Stufe** (z. B. „Subdominante“, wo es passt), gespeichert im Plan (`labels`), ohne Einfluss auf Tonhöhe oder Wiedergabe; fließt in den Namensvorschlag ein.
- **Presets neutral, in Grid-Schritten** (+1 = nächste hörbare Stufe dieses Grids): Pulse · 0, Neighbours · 0 +1 0 −1, Run · 0 +1 +2 +3 +2 +1, Mirror, Period ÷ 3, Period ÷ 4 (Teilung der Stufenzahl), Polymeter · 3 4 5 6 7 … (Unterteilung je Stufe).
- Hauptraum: `globalThis.__XenOpenGridWorkbench` wird neben dem vorhandenen Workbench-Dialog gesetzt (öffnet nur denselben Dialog).

Unverändert: Laufzeit/HEISS-Pfad. Der Pattern-Editor bietet weiter „JI ratios“ als Start-Referenz und eine EDO-Liste als Hilfslinien (Bestand aus HPM02, nicht Teil dieses Patches).
Prüfungen: 101/101 Regressionstests, alle E2E grün (hold_pattern_plan erweitert: 19/13/31 Stufen, keine Funktionsnamen, Basis-Karte). `index.html` 8 929 514 B, SHA-256 `bdaa880eda1eac5815868322d4ad0a15719dc405a167c9d5b0c3acb007c1473d` (+2 992 B ggü. HPP01, +40 569 B ggü. Parent).

## Nachtrag HPP01c (11.11.2026): Kacheln wie im Hauptraum, Referenzliste gedreht, Konsolidierung
- **Slot-Kacheln im Studio** (Pattern-Ansicht): grün = aktiv, dunkel = gemutet, goldener Ring = Auswahl (Innenfläche bleibt grün), **roter Strich hinter der Nummer auf der Tonhöhe des Slots** (Mitte = Ausgangston, Oktave/Periode hoch = oberer Rand, runter = unterer Rand; folgt dem Ziehen auf der Leiste live). Kachelhöhe 28 → 40 px für mehr Auflösung des Strichs. Die Darstellung ist jetzt **ein Baustein** (`__xenHoldPitchSlotFace`), den Hauptraum-Kacheln und Studio gemeinsam nutzen (vorher lokale Kopie im Hauptraum).
- **„Exact reference steps“ gespiegelt behoben**: Liste läuft jetzt wie die Tonhöhenleiste von **hoch (oben) nach tief (unten)**.
- **Konsolidiert/effizienter**: Stufentabelle des Plan-Laufzeitpfads prüft pro Tastenanschlag zuerst Objektidentität (Stimmung, Grundton, Mute-/Offset-Arrays) statt einen Schlüsselstring zu bauen; doppelter Preset-Auswahlcode in der Plan-Ansicht zu einer Komponente zusammengefasst; Stufenbeschriftungen überall plan-bewusst (eigene Labels in Tooltips/Aria); Auto-Folge des leeren Plans vereinfacht.
- Prüfung: 101/101, alle E2E grün (hold_pattern_plan prüft zusätzlich Strichpositionen 50/0/100/25 % und absteigende Referenzliste). `index.html` 8 930 506 B, SHA-256 `92ed0fea4c0eec05918fbcbb3a8b64faa63de98907d19e7a0ff2164956a752b1`. Nicht gehört, nicht im Firefox geprüft.

## Nachtrag HPP01d (11.11.2026): Arpeggio Patterns speichern im Studio
- **Speichern direkt im Pattern-Bereich**: in der mittleren Spalte unten (unter „Precise tuning / Slot dynamics“) sitzt jetzt die Steuerung „Arpeggio Patterns“ (Name, Save As, Load, Duplicate, Rename, Delete). Es ist dieselbe Komponente wie im Hold-Pattern-Panel des Hauptraums (`__XenHPM01Controls`, gleicher Speicher-Owner), nur im Studio eingebettet; kein zweiter Speicherweg.
- **Plan-Ansicht**: linke Spalte heißt „Arpeggio Pattern Library“; ein im Studio gespeichertes Arpeggio steht dort sofort (Liste lädt beim Wechsel auf „Plan“). Leere Bibliothek erklärt den Weg dorthin.
- **Begriff „Arpeggio Pattern“** statt „Pattern“: Tab „Arpeggio Pattern“, „Edit in Arpeggio Pattern view“, „Current Arpeggio Pattern“, Panel-Titel/Platzhalter/Auswahlfeld.
- Titel: „Keyboard · Hold Pattern Studio (Thunder Mode)“.
- Prüfung: 101/101, alle E2E grün (hold_pattern_plan: im Studio speichern → in Plan-Bibliothek sichtbar, Titel). Keine Änderung am Klangpfad.
