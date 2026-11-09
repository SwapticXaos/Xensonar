"""E1 compatibility gate. The E1 visual test has been superseded by E2's
stronger dual-recorder aurora pixel-coverage and reduced-motion assertions.
The old clipped red polygon was deliberately removed after user rejection.
"""
from pathlib import Path
import runpy
runpy.run_path(str(Path(__file__).with_name('test_enough_aurora_e2.py')),run_name='__main__')
