"""Authorize one explicit full-context continuation while preserving the original runtime and journal prefix."""
from __future__ import annotations

import argparse
import hashlib
import json
import re
import shutil
import subprocess
import sys
from pathlib import Path

from dynamic_contract import digest, identifier, require, text

BASE_SOURCE_SET = "b8e2f825ce34398aa6bf8d229eca7c7a202a0f8827e6d4e4761b5efebd9ef075"
AMENDMENT_VERSION = "dynamic-flower-context-amendment-1"
DESIGN_AMENDMENT_VERSION = "dynamic-flower-context-amendment-2"
ARCHIVE = "runtime-amendments/context-600000"
DESIGN_ARCHIVE = "runtime-amendments/context-600000-design-v2"
V1_PEER_SOURCE_SET = "65feef814dbd90aaf4a1561a1bac2f93b3f5a6e72d222c0e28f6315858673d1f"
RESUME_REASON = "awaiting_next_turn_after_context_amendment"
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
    if event["payload"].get("schema_version") == DESIGN_AMENDMENT_VERSION:
        _validate_design_amendment(prefix, event)
        return
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


def _refused_prompt(prefix: dict) -> tuple[dict, str]:
    from dynamic_prompts import conversation_prompt
    from dynamic_state import select_speaker
    refusal = prefix["events"][-1]
    require(refusal["kind"] == "stopped" and refusal["payload"].get("complete") is False, "Design continuation requires a retained latest refusal")
    matched = re.fullmatch(r"context_limit: full prompt needs ([0-9]+) characters; no transcript was truncated", refusal["payload"].get("reason", ""))
    require(matched is not None, "The retained stop is not a context-limit refusal")
    before = {**prefix, "events": prefix["events"][:-1]}
    actor, reason = select_speaker(before)
    require(actor is not None, "No addressed continuation was blocked")
    prompt = conversation_prompt(before, actor, reason)
    require(len(prompt) == int(matched.group(1)) and 180000 < len(prompt) <= 600000,
            "Retained refusal does not reproduce an exact prompt within the proposed allowance")
    return {"seq": refusal["seq"], "hash": refusal["hash"], "reason": refusal["payload"]["reason"],
            "actor": actor, "scheduler_reason": reason, "prompt_characters": len(prompt),
            "prompt_sha256": hashlib.sha256(prompt.encode("utf-8")).hexdigest()}, prompt


def _validate_design_amendment(prefix: dict, event: dict) -> None:
    from dynamic_state import current_artifact, frozen_artifacts, pending_request, phase
    value = event["payload"]
    require(event["actor"] == "user" and event["phase"] == phase(prefix) == "design_develop", "V2 requires an explicit design-phase amendment")
    require(current_artifact(prefix) is not None and not frozen_artifacts(prefix), "V2 requires an accepted, not-yet-frozen artifact")
    require(pending_request(prefix) is None, "Cannot amend while a request is pending")
    require(not any(e["kind"] == "runtime_amendment" for e in prefix["events"]), "This continuation is already amended")
    require(not any(e["kind"] == "request" and e["payload"]["purpose"] == "evaluation" for e in prefix["events"]), "V2 must precede expert review")
    require(value["old_context_limit"] == context_limit(prefix) == 180000 and value["new_context_limit"] == 600000,
            "Only the explicit 180000 to 600000 context change is authorized")
    require(value["config_sha256"] == prefix["config_sha256"] and value["original_event_count"] == len(prefix["events"])
            and value["original_head"] == prefix["events"][-1]["hash"], "V2 must preserve its exact original prefix")
    require(value["old_runtime_sources"] == effective_sources(prefix), "V2 original runtime differs")
    _check_source_scope(value["old_runtime_sources"], value["new_runtime_sources"])
    peers = {name: sha for name, sha in value["new_runtime_sources"].items() if name != NEW_FILE}
    require(digest(peers) == V1_PEER_SOURCE_SET, "V2 may change only the amendment module relative to the v1 continuation runtime")
    require(value["new_source_set_sha256"] == digest(value["new_runtime_sources"]), "New source-set digest mismatch")
    require(value["archive"] == DESIGN_ARCHIVE and value["scope"] == "context_character_allowance_only"
            and value["continuation_phase"] == "design_develop", "Unexpected V2 scope or archive")
    identifier(value["amendment_id"], "method amendment id")
    text(value["reason"], "method amendment reason")
    require(isinstance(value["original_run_sha256"], str) and re.fullmatch(r"[a-f0-9]{64}", value["original_run_sha256"]) is not None,
            "Missing original raw snapshot hash")
    refusal, _ = _refused_prompt(prefix)
    require(value["refusal"] == refusal, "V2 refusal identity or full prompt differs")


