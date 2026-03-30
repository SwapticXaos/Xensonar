# Xensonar 3.1.6 – missing-root-and-core-files pack

This pack contains the files that Codex previously reported as missing or worth checking in a partial repository snapshot:

- Root build/setup files
- Main app entrypoints
- Xensonar app file
- Level3 lab room file
- Canonical forge room file

Generated helper files:
- README.md
- .gitignore

## Direct-Test Workflow

Für Frontend-Patches wird zusätzlich zur Codeänderung immer ein direkt testbares Single-File-HTML bereitgestellt:

- `Xensonar_direct_test_latest.html` (Snapshot aus `dist/index.html`)

Damit kann der aktuelle Stand ohne Build-Schritt direkt gegengeprüft werden.

