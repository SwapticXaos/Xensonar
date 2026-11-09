#!/usr/bin/env node
// Current-line compatibility alias.
// The audit objects formerly lived in src/features/xensonar/diagnostics/*.
// Since 3.2.91.7.5.137 they are tool-owned sediment and this legacy check
// delegates to the source/tools boundary guard.
import './check-burst-diagnostics-source-audit-sediment-boundary.mjs';