def _continuation_payload(amendment: dict) -> dict:
    return {"reason": RESUME_REASON, "complete": False, "amendment_seq": amendment["seq"],
            "amendment_hash": amendment["hash"], "retained_refusal_seq": amendment["payload"]["refusal"]["seq"],
            "note": "Paused awaiting the next addressed turn after the context amendment. No model or test result was created."}


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
        if value["schema_version"] == DESIGN_AMENDMENT_VERSION:
            _verify_design_archive(archive, run, event, original)


def _verify_design_archive(archive: Path, run: dict, event: dict, original: dict) -> None:
    expected_refusal, expected_prompt = _refused_prompt(original)
    require(event["payload"]["refusal"] == expected_refusal and (archive / "refused-prompt.txt").read_text(encoding="utf-8") == expected_prompt,
            "Archived refused prompt is not the complete original input")
    require(len(run["events"]) > event["seq"], "V2 continuation pause marker is missing")
    marker = run["events"][event["seq"]]
    require(marker["seq"] == event["seq"] + 1 and marker["kind"] == "stopped" and marker["actor"] == "system"
            and marker["phase"] == "design_develop" and marker["payload"] == _continuation_payload(event),
            "V2 requires its immediate bound pause awaiting the next addressed turn")


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


def _payload(run: dict, original_bytes: bytes, sources: dict, amendment_id: str, reason: str, version: int) -> dict:
    value = {"schema_version": AMENDMENT_VERSION, "amendment_id": amendment_id, "scope": "context_character_allowance_only",
            "old_context_limit": context_limit(run), "new_context_limit": 600000, "config_sha256": run["config_sha256"],
            "original_event_count": len(run["events"]), "original_head": run["events"][-1]["hash"],
            "original_run_sha256": hashlib.sha256(original_bytes).hexdigest(), "old_runtime_sources": run["runtime_sources"],
            "new_runtime_sources": sources, "new_source_set_sha256": digest(sources), "archive": ARCHIVE, "reason": reason}
    if version == 2:
        refusal, _ = _refused_prompt(run)
        value.update(schema_version=DESIGN_AMENDMENT_VERSION, archive=DESIGN_ARCHIVE,
                     continuation_phase="design_develop", refusal=refusal)
    return value


def _archive(directory: Path, original_bytes: bytes, old_root: Path, new_root: Path, value: dict) -> None:
    from dynamic_journal import atomic_json
    target = directory / value["archive"]
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
    if value["schema_version"] == DESIGN_AMENDMENT_VERSION:
        original = json.loads(original_bytes)
        _, prompt = _refused_prompt(original)
        (target / "refused-prompt.txt").write_text(prompt, encoding="utf-8")


def amend_context(directory: Path, old_source_root: Path, amendment_id: str, reason: str, version: int = 1) -> dict:
    """Append the explicit continuation after verifying and archiving the unchanged original run."""
    from dynamic_journal import append, atomic_json, load, locked, verify
    require(version in {1, 2}, "Unknown context-amendment version")
    with locked(directory):
        original_bytes = (directory / "run.json").read_bytes()
        run = load(directory)
        new_root = Path(__file__).parent
        value = _payload(run, original_bytes, _source_map(new_root), amendment_id, reason, version)
        amendment_phase = "design_develop" if version == 2 else "deploy_test"
        candidate = {"actor": "user", "phase": amendment_phase, "payload": value}
        validate_amendment(run, candidate)
        _verify_using_original_runtime(directory, old_source_root, value["old_runtime_sources"], value["original_head"])
        _verify_default_only(old_source_root, new_root)
        _archive(directory, original_bytes, old_source_root, new_root, value)
        event = append(run, "runtime_amendment", amendment_phase, "user", value)
        if version == 2:
            append(run, "stopped", amendment_phase, "system", _continuation_payload(event))
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
    parser.add_argument("--version", type=int, choices=[1, 2], default=1)
    args = parser.parse_args()
    try:
        event = amend_context(args.run, args.old_source_root, args.amendment_id, args.reason, args.version)
    except (ValueError, OSError, subprocess.SubprocessError) as error:
        print(json.dumps({"error": str(error)}))
        return 1
    print(json.dumps(event, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
