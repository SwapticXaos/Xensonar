# Tatsächlicher Dateivergleich: DUB02 → 09.11.2026

- DUB02 Parent SHA-256: `be56213d6713bf35ea5478614132138ecc1b1f6b655a455805b713669ca834d7`
- Aktuelle HTML SHA-256: `e4fcc0852649c84e7c00c3b251d6dbbb89f11e2af88ae153d2e6723d898deb29`
- Dateigrößen: DUB02 **8,541,529 Bytes**, DUB03/LIVEGUARD02 **8,555,619 Bytes**
- JavaScript-Blöcke je **32**; geändert: **[10]** (0-basiert; die Hauptanwendung).
- CSS-Blöcke je **77**; geändert: **[20]**.
- `git diff --no-index --numstat` meldet: `365	245	/mnt/data/{handoff_inputs/XenSonar_W31_AF01_ML01_KH04_DUB02_index.html => handoff_work/index.html}`.
- Die neue Haupt-HTML-Metadatenzeile nennt `DUB-ECHO-03+RACK-LIVE-01+NPARAMS-GATE-01`.
- Nachweisbare neue Konstrukte: `__xenDrumEchoTimes`, `__xenDrumEchoGrid`, `__xenDrumEchoTempo`, `__xenDrumEchoCurve`, `__xenNParamsPublish`, `__XenRange`, neue Rack-Echo-Controls.
- DUB03 bietet Bruch **des Bars**, aktiven Segmentmarker, freie **Millisekunden**, Feel, links/rechts-Polyrhythmik, Cross-Feed, Throw und Spin; das ist **nicht** das identische Bedienmodell von DUB02. **Keine** unbesehene Rückübertragung von DUB02-Parametern oder UI.
- Ein auffälliger technischer Unterschied: DUB02 dokumentiert eine **19,5-s**-DelayNode-Grenze. Im DUB03-Code ist `__xenDrumEchoMaxSec=3.9` gesetzt. **Nicht automatisch als Bug oder kompatibles Verhalten bewerten**; Audio-Graph/Memory/UX und gewünschten Umfang untersuchen, bevor diese Konstante geändert wird.
- Der neue Parameter-Liveguard setzt die Werte sofort in der Live-Referenz, begrenzt aber React-Render + Persistenz auf ~80-ms-Pässe. Er benutzt einen `__XenRange`-Adapter für die Thumb-Darstellung. Prüfe die konkreten Besitzer und Hook-Lifecycle, bevor weitere Regler integriert werden.

Dieser Bericht ist ein **statischer Quellvergleich**, kein Nachweis, dass die neue Laufzeit nach dem letzten DUB03-Edit vollständig im Browser getestet wurde.
