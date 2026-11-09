#!/usr/bin/env python3
import json
import sys
from pathlib import Path
from evidence_common import CheckSet, load_ndjson, exactly_one, write_json



def validate(lifecycle_path: Path, n1_path: Path):
    lifecycle_rows=load_ndjson(lifecycle_path)
    n1_rows=load_ndjson(n1_path)
    checks=CheckSet()

    life=exactly_one(lifecycle_rows,"driver-lifecycle")
    checks.extend([
        ("lifecycle-backend", life.get("backend")=="pipewire"),
        ("lifecycle-physical", life.get("physicalAudio") is True),
        ("lifecycle-first-callback", int(life.get("firstCallbacks",0))>0),
        ("lifecycle-format", life.get("formatPass") is True),
        ("lifecycle-restart-format", life.get("restartFormatPass") is True),
        ("lifecycle-stop-quiescent", life.get("stopQuiescent") is True),
        ("lifecycle-restart", life.get("restartPass") is True),
        ("lifecycle-pass", life.get("pass") is True),
    ])

    begin=exactly_one(n1_rows,"selftest-begin")
    checks.extend([
        ("n1-backend", begin.get("backend")=="pipewire"),
        ("n1-physical", begin.get("physicalAudio") is True),
        ("n1-format-pass", begin.get("formatPass") is True),
        ("n1-callback-seen", begin.get("callbackSeen") is True),
        ("n1-rate-48000", int(begin.get("actualSampleRate",0))==48000),
        ("n1-stereo", int(begin.get("channels",0))==2),
        ("n1-quantum-known", int(begin.get("actualBlockFrames",0))>0),
    ])

    stalls=[r for r in n1_rows if r.get("type")=="stall"]
    expected=[100,250,500,1000]
    checks.add("n1-stall-set", [int(r.get("ms",-1)) for r in stalls]==expected)
    rate=int(begin.get("actualSampleRate",0))
    quantum=int(begin.get("actualBlockFrames",0))
    for r in stalls:
        ms=int(r.get("ms",-1))
        frame_delta=int(r.get("frameAfter",0))-int(r.get("frameBefore",0))
        callback_delta=int(r.get("callbacksAfter",0))-int(r.get("callbacksBefore",0))
        expected_frames=(rate*ms)//1000 if rate>0 else 0
        minimum_callbacks=max(1, expected_frames//quantum) if quantum>0 else 1
        checks.extend([
            (f"stall-{ms}-pass", r.get("pass") is True),
            (f"stall-{ms}-callbacks-progress", callback_delta>0),
            (f"stall-{ms}-callback-cadence", callback_delta>=minimum_callbacks),
            (f"stall-{ms}-frames-progress", frame_delta>0),
            (f"stall-{ms}-frame-time-quantized", quantum>0 and frame_delta+quantum>=expected_frames),
            (f"stall-{ms}-queue-stable", int(r.get("queueDepthAfter",-1))==int(r.get("queueDepthBefore",-2))),
            (f"stall-{ms}-transport-no-catchup", int(r.get("transportStartsAfter",-1))==int(r.get("transportStartsBefore",-2))),
            (f"stall-{ms}-budget-stable", int(r.get("renderBudgetMissesAfter",-1))==int(r.get("renderBudgetMissesBefore",-2))),
            (f"stall-{ms}-xrun-stable", int(r.get("xrunAfter",-1))==int(r.get("xrunBefore",-2))),
            (f"stall-{ms}-device-errors-stable", int(r.get("deviceErrorsAfter",-1))==int(r.get("deviceErrorsBefore",-2))),
            (f"stall-{ms}-owner-open", int(r.get("ownerClosed",1))==0),
        ])

    end=exactly_one(n1_rows,"selftest-end")
    checks.extend([
        ("n1-end-pass", end.get("pass") is True),
        ("n1-end-physical", end.get("physicalAudio") is True),
    ])

    device=exactly_one(n1_rows,"device-status")
    checks.extend([
        ("device-backend", device.get("backend")=="pipewire"),
        ("device-rate", int(device.get("sampleRate",0))==48000),
        ("device-stereo", int(device.get("channels",0))==2),
        ("device-quantum", int(device.get("quantum",0))>0),
        ("device-callback", int(device.get("callback",0))>0),
        ("device-xruns-zero", int(device.get("xrunCount",-1))==0),
        ("device-errors-zero", int(device.get("processErrors",-1))==0),
    ])

    return checks.result("physical-pipewire-n1-evidence-validation",
        negotiatedRate=int(begin.get("actualSampleRate",0)),
        negotiatedChannels=int(begin.get("channels",0)),
        lastObservedQuantum=int(device.get("quantum",0)),
        stallDurationsMs=[int(r.get("ms",-1)) for r in stalls],
    )


def main():
    if len(sys.argv)!=4:
        print(f"usage: {sys.argv[0]} LIFECYCLE.ndjson N1.ndjson OUTPUT.json", file=sys.stderr)
        return 2
    try:
        result=validate(Path(sys.argv[1]),Path(sys.argv[2]))
    except (OSError,AssertionError,ValueError) as exc:
        result={"pass":False,"claim":"physical-pipewire-n1-evidence-validation","failed":[str(exc)]}
    write_json(Path(sys.argv[3]),result)
    print(json.dumps(result,separators=(",",":")))
    return 0 if result.get("pass") else 1

if __name__=="__main__":
    raise SystemExit(main())
