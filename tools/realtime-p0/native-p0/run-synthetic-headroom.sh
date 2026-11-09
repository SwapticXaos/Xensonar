#!/usr/bin/env bash
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
OUT="$HERE/artifacts"
RUNS="${1:-5}"
mkdir -p "$OUT"
cc -O3 -fno-builtin -std=c11 -Wall -Wextra \
  "$HERE/src/p0_native_synthetic_headroom.c" -lm \
  -o "$OUT/p0_native_synthetic_headroom"
: > "$OUT/P0N_SYNTHETIC_HEADROOM_RUNS.ndjson"
for ((i=1;i<=RUNS;i++)); do
  "$OUT/p0_native_synthetic_headroom" >> "$OUT/P0N_SYNTHETIC_HEADROOM_RUNS.ndjson"
done
python3 - "$OUT/P0N_SYNTHETIC_HEADROOM_RUNS.ndjson" "$OUT/P0N_SYNTHETIC_HEADROOM_SUMMARY.json" <<'PY'
import json, statistics, sys
src, dst = sys.argv[1:]
runs=[json.loads(x) for x in open(src) if x.strip()]
counts=[8,16,32,64]
summary=[]
for count in counts:
    rows=[next(s for s in r['scenarios'] if s['bodies']==count) for r in runs]
    def med(k): return int(statistics.median([x[k] for x in rows]))
    summary.append({
      'bodies':count,
      'medianP50Ns':med('p50Ns'),
      'medianP95Ns':med('p95Ns'),
      'medianP99Ns':med('p99Ns'),
      'worstObservedMaxNs':max(x['maxNs'] for x in rows),
      'medianP99QuantumPct':statistics.median([x['p99QuantumPct'] for x in rows]),
      'worstObservedMaxQuantumPct':max(x['maxQuantumPct'] for x in rows),
    })
out={
 'schema':'xensonar.p0n.synthetic-headroom-summary.v1',
 'physicalAudio':False,
 'performanceGate':False,
 'claim':'repeatability-profile-only; host scheduling outliers are not xruns',
 'runs':len(runs),
 'sampleRate':runs[0]['sampleRate'],
 'blockFrames':runs[0]['blockFrames'],
 'bodyDefinition':runs[0]['bodyDefinition'],
 'scenarios':summary
}
open(dst,'w').write(json.dumps(out,separators=(',',':'))+'\n')
print(json.dumps(out,separators=(',',':')))
PY
# Validate every raw run independently; this checks schema/separation, not performance.
while IFS= read -r line; do
  tmp="$(mktemp)"; printf '%s\n' "$line" > "$tmp"
  "$HERE/validate-synthetic-headroom.py" "$tmp" >/dev/null
  rm -f "$tmp"
done < "$OUT/P0N_SYNTHETIC_HEADROOM_RUNS.ndjson"
printf 'synthetic-headroom-profile-pass %s\n' "$OUT/P0N_SYNTHETIC_HEADROOM_SUMMARY.json"
