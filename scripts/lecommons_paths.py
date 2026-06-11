"""Locate the wrgr/lecommons checkout that content-sync scripts read from."""

import os
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]


def lecommons_dir() -> Path:
    """Return the lecommons checkout path from $LECOMMONS_DIR, default ../lecommons."""
    raw = os.environ.get("LECOMMONS_DIR")
    path = Path(raw).expanduser().resolve() if raw else REPO_ROOT.parent / "lecommons"
    if not (path / "landscape").is_dir():
        sys.exit(
            f"lecommons checkout not found at {path} — clone "
            "https://github.com/wrgr/lecommons next to this repo or set LECOMMONS_DIR"
        )
    return path
