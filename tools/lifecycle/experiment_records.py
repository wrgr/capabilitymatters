"""Keep scorecard and iteration sidecars immutable without modifying original execution journals."""
from __future__ import annotations

import json
import os
from pathlib import Path
import re
import tempfile
from typing import Any

SAFE_ID = re.compile(r"[A-Za-z0-9][A-Za-z0-9_-]{0,159}\Z")


def identifier(value: Any) -> str:
    """Reject path-like identifiers before accessing the local record store."""
    if not isinstance(value, str) or not SAFE_ID.fullmatch(value):
        raise ValueError("Invalid saved-record identifier")
    return value


def hash_value(value: Any) -> str:
    """Hash canonical finite JSON for content-bound immutable records."""
    from scorecard_contract import stable_hash
    return stable_hash(value)


def write_immutable(path: Path, value: dict) -> None:
    """Atomically create an immutable record or accept an exact idempotent repeat."""
    path.parent.mkdir(parents=True, exist_ok=True)
    text = json.dumps(value, indent=2, ensure_ascii=False, allow_nan=False) + "\n"
    if path.exists():
        if read_record(path) != value:
            raise ValueError("An existing record cannot be overwritten; create a new iteration")
        return
    with tempfile.NamedTemporaryFile(mode="w", encoding="utf-8", dir=path.parent, delete=False) as stream:
        temporary = Path(stream.name)
        stream.write(text)
        stream.flush()
        os.fsync(stream.fileno())
    try:
        try:
            os.link(temporary, path)
        except FileExistsError:
            if read_record(path) != value:
                raise ValueError("Concurrent write conflicts with the saved record")
    finally:
        temporary.unlink(missing_ok=True)


def read_record(path: Path) -> dict:
    """Read a bounded JSON object and surface missing or malformed stored evidence."""
    if not path.is_file():
        raise ValueError("Saved record was not found")
    if path.stat().st_size > 20000000:
        raise ValueError("Saved record exceeds the supported size")
    value = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(value, dict):
        raise ValueError("Saved record must contain a JSON object")
    return value
