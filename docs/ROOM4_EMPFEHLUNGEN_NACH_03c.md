# XenSonar · Multitrack – Empfehlungen nach ROOM4-03c

**Stand:** 10. November 2026  
**Ausgangsbasis:** ROOM4-03b (unverändert), ROOM4-03c (separater Testkandidat)  
**Zweck:** Priorisierte Empfehlungen und mögliche Folgepatches für die Weiterarbeit mit Claude/GitHub.

## 1. Aktuelle Prioritäten

Der Multitrack-Raum beginnt, mit den anderen XenSonar-Bereichen einen zusammenhängenden Produktionsworkflow zu bilden. Die nächsten Schritte sollten deshalb zunächst **Zuverlässigkeit, Datenintegrität und saubere Übergänge** stärken, bevor größere neue Funktionen hinzukommen.

| Priorität | Vorschlag | Geschätzter Aufwand | Begründung |
|---|---|---|---|
| P1 | WAV-Editor-Roundtrip vollständig absichern | Klein–mittel | ROOM4-03c muss auch bei Unterbrechungen und bestehenden Arbeitsständen zuverlässig bleiben. |
| P1 | Schutz vor Datenverlust beim Laden und Speichern | Klein–mittel | Spuren und Clips dürfen nicht stillschweigend verloren gehen. |
| P1 | Tempoänderung während der Wiedergabe korrigieren | Klein | Der Playhead darf nicht springen. |
| P1 | Automatische Beat-Erkennung am Dateianfang korrigieren | Klein | Der erste Beat darf nicht versehentlich übersprungen werden. |
| P1 | Mixdown absichern und Signalweg-Parität prüfen | Mittel | Fehlende Quellen dürfen nicht unbemerkt fehlen; Export soll der Wiedergabe entsprechen. |
| P1–P2 | Materialreferenzen in der Package Station schützen | Mittel | Verwendete Audiodaten sollen nicht versehentlich gelöscht werden können. |
| P2 | Stereo-/Mono-Information im Clip-Inspektor | Sehr klein | Sofortige Orientierung über Quellmaterial. |
| P2 | Tempo-Fit und Originalgeschwindigkeit konsistent definieren | Mittel | Klare Trennung von Wiedergaberate und Zeitbindung. |
| P2 | Audio-Cache und Langzeit-Looping absichern | Klein–mittel | Stabilität bei langen Sessions. |
| Später | Pitch-erhaltendes Time-Stretching | Größer | Tempo und Tonhöhe unabhängig kontrollieren. |

Die Aufwandsangaben sind grobe qualitative Einschätzungen, keine verifizierten Schätzungen für den aktuellen GitHub-Stand.

---

## 2. ROOM4-03c zuerst vollständig abschließen

### 2.1 Ungespeicherte Arbeit im WAV-Editor schützen

Wenn ein Clip aus Multitrack in den WAV-Editor geöffnet wird, darf ein dort bereits vorhandener, ungespeicherter Arbeitsstand nicht unbemerkt verdrängt werden.

**Vorschlag:** Vor dem Laden eines neuen Clips prüfen, ob tatsächlich ungespeicherte Änderungen vorliegen. Nur dann eine Entscheidung verlangen. **Kein pauschaler Dialog bei jedem Raumwechsel.**

### 2.2 Bearbeitungskontext sichtbar machen

Der WAV-Editor sollte erkennen lassen, dass er gerade von einem konkreten Multitrack-Clip aus aufgerufen wurde.

**Mögliche Kennzeichnung:**

> ✂️ Multitrack Clip · Track 3 · Bar 12

Damit wird der Unterschied zwischen den zwei bestehenden Wegen deutlich:

| Aktion | Wirkung |
|---|---|
| **Send to Multitrack** | Material als neuen Clip auf einer zusätzlichen bzw. wiederverwendbaren leeren Spur anlegen. |
| **Apply & Return to Multitrack** | Bearbeitung auf eine neue Materialversion anwenden und ausschließlich den zuvor ausgewählten Clip aktualisieren. |

Wichtige Invarianten: **Spur und Clipposition erhalten; ursprüngliches Material und andere Clips unverändert; bei Konflikten nicht stillschweigend überschreiben; Undo und Abbruch korrekt behandeln.**

Im bisherigen ROOM4-03c-Handoff ist außerdem zu prüfen, ob beim Öffnen aus Multitrack der *gerenderte Clipausschnitt* (einschließlich Wiedergaberate/Offsets/Wiederholungen) übergeben wird, aber Spurlautstärke und Spur-EQ nicht eingebrannt werden. Diese Semantik sollte im Editor erkennbar sein.

---

