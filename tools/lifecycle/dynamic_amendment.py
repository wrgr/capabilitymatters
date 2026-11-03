"""Authorize one explicit full-context continuation while preserving the original runtime and journal prefix."""
from __future__ import annotations

import argparse
import hashlib
import json
import shutil
import subprocess
import sys
from pathlib import Path

from dynamic_contract import digest, identifier, require, text

BASE_SOURCE_SET = "b8e2f825ce34398aa6bf8d229eca7c7a202a0f8827e6d4e4761b5efebd9ef075"
AMENDMENT_VERSION = "dynamic-flower-context-amendment-1"
ARCHIVE = "runtime-amendments/context-600000"
ADAPTED_FILES = {"dynamic_prompts.py", "dynamic_runtime.py", "dynamic_records.py", "dynamic_journal.py", "dynamic_contract.py"}
NEW_FILE = "dynamic_amendment.py"


def context_limit(run: dict) -> int:
    """Return the original context limit until a validated amendment becomes visible."""
    changes = [e for e in run["events"] if e["kind"] == "runtime_amendment"]
    return changes[-1]["payload"]["new_context_limit"] if changes else run["config"]["budgets"]["max_context_chars"]


def effective_sources(run: dict) -> dict:
    """Require the exact runtime authorized at the current journal prefix."""
    changes = [e for e in run["events"] if e["kind"] == "runtime_amendment"]
    return changes[-1]["payload"]["new_runtime_sources"] if changes else run["runtime_sources"]


