"""Version experimental configurations and link fresh executions to their preserved parent iterations."""
from __future__ import annotations

from datetime import datetime, timezone
from pathlib import Path
from typing import Any
import uuid

from experiment_batch import validate_comparison
from experiment_config import default_config, resolve_config, validate_config
from experiment_records import hash_value, identifier, read_record, write_immutable

FIELDS = {"config", "comparison", "scenario_reference", "scorecard_assumptions", "change_note"}
OPTIONAL = {"parent_iteration_id", "parent_hash"}


def _folder(root: Path) -> Path:
    return root / "iterations"


def read_iteration(root: Path, iteration_id: str) -> dict:
    """Load an iteration only after verifying its content hash."""
    value = read_record(_folder(root) / (identifier(iteration_id) + ".json"))
    if value.get("kind") != "experiment_iteration" or value.get("iteration_id") != iteration_id:
        raise ValueError("Invalid iteration record")
    expected = hash_value({key: item for key, item in value.items() if key != "content_hash"})
    if value.get("content_hash") != expected:
        raise ValueError("Iteration content hash does not match")
    return value


def _scenario_reference(value: Any) -> dict | None:
    if value is None:
        return None
    if not isinstance(value, dict) or not isinstance(value.get("scenario_id"), str):
        raise ValueError("A scenario reference must be a catalog sidecar or null")
    from experiment_scenarios import apply_scenario
    expected = apply_scenario(default_config(), value["scenario_id"])["scenario_reference"]
    if value != expected:
        raise ValueError("Scenario reference does not match its catalog version and hash")
    return expected


def create_iteration(root: Path, body: dict) -> dict:
    """Save a validated configuration snapshot with an explicit, immutable parent link."""
    if not isinstance(body, dict) or not FIELDS <= set(body) or set(body) - FIELDS - OPTIONAL:
        raise ValueError("Iteration requires configuration, comparison, scenario, assumptions, and change note")
    note = body["change_note"]
    if not isinstance(note, str) or not note.strip() or len(note) > 3000:
        raise ValueError("Explain the iteration change in 1 to 3000 characters")
    parent_id, parent_hash = body.get("parent_iteration_id"), body.get("parent_hash")
    if (parent_id is None) != (parent_hash is None):
        raise ValueError("A parent iteration requires both its identity and content hash")
    if parent_id is not None and read_iteration(root, parent_id)["content_hash"] != parent_hash:
        raise ValueError("Parent iteration hash does not match the preserved record")
    from experiment_scorecard import validate_settings
    config = validate_config(body["config"])
    comparison = None if body["comparison"] is None else validate_comparison(body["comparison"])
    value = {"schema_version": 1, "kind": "experiment_iteration", "iteration_id": "iteration-" + uuid.uuid4().hex[:20],
             "parent_iteration_id": parent_id, "parent_hash": parent_hash,
             "created_at": datetime.now(timezone.utc).isoformat(), "change_note": note.strip(),
             "scenario_reference": _scenario_reference(body["scenario_reference"]), "config": config,
             "config_hash": resolve_config(config)["config_hash"], "comparison": comparison,
             "scorecard_assumptions": validate_settings(body["scorecard_assumptions"])}
    value["content_hash"] = hash_value(value)
    write_immutable(_folder(root) / (value["iteration_id"] + ".json"), value)
    return value


def list_iterations(root: Path) -> list[dict]:
    """Return bounded iteration summaries without collapsing parent histories."""
    fields = ("iteration_id", "parent_iteration_id", "parent_hash", "created_at", "change_note",
              "scenario_reference", "config_hash", "content_hash")
    result = []
    for path in sorted(_folder(root).glob("iteration-*.json"), key=lambda p: p.stat().st_mtime, reverse=True)[:200]:
        value = read_iteration(root, path.stem)
        result.append({key: value[key] for key in fields})
    return result


def verify_execution_iteration(root: Path, iteration_id: str | None, config: dict, comparison: dict | None) -> dict | None:
    """Reject execution whose edited configuration differs from its saved iteration."""
    if iteration_id is None:
        return None
    value = read_iteration(root, iteration_id)
    if value["config_hash"] != resolve_config(config)["config_hash"] or value["comparison"] != comparison:
        raise ValueError("Configuration or comparison changed; save a new iteration before executing")
    return value


def link_execution(root: Path, iteration: dict | None, execution_id: str, kind: str) -> None:
    """Pin a new run or batch to its iteration without changing either original record."""
    if iteration is None:
        return
    if kind not in ("run", "batch"):
        raise ValueError("Iteration execution kind must be run or batch")
    value = {"schema_version": 1, "iteration_id": iteration["iteration_id"], "iteration_hash": iteration["content_hash"],
             "execution_id": identifier(execution_id), "execution_kind": kind}
    value["content_hash"] = hash_value(value)
    write_immutable(_folder(root) / "executions" / (execution_id + ".json"), value)
