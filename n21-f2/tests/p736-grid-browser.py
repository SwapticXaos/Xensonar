"""Compatibility entrypoint: the former P7.36 oscillator-start proxy is obsolete.
P7.37 measures the COMPLETE native AudioBuffer PCM, not merely OSC start times.
"""
import runpy
from pathlib import Path
import json
runpy.run_path(str(Path(__file__).with_name('p737-grid-pcm-browser.py')),run_name='__main__')