def _file_hash(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def _source_map(root: Path) -> dict:
    return {path.name: _file_hash(path) for path in sorted(root.glob("dynamic_*.py"))}


def _check_source_scope(old: dict, new: dict) -> None:
    require(digest(old) == BASE_SOURCE_SET, "Amendment supports only the published original runtime")
    require(set(new) == set(old) | {NEW_FILE}, "Unexpected runtime file added or removed")
    require(all(new[name] == value for name, value in old.items() if name not in ADAPTED_FILES),
            "Amendment may not change routing, message permissions, evidence, evaluator, provider or configuration contracts")
    require(all(isinstance(value, str) and len(value) == 64 and all(c in "0123456789abcdef" for c in value)
                for value in new.values()), "Invalid amended source fingerprint")


def validate_amendment(prefix: dict, event: dict) -> None:
    """Reject changes outside the declared context-only, pre-evaluation continuation."""
    from dynamic_state import frozen_artifacts, pending_request
    value = event["payload"]
    require(value.get("schema_version") == AMENDMENT_VERSION and event["actor"] == "user", "Invalid amendment authority/version")
    require(event["phase"] == "deploy_test" and bool(frozen_artifacts(prefix)), "Amendment requires a frozen candidate")
    require(pending_request(prefix) is None, "Cannot amend while a request is pending")
    require(not any(e["kind"] == "runtime_amendment" for e in prefix["events"]), "This continuation is already amended")
    require(not any(e["kind"] == "request" and e["payload"]["purpose"] == "evaluation" for e in prefix["events"]),
            "Apply the same amendment before any expert review request")
    require(value["old_context_limit"] == context_limit(prefix) == 180000 and value["new_context_limit"] == 600000,
            "Only the explicit 180000 to 600000 context change is authorized")
    require(value["config_sha256"] == prefix["config_sha256"] and value["original_event_count"] == len(prefix["events"])
            and value["original_head"] == prefix["events"][-1]["hash"], "Amendment does not extend the unchanged original prefix")
    require(value["old_runtime_sources"] == effective_sources(prefix), "Amendment original source map differs")
    _check_source_scope(value["old_runtime_sources"], value["new_runtime_sources"])
    require(value["new_source_set_sha256"] == digest(value["new_runtime_sources"]), "New source-set digest mismatch")
    require(value["archive"] == ARCHIVE and value["scope"] == "context_character_allowance_only", "Unexpected amendment scope/archive")
    identifier(value["amendment_id"], "method amendment id")
    text(value["reason"], "method amendment reason")
    require(isinstance(value["original_run_sha256"], str) and len(value["original_run_sha256"]) == 64, "Missing original raw snapshot hash")


def verify_archives(directory: Path, run: dict) -> None:
    """Verify preserved original bytes and both runtime trees for every recorded continuation."""
    for event in run["events"]:
        if event["kind"] != "runtime_amendment":
            continue
        value = event["payload"]
        archive = directory / value["archive"]
        original_path = archive / "original-run.json"
        require(_file_hash(original_path) == value["original_run_sha256"], "Archived original run bytes changed")
        original = json.loads(original_path.read_text(encoding="utf-8"))
        expected = {**run, "events": run["events"][:value["original_event_count"]]}
        require(original == expected, "Original journal prefix or metadata was rewritten")
        require(_source_map(archive / "old-runtime") == value["old_runtime_sources"], "Archived original runtime changed")
        require(_source_map(archive / "new-runtime") == value["new_runtime_sources"], "Archived continuation runtime changed")
        _verify_default_only(archive / "old-runtime", archive / "new-runtime")
        require(json.loads((archive / "amendment.json").read_text(encoding="utf-8")) == value, "Archived amendment differs from event")


def _verify_default_only(old_root: Path, new_root: Path) -> None:
    original = (old_root / "dynamic_contract.py").read_bytes()
    changed = (new_root / "dynamic_contract.py").read_bytes()
    before, after = b'"max_context_chars": 180000', b'"max_context_chars": 600000'
    require(original.count(before) == 1 and changed == original.replace(before, after),
            "Configuration code may change only the new-run context default; all validators must remain byte-identical")


def _verify_using_original_runtime(directory: Path, source_root: Path, sources: dict, head: str) -> None:
    require(_source_map(source_root) == sources, "Supplied original runtime bytes do not match the run's source pins")
    # Execute the original guard in its own pinned tree; this is a read-only verification, not a bypass.
    script = ("import sys; from pathlib import Path; sys.path.insert(0,sys.argv[1]); "
              "from dynamic_journal import load; from dynamic_runtime import _source_guard; "
              "run=load(Path(sys.argv[2])); _source_guard(run); print(run['events'][-1]['hash'])")
    result = subprocess.run([sys.executable, "-c", script, str(source_root.resolve()), str(directory.resolve())],
                            capture_output=True, text=True, check=False, timeout=60)
    require(result.returncode == 0 and result.stdout.strip() == head, "Original runtime verification/guard failed: " + result.stderr[-2000:])


def _payload(run: dict, original_bytes: bytes, sources: dict, amendment_id: str, reason: str) -> dict:
    return {"schema_version": AMENDMENT_VERSION, "amendment_id": amendment_id, "scope": "context_character_allowance_only",
            "old_context_limit": context_limit(run), "new_context_limit": 600000, "config_sha256": run["config_sha256"],
            "original_event_count": len(run["events"]), "original_head": run["events"][-1]["hash"],
            "original_run_sha256": hashlib.sha256(original_bytes).hexdigest(), "old_runtime_sources": run["runtime_sources"],
            "new_runtime_sources": sources, "new_source_set_sha256": digest(sources), "archive": ARCHIVE, "reason": reason}


def _archive(directory: Path, original_bytes: bytes, old_root: Path, new_root: Path, value: dict) -> None:
    from dynamic_journal import atomic_json
    target = directory / ARCHIVE
    target.mkdir(parents=True, exist_ok=False)
    (target / "original-run.json").write_bytes(original_bytes)
    for name, source_root, mapping in (("old-runtime", old_root, value["old_runtime_sources"]),
                                      ("new-runtime", new_root, value["new_runtime_sources"])):
        destination = target / name
        destination.mkdir()
        for filename, expected in mapping.items():
            shutil.copyfile(source_root / filename, destination / filename)
            require(_file_hash(destination / filename) == expected, "Source changed during archival copy")
    atomic_json(target / "amendment.json", value)


def amend_context(directory: Path, old_source_root: Path, amendment_id: str, reason: str) -> dict:
    """Append the explicit continuation after verifying and archiving the unchanged original run."""
    from dynamic_journal import append, atomic_json, load, locked, verify
    with locked(directory):
        original_bytes = (directory / "run.json").read_bytes()
        run = load(directory)
        new_root = Path(__file__).parent
        value = _payload(run, original_bytes, _source_map(new_root), amendment_id, reason)
        candidate = {"actor": "user", "phase": "deploy_test", "payload": value}
        validate_amendment(run, candidate)
        _verify_using_original_runtime(directory, old_source_root, value["old_runtime_sources"], value["original_head"])
        _verify_default_only(old_source_root, new_root)
        _archive(directory, original_bytes, old_source_root, new_root, value)
        event = append(run, "runtime_amendment", "deploy_test", "user", value)
        verify(run)
        verify_archives(directory, run)
        atomic_json(directory / "run.json", run)
        return event


def main() -> int:
    """Apply only the named context amendment to an explicitly selected frozen run."""
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--run", type=Path, required=True)
    parser.add_argument("--old-source-root", type=Path, required=True)
    parser.add_argument("--amendment-id", required=True)
    parser.add_argument("--reason", required=True)
    args = parser.parse_args()
    try:
        event = amend_context(args.run, args.old_source_root, args.amendment_id, args.reason)
    except (ValueError, OSError, subprocess.SubprocessError) as error:
        print(json.dumps({"error": str(error)}))
        return 1
    print(json.dumps(event, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