## 3. Clip-Inspektor: Materialdaten und Herkunft deutlicher anzeigen

Eine dezente technische Informationszeile würde die Orientierung verbessern:

- `Stereo · 48 kHz · 00:12.8`
- `Mono · 44,1 kHz · 00:03.4`

Die **Bittiefe** nur anzeigen, wenn das ursprüngliche Dateiformat sie zuverlässig liefert. Internes Float-PCM ist nicht automatisch gleichbedeutend mit der ursprünglichen Datei-Bittiefe.

Eine zusätzliche Trennung könnte die Herkunft sichtbar machen:

- **Source:** `Atmosphere_04.wav`
- **Clip:** `Atmosphere_04 · Edit 2`

Die Quelle ist ein Materialobjekt; ein Clip ist dessen konkrete Verwendung im Arrangement. ROOM4-03c macht diese Unterscheidung besonders relevant, weil einzelne Verwendungen unabhängig bearbeitet werden können.

---

## 4. Zeitmodell: Wiedergabegeschwindigkeit von Zeitbindung trennen

Die bisherigen Wiedergabearten **Original Speed**, **Bars × Beats** und **Source Tempo** sind hilfreich, vermischen aber teilweise zwei getrennte Eigenschaften:

1. **Wie schnell** wird das Audio abgespielt?
2. **Woran ist die Länge bzw. Position des Clips gebunden?**

Beispiel: Eine zehn Sekunden lange Aufnahme kann bei einer Tempoänderung entweder zehn Sekunden lang bleiben oder ihre Länge in Beats beibehalten.

### Langfristiger Vorschlag

| Eigenschaft | Mögliche Einstellungen |
|---|---|
| Wiedergabe | Original, Tape-Fit, Source-BPM, Pitch-Preserve |
| Zeitbindung | Absolute Zeit, musikalische Beats |

Damit könnten frei laufende Soundlandschaften neben metrisch gebundenen Rhythmen existieren, ohne dass eine umfassende neue Polymetrik-Timeline nötig wäre.

**Reihenfolge:** Zuerst die bekannte Inkonsistenz bei *Original Speed* nach Tempoänderungen korrigieren. Die umfassende Trennung erst danach als eigenständigen Erweiterungsschritt betrachten.

---

## 5. Mixdown: Übereinstimmung mit der Wiedergabe herstellen

Bisher unterscheiden sich die Echtzeit- und Offline-Signalwege: Die Echtzeitwiedergabe verwendet die Material-Lane-Infrastruktur, während der Offline-Mixdown einen einfacheren Audio-Graphen nutzt.

**Ziele:**

- EQ und weitere relevante Parameter im Echtzeit- und Offline-Pfad konsistent anwenden.
- Fehlende oder nicht dekodierbare Materialien **vor** dem Mixdown erkennen.
- Keinen vermeintlich erfolgreichen Export zulassen, der unbemerkt Clips auslässt.
- Eine klar verständliche Fehlermeldung ausgeben, wenn ein Export nicht vollständig möglich ist.

Grundsatz: **Was man im Arrangement hört, sollte grundsätzlich auch das sein, was man exportiert.**

---

## 6. Package Station: Multitrack-Referenzen schützen

Ein Material aus Spectral Forge kann in mehreren Clips verwendet werden; ein einzelner Clip kann über den WAV-Editor eine abgeleitete Version erhalten.

Die Package Station sollte deshalb wissen, **welche Materialien von welchen Arrangements/Clips referenziert werden**.

Mögliche Hinweise:

> Verwendet in: Multitrack · 5 Clips

> Keine aktiven Verwendungen gefunden

Diese Informationen dienen der bestehenden Aufgabe der Package Station: Bestand sichtbar machen, Abhängigkeiten bewahren und gezieltes Löschen ermöglichen. **Keine zusätzliche Materialbearbeitung in der Package Station.**

### Backup

Ein WAV-Mixdown ist **kein editierbares Projektbackup**. Ein vollständiges Multitrack-Projektpaket müsste die Arrangement-Struktur sowie die dazugehörigen Materialreferenzen und – für einen portablen Export – die benötigten Audiodaten beinhalten.

---

## 7. Optionale spätere Funktion: Split Stereo to Dual Mono

Der aktuelle Standard bleibt richtig: Eine importierte Stereodatei wird als **ein Stereo-Clip auf einer Spur** behandelt.

Als zusätzliche Kontextmenüaktion wäre später denkbar:

**Split Stereo to Dual Mono**

Dadurch könnten die linken und rechten Kanäle als getrennte Clips/Spuren unabhängig bearbeitet werden.

