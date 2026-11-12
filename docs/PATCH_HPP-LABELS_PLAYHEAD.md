# HPP-LABELS · HOLD-PLAYHEAD · HPP-SAVE · HPP-AUDITION

Parent: `975ea86`. Status: CODE_PRESENT, UNIT_VERIFIED, BROWSER_CHECKED (Chromium headless). **Nicht gehört.** Nicht USER_ACCEPTED.

## HPP-LABELS: Befund „zwei Bezeichnungen, mal Bebop, mal Major …“
Es gibt **keine automatische Akkorderkennung**. Die Wörter kamen aus den **Stufen-Labels der Factory-Pläne** („V bebop“, „I major“, „ii m7“ …): ein Label wurde mit dem Plan fest an die Stufe geschrieben. Ersetzte man das Arpeggio der Stufe (eigener phrygischer Lauf), blieb das alte Wort stehen und sagte etwas anderes als das, was spielt. Das Label flossen außerdem in den vorgeschlagenen Namen („… · I major“) beim „Save to library“.
Fehler im Denkmodell, nicht Bedienfehler: ein Label beschrieb das Arpeggio statt die Stufe.
- Factory-Plan-Labels sind jetzt **nur Stufennamen** (I … VII), sie sagen, *wo* die Stufe liegt. *Was* dort spielt, steht beim Arpeggio der Stufe (sein Name, z. B. „Mode · Phrygian run ↑“ oder „My phrygian run“) und wird mit ihm ersetzt.
- Pläne, die mit der früheren Version angelegt/gespeichert wurden, behalten ihre Labels. Wird das Arpeggio einer solchen Stufe ersetzt, verschwindet ein altes Factory-Beschreibungs-Label automatisch; eigene Labels bleiben.
- Test: Labels = Stufennamen; `assign` löscht „V bebop“, behält „my label“, setzt den neuen Arpeggio-Namen.

## Planname im Hauptraum
Im Keyboard-Hold-Tab stand nur „Plan active (7/7 steps)“. Jetzt: „↗ Hold Pattern Studio · Plan: <Name> (7/7 steps)“, Tooltip mit vollem Namen. Die Stufen-Nummern/-Labels darunter wie gehabt.

## HOLD-PLAYHEAD: goldener Rand auf der spielenden Karte
Der Hold-Planer merkt sich pro ausgeliefertem Puls Spur, Slot, Slotzahl und ob die Figur aus dem Plan kommt (fünf Zuweisungen, HEISS-Pfad ohne Allokation). Das Panel (nur bei offenem Tab) liest das per `requestAnimationFrame` und setzt/entfernt die Klasse `xen-hold-playing` direkt am Karten-Element (kein React-Render pro Puls). Die Karte hat einen goldenen Rand und läuft mit dem Arpeggio mit; sie wird nur beleuchtet, wenn die gezeigte Reihe die spielende Figur ist (Plan-Stufe gezeigt ↔ Plan-Figur, Lane ↔ Lane-Pattern, gleiche Slotzahl) und verlischt, sobald nichts mehr spielt. Gilt für Keyboard- und Enter-Tab.
Test: Taste halten → höchstens eine Karte leuchtet, mindestens 3 verschiedene Slots werden im Lauf besucht, danach keine.

## HPP-SAVE: „Save changes to …?“ statt stillem Ersetzen
Die Plan-Ansicht merkt sich, wie der aktive Plan beim Laden/Anlegen/Speichern aussah. Wird er geändert (Stufen umbelegt, Label, „Store into IV“ …) und dann ein anderer Plan geladen („Load“), „Fill every step with one figure“ oder „Remove plan from Keyboard“ gewählt, erscheint eine Abfrage **„Save changes to “<Plan>”?“** mit **Save / Discard changes / Cancel**. Save überschreibt den gespeicherten Plan; Factory- oder neue Pläne werden unter „<Name> (edited)“ gespeichert (nie über einen Factory-Namen). Cancel lässt alles, wie es ist.
Wiederhergestellte Sessions ohne bekannte Ausgangsform fragen nicht (es gibt nichts, womit man vergleichen könnte).

## HPP-AUDITION: Vorhören im Kontext (gestapelt)
Jede Stufe klingt aus **ihrer eigenen Tonhöhe** über einem gemeinsamen Grundton: Stufe k bei Grundton × 2^(Cent_k/1200), die Figur relativ dazu (wie die Tasten im Live-Raum).
- Neu in der Plan-Ansicht: Feld **Audition root (Hz)** (Standard = Grundton des Plans, „Plan root“ setzt zurück; ändert den Plan nicht) und **▶ All steps**: spielt die Figuren aller Stufen nacheinander, je einen Takt, jede von ihrer Stufe aus, damit man die Stufen zueinander hört.
- Das Vorhören nutzte bisher das aktuelle Raum-Grid statt des Plan-Grids und faltete den Ton in 130–520 Hz; jetzt gilt das Plan-Grid mit dem gewählten Grundton.
- Test: Grundton 110 Hz; Stufe V einzeln und alle 7 Stufen nacheinander starten von 110 × 2^(Cent_k/1200) × Figur-Anfang; die Stufen steigen.

## Offen
- Hören: Gleitgefühl und Pegel unverändert unbeurteilt; die Vorhör-Klangquelle ist die vorhandene „warm reference“/Sample/Nodal des Studios (nicht der Psy-Lab-Synth).
- Eine Plan-Änderung im Studio, die über „Save changes“ gespeichert wurde, schreibt in dieselbe Plan-Bibliothek (kein neues Format, keine Migration).
- Rollback: `975ea86`.
