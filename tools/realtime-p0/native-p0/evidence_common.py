#!/usr/bin/env python3
"""Small shared primitives for P0 native evidence validators.

This module intentionally knows nothing about musical semantics.  It only
standardizes check accumulation, NDJSON loading, exact-row selection and
result emission so validators cannot drift in their bookkeeping.
"""
from __future__ import annotations
import json
from pathlib import Path

class CheckSet:
    def __init__(self):
        self.count = 0
        self.failed: list[str] = []

    def add(self, name: str, condition) -> bool:
        self.count += 1
        ok = bool(condition)
        if not ok:
            self.failed.append(str(name))
        return ok

    def extend(self, pairs) -> None:
        for name, condition in pairs:
            self.add(name, condition)

    @property
    def passed(self) -> bool:
        return not self.failed

    def result(self, claim: str, **extra):
        return {
            'pass': self.passed,
            'claim': claim,
            'checks': self.count,
            'failed': list(self.failed),
            **extra,
        }

def load_ndjson(path: Path):
    rows=[]
    for lineno,line in enumerate(path.read_text(encoding='utf-8').splitlines(),1):
        line=line.strip()
        if not line: continue
        try: rows.append(json.loads(line))
        except json.JSONDecodeError as exc:
            raise ValueError(f'invalid-json:{path}:{lineno}:{exc}') from exc
    return rows

def exactly_one(rows, typ: str):
    found=[r for r in rows if r.get('type')==typ]
    if len(found)!=1:
        raise ValueError(f'expected-one-{typ}-got-{len(found)}')
    return found[0]

def write_json(path: Path, result) -> None:
    path.write_text(json.dumps(result,separators=(',',':'))+'\n',encoding='utf-8')