Diese Funktion ist **keine unmittelbare Priorität**. Das Kontextmenü sollte nach dem neuen WAV-Editor-Roundtrip nicht sofort durch weitere Optionen überladen werden.

---

## 8. Was jetzt nicht priorisiert werden sollte

- **Kein grundlegender UI-Umbau:** Die neuen horizontalen und vertikalen Navigationsleisten zunächst praktisch erproben.
- **Keine neue Effektsammlung für Multitrack:** Vorhandene XenSonar-Werkzeuge über verlässliche Übergänge nutzbar machen.
- **Kein vollständiger Ableton-Nachbau:** Multitrack soll vorhandene XenSonar-Klangwelten kombinierbar machen, nicht alle anderen Räume duplizieren.
- **Keine sofortige komplizierte Polymeter-Timeline:** Zuerst den bestehenden Zeitbezug technisch sauber definieren.
- **Keine ungetestete Ausweitung von Spur-/Clipgrenzen:** Grenzen müssen zunächst konsistent durchgesetzt und ohne Datenverlust behandelt werden.

---

## 9. Vorschlag für Folgestände

| Version (Vorschlag) | Schwerpunkt | Charakter |
|---|---|---|
| **ROOM4-03c** | WAV-Editor-Roundtrip, Scheren-Symbol | Bestehender Testkandidat; in Claude/GitHub integrieren und real testen. |
| **ROOM4-03d** | Roundtrip absichern, bestehenden WAV-Editor-Arbeitsstand schützen, Clip-Herkunft anzeigen | Nur falls nicht direkt bei der 03c-Integration gelöst. |
| **ROOM4-04** | Projektgrenzen, Tempowechsel, Beat-Erkennung, Playback-Lifecycle | Gezielter Stabilitätspatch. |
| **ROOM4-05** | Mixdown-Parität, Materialreferenzen, Datensicherheit | Architektur- und Integrationspatch. |
| **Später** | Pitch-Preserve, Stereo-Split, erweitertes Zeitmodell | Musikalischer Ausbau. |

Die Versionen ab 03d sind **Planungsvorschläge**, keine bereits existierenden Builds.

---

## 10. Weiterführender Architekturgedanke

XenSonar ist historisch nicht als eine einzige durchgeplante DAW entstanden. Unterschiedliche musikalische Systeme wurden entwickelt, verworfen, integriert oder transformiert:

- die frühe Kunstinstallation als wichtige erhaltene Entwicklungslinie;
- der daraus mitgeprägte heutige Live Room;
- die ursprünglich separat entwickelte, später integrierte Spectral Forge;
- der innerhalb XenSonars entstandene Melodic Loop;
- der WAV-Editor als Bearbeitungsumgebung;
- Multitrack als neuer Arrangement- und Integrationspunkt.

Eine mögliche langfristige Stärke liegt in **nichtdestruktiven Herkunftsbeziehungen**: Ein Clip könnte außer seiner WAV-Referenz auch den Ursprung im Melodic Loop oder einem Klanggenerator kennen. Später wäre damit eine Rückkehr nicht nur zur Wellenform, sondern zur ursprünglichen musikalischen Struktur denkbar.

**Das ist eine konzeptionelle Perspektive, kein Auftrag für den nächsten Patch.** Vorrang haben robuste Materialidentitäten und verlässliche Datenverträge.

---

## 11. Konkrete nächste Aktion für Claude

1. ROOM4-03c in den aktuellen GitHub-Quellstand integrieren und dabei ROOM4-03b als unveränderte Vergleichsbasis behalten.
2. Den Roundtrip mit echten Audiodaten testen: Clip öffnen → WAV-Editor bearbeiten → Apply & Return → nur ursprünglichen Clip aktualisieren.
3. Insbesondere vorhandene Editor-Arbeitsstände, Stereo/Mono, Undo, Abbruch, Materialidentitäten und parallele Änderungen prüfen.
4. Danach die bereits identifizierten Stabilitätsprobleme angehen: Ladegrenzen, Tempowechsel, Beat-Phase am Dateianfang und Mixdown mit fehlenden Materialien.
5. Erst danach größere Architektur- oder Musikfunktionen erweitern.

### Entscheidungssatz

> **Nicht Multitrack möglichst schnell größer machen, sondern den bestehenden Funktionsumfang so stabil integrieren, dass musikalische Absicht, Wiedergabe, Speicherung und Export zuverlässig übereinstimmen.**

---

*Dieses Dokument fasst die Empfehlungen aus dem Chat nach ROOM4-03c zusammen. Es ist ein Entwicklungs- und Handoff-Dokument, keine Behauptung, dass alle genannten offenen Punkte bereits auf dem neuesten GitHub-Stand erneut verifiziert wurden.*
