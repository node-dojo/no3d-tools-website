#!/usr/bin/env python3
"""Build a subsetted Doto variable font (wght 100–900) for the website.

Requires fonttools: pip install fonttools

Source static masters (non-rounded / squared dots) default to the PIXEL FONT LIBRARY
path. Override with DOTO_STATIC_DIR.

Usage:
  python3 scripts/build-doto-font.py
  DOTO_STATIC_DIR=/path/to/Doto/static python3 scripts/build-doto-font.py
"""

from __future__ import annotations

import os
import subprocess
import sys
import tempfile
from pathlib import Path

from fontTools.designspaceLib import AxisDescriptor, DesignSpaceDocument, SourceDescriptor
from fontTools.varLib import build

REPO_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_STATIC_DIR = Path(
    os.environ.get(
        "DOTO_STATIC_DIR",
        "/Users/joebowers/Library/CloudStorage/Dropbox/Caveman Creative"
        "/NFT_ Caveman/PIXEL FONT LIBRARY/Doto/static",
    )
)
OUTPUT = REPO_ROOT / "fonts" / "doto.woff2"

MASTERS = [
    ("Doto-Thin.ttf", 100),
    ("Doto-Regular.ttf", 400),
    ("Doto-Medium.ttf", 500),
    ("Doto-SemiBold.ttf", 600),
    ("Doto-Bold.ttf", 700),
    ("Doto-ExtraBold.ttf", 800),
    ("Doto-Black.ttf", 900),
]

# Latin + Latin-1 supplement — matches site copy and UI strings
UNICODE_RANGES = "U+0020-007E,U+00A0-00FF"


def build_designspace(static_dir: Path) -> DesignSpaceDocument:
    ds = DesignSpaceDocument()
    axis = AxisDescriptor()
    axis.tag = "wght"
    axis.name = "Weight"
    axis.minimum = 100
    axis.default = 400
    axis.maximum = 900
    ds.addAxis(axis)

    for filename, weight in MASTERS:
        path = static_dir / filename
        if not path.is_file():
            raise FileNotFoundError(f"Missing master font: {path}")

        src = SourceDescriptor()
        src.path = str(path)
        src.name = f"master_{weight}"
        src.designLocation = {"Weight": weight}
        src.copyLibdata = weight == 400
        src.copyInfo = weight == 400
        ds.addSource(src)

    return ds


def main() -> int:
    static_dir = DEFAULT_STATIC_DIR
    if not static_dir.is_dir():
        print(f"Static font directory not found: {static_dir}", file=sys.stderr)
        print("Set DOTO_STATIC_DIR to your Doto/static folder.", file=sys.stderr)
        return 1

    ds = build_designspace(static_dir)
    vf, _, _ = build(ds)

    with tempfile.NamedTemporaryFile(suffix=".ttf", delete=False) as tmp:
        vf_path = tmp.name

    try:
        vf.save(vf_path)
        OUTPUT.parent.mkdir(parents=True, exist_ok=True)
        subprocess.run(
            [
                sys.executable,
                "-m",
                "fontTools.subset",
                vf_path,
                f"--unicodes={UNICODE_RANGES}",
                "--layout-features=kern,liga",
                f"--output-file={OUTPUT}",
                "--flavor=woff2",
            ],
            check=True,
        )
    finally:
        os.unlink(vf_path)

    size = OUTPUT.stat().st_size
    print(f"Wrote {OUTPUT} ({size:,} bytes)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
