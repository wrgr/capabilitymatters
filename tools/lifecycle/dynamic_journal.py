"""Retain one atomic canonical journal with pinned inputs and a verifiable event chain."""
from __future__ import annotations

import copy
import json
import os
from contextlib import contextmanager
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Iterator

from dynamic_contract import digest, identifier, require, text_hash, validate_config


def now() -> str:
    """Return an explicit UTC timestamp for a retained operation."""
    return datetime.now(timezone.utc).isoformat()


def atomic_json(path: Path, value: Any) -> None:
    """Replace the single source-of-truth snapshot only after flushing complete bytes."""
    temporary = path.with_name(path.name + ".next")
    with temporary.open("x", encoding="utf-8") as handle:
        json.dump(value, handle, ensure_ascii=False, indent=2, allow_nan=False)
        handle.write("\n")
        handle.flush()
        os.fsync(handle.fileno())
    os.replace(temporary, path)


@contextmanager
def locked(directory: Path) -> Iterator[None]:
    """Refuse concurrent writers instead of risking duplicate calls or lost events."""
    lock = directory / ".dynamic-write-lock"
    try:
        lock.mkdir()
    except FileExistsError as error:
        raise ValueError("Run has an active or interrupted writer; inspect it before continuing") from error
    try:
        yield
    finally:
        lock.rmdir()


def append(run: dict, kind: str, phase: str, actor: str, payload: dict) -> dict:
    """Append a hash-linked event to an in-memory transaction."""
    event = {"seq": len(run["events"]) + 1, "at": now(), "kind": kind, "phase": phase,
             "actor": actor, "payload": copy.deepcopy(payload),
             "prev_hash": run["events"][-1]["hash"] if run["events"] else "0" * 64}
    event["hash"] = digest(event)
    run["events"].append(event)
    return event


def create(directory: Path, config: dict, catalog: dict, mode: str = "manual") -> dict:
    """Create an isolated run with immutable input identity and explicit evidence mode."""
    validate_config(config, catalog)
    require(mode in {"manual", "live", "fixture"}, "Unknown execution mode")
    identifier(directory.name, "run directory name")
    directory.mkdir(parents=True, exist_ok=False)
    sources = {p.name: text_hash(p.read_text(encoding="utf-8")) for p in sorted(Path(__file__).parent.glob("dynamic_*.py"))}
    run = {"schema_version": "dynamic-flower-run-1", "id": directory.name, "created_at": now(),
           "mode": mode, "config": copy.deepcopy(config), "config_sha256": digest(config),
           "catalog": copy.deepcopy(catalog), "catalog_sha256": digest(catalog),
           "runtime_sources": sources, "events": []}
    append(run, "created", "design_develop", "user", {key: value for key, value in run.items() if key != "events"})
    atomic_json(directory / "run.json", run)
    return run


def verify(run: dict) -> bool:
    """Verify metadata, inputs, event hashes, and semantic message references."""
    require(run.get("schema_version") == "dynamic-flower-run-1", "Unsupported dynamic run")
    validate_config(run["config"], run["catalog"])
    require(run["config_sha256"] == digest(run["config"]) and run["catalog_sha256"] == digest(run["catalog"]), "Input pin mismatch")
    require(bool(run.get("events")) and run["events"][0]["kind"] == "created", "Missing creation event")
    require(run["events"][0]["payload"] == {k: v for k, v in run.items() if k != "events"}, "Run metadata differs from creation event")
    previous = "0" * 64
    prefix = {**run, "events": []}
    for number, event in enumerate(run["events"], 1):
        base = {k: v for k, v in event.items() if k != "hash"}
        require(event["seq"] == number and event["prev_hash"] == previous and event["hash"] == digest(base),
                f"Event integrity failed at {number}")
        _verify_event(prefix, event)
        prefix["events"].append(event)
        previous = event["hash"]
    return True


def _verify_event(prefix: dict, event: dict) -> None:
    from dynamic_records import validate_event
    validate_event(prefix, event)
    if event["kind"] == "message":
        from dynamic_messages import validate_message
        validate_message(prefix, event["actor"], event["payload"]["response"])
        require(event["payload"]["message_id"] == f"m{event['seq']:05d}", "Message identity mismatch")
    if event["kind"] in {"message", "evaluation", "turn_failed"}:
        from dynamic_state import pending_request
        request = pending_request(prefix)
        require(request is not None and request["seq"] == event["payload"]["request_seq"], "Response has no matching pending request")
        require(request["actor"] == event["actor"], "Response actor differs from request")
    if event["kind"] == "artifact":
        from dynamic_state import current_artifact, message_map
        value = event["payload"]
        prior = current_artifact(prefix)
        require(value["version"] == (prior["version"] + 1 if prior else 1), "Artifact version is not sequential")
        source = message_map(prefix).get(value["message_id"])
        require(source is not None and source["actor"] == event["actor"], "Artifact lacks its implementing message")
        artifact = source["payload"]["response"]["artifact"]
        require(artifact is not None and text_hash(artifact["html"]) == value["sha256"], "Artifact differs from implementing source")
        require(value["parent_version"] == artifact["parent_version"], "Artifact parent mismatch")


def load(directory: Path) -> dict:
    """Load and verify a run before any replay, provider call, or mutation."""
    run = json.loads((directory / "run.json").read_text(encoding="utf-8"))
    verify(run)
    from dynamic_amendment import verify_archives
    verify_archives(directory, run)
    for event in run["events"]:
        if event["kind"] == "artifact":
            value = event["payload"]
            require(text_hash((directory / value["file"]).read_text(encoding="utf-8")) == value["sha256"], "Artifact file changed")
        elif event["kind"] == "request":
            value = event["payload"]
            folder = directory / "calls" / f"{value['ordinal']:04d}"
            require(text_hash((folder / "prompt.txt").read_text(encoding="utf-8")) == value["prompt_sha256"], "Prompt file changed")
            require(digest(json.loads((folder / "schema.json").read_text(encoding="utf-8"))) == value["schema_sha256"], "Schema file changed")
        elif event["kind"] == "frozen":
            value = event["payload"]
            require(digest(json.loads((directory / value["file"]).read_text(encoding="utf-8"))) == value["export_sha256"], "Frozen export changed")
    return run
