# ROOM4-03c: Multitrack-Clip → WAV Editor → Apply & Return (EDIT-RETURN-01 + SCISSORS-01)

Der Patch kommt von außen (GPT, `XenSonar_ROOM4-03c_isolated.patch`), dazu der Handoff `XenSonar_ROOM4-03c_Claude_Handoff.md`. Er wurde in den Quellbaum übernommen; zusätzlich gibt es eine kleine Korrektur auf Nutzerwunsch.

| | |
|---|---|
| Basis | ROOM4-03b, `index.html` SHA-256 `e00039c3…7653` (Commit `6ed9ea1`) |
| Patch auf Kopie von 03b | `git apply` sauber, Ergebnis SHA-256 `2e72893d…230c` = Manifest |
| Übertrag in den Quellbaum | 16 Hunks, jeder eindeutig einer Quelldatei zugeordnet. Der Build ergab **byte-identisch** `2e72893d…230c`. |
| Abweichungen vom gelieferten Patch | (1) Der Seitentitel bleibt wie bisher, statt „…Roundtrip TEST“; das Meta-Tag `xensonar-room4-roundtrip` bleibt erhalten. (2) Scroll-Korrektur, siehe unten. |
| Ergebnis | `index.html` 8 675 664 Bytes, SHA-256 `719bd1ea418a726adaa825e597f934364464d549a6105ee3ce90bb2fa218dc09` |
| Zone | KALT (Forge, Editor). Das Rendern des Clips ist offline. Die Wiedergabe ist unverändert. |
| Daten-Owner | Materialbibliothek (`__registerDurableMaterial`): neues Material statt Überschreiben. Raum-IV-Projekt `xensonar-multitrack-v1`: Clip-Tausch mit Konfliktprüfung. |
| Status | CODE_PRESENT, **BROWSER_CHECKED in der vollen App** (Headless-Chromium). Nicht: Abhören, Gerät, Firefox/Safari, USER_ACCEPTED. |

Geänderte Quelldateien:
- `src/post-oct/033-xen-multitrack-shared.js` (`sendBlob` mit `enqueue`, `__XenMultitrackRoundTrip`)
- `src/post-oct/032-xen-room-multitrack.js` (Menüpunkte, Clip-Render, Rückkehr, Undo)
- `src/post-oct/015-xen-wave-editor-w01-modules.js` (Knopf „Apply & Return“, `close()` bricht den Roundtrip ab)
- `src/rooms/lab.js` (Editor an den Roundtrip-Token binden)
- `src/rhythm/02_bass_and_rack.js` (Raumnavigation)
- `styles/post-oct/072-xen-scissors-offline-ui.css` (Scherensymbol)
- `src/index.template.html` (Meta-Tag)

## Korrektur: Ankunft im WAV Editor

Beim Öffnen eines Clips aus Raum IV wird die Seite so gescrollt, dass die **blaue Masken-Leiste direkt am oberen Rand** steht. Die Zeile „Wave Editor / Source options“ ist dabei nicht sichtbar.

Umgesetzt in `src/rooms/lab.js` nach dem erfolgreichen Binden, nur für Roundtrip-Anfragen. Gemessen: Oberkante der blauen Maske bei 2 px, die Kopfzeile ist ausgeblendet.

## Prüfung in der vollen App (`node tools/probes/multitrack_roundtrip_probe.js`, neu)

Der 03c-Ersteller konnte die volle App nicht testen (`ERR_BLOCKED_BY_ADMINISTRATOR`). Hier lief sie:

| Schritt | Ergebnis |
|---|---|
| Stereo-WAV importieren, Clip duplizieren (2 Clips, gleiches Material) | ok |
| Rechtsklick auf Clip 1 | „Move to now (cursor)“ und „Open in WAV Editor…“ vorhanden, Scheren-SVG am Menüpunkt |
| Open in WAV Editor | Forge öffnet sich, Editor „Stereo“, Knopf „Apply & Return to Multitrack“ neben „Send to Multitrack“, blaue Maske oben (2 px) |
| Reverse, dann Apply & Return | zurück in Raum IV; weiterhin 1 Spur (keine neue); Clip 1 hat ein **neues Material**; Start und Spur unverändert; Clip 2 (gleiches Ursprungsmaterial) **unverändert** |
| Strg+Z in Raum IV | Clip 1 zeigt wieder auf das Ursprungsmaterial |
| `multitrack_probe.js`, `multitrack_send_probe.js` | alle Schritte unverändert, keine Fehler |

**Noch offen (Handoff-Liste, nicht automatisiert geprüft):**
- Konflikt mit einem zweiten Tab;
- Mono-Quelle;
- längenändernde Effekte;
- **Schutz eines vorher ungespeicherten Forge-Audio-Import-Stands.** Das Öffnen ersetzt die Quelle im Audio-Import, wie es auch „Send to Editor“ tut. Siehe Empfehlung 2.1 in `docs/ROOM4_EMPFEHLUNGEN_NACH_03c.md`.

## Rückweg

ROOM4-03b (`e00039c3…`). Neue Materialien aus Roundtrips bleiben normale Bibliothekseinträge.
