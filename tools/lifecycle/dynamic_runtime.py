"""Execute bounded addressed conversations with immutable implementation and test boundaries."""
from __future__ import annotations

from pathlib import Path

from dynamic_contract import canonical, digest, require, text, text_hash
from dynamic_journal import append, atomic_json, load, locked
from dynamic_messages import MESSAGE_SCHEMA, validate_message
from dynamic_observations import validate_observation
from dynamic_prompts import bounded_prompt, conversation_prompt, effective_case
from dynamic_state import current_artifact, frozen_artifacts, outstanding, pending_request, phase, review_status, select_speaker, turns


def _save(directory: Path, run: dict) -> None:
    atomic_json(directory / "run.json", run)


def _source_guard(run: dict) -> None:
    current = {p.name: text_hash(p.read_text(encoding="utf-8")) for p in sorted(Path(__file__).parent.glob("dynamic_*.py"))}
    require(current == run["runtime_sources"], "Runtime code changed since creation; preserve this run and create a new one")


def _inject_updates(run: dict) -> None:
    seen = {e["payload"]["id"] for e in run["events"] if e["kind"] == "user_update"}
    current = phase(run)
    for update in run["config"].get("updates", []):
        if update["id"] not in seen and update["phase"] == current and update["after_turn"] <= turns(run, current):
            prior = effective_case(run)
            append(run, "user_update", current, "user", {**update, "case_version": prior["case_version"] + 1,
                                                       "prior_case_sha256": digest(prior)})
            seen.add(update["id"])


def apply_boundary_updates(directory: Path, run: dict) -> None:
    """Retain due changes and pause a freeze or review until they receive explicit reconsideration."""
    before = len(run["events"])
    _inject_updates(run)
    if len(run["events"]) != before:
        _save(directory, run)
        raise ValueError("due_user_update: a scheduled change was retained; reconsider it in conversation before this boundary")


def retain_request(directory: Path, run: dict, actor: str, purpose: str, prompt: str,
                   schema: dict, extra: dict | None = None) -> dict:
    """Retain exact prompts before one attempted call, with no hidden context truncation."""
    require(pending_request(run) is None, "An unanswered request is already retained")
    current = phase(run)
    require(turns(run, current) < run["config"]["budgets"][current], "call_budget_exhausted")
    bounded_prompt(run, prompt)
    ordinal = sum(e["kind"] == "request" for e in run["events"]) + 1
    folder = directory / "calls" / f"{ordinal:04d}"
    folder.mkdir(parents=True, exist_ok=False)
    (folder / "prompt.txt").write_text(prompt, encoding="utf-8")
    atomic_json(folder / "schema.json", schema)
    payload = {"ordinal": ordinal, "purpose": purpose, "prompt_file": f"calls/{ordinal:04d}/prompt.txt",
               "prompt_sha256": text_hash(prompt), "schema_sha256": digest(schema), **(extra or {})}
    request = append(run, "request", current, actor, payload)
    _save(directory, run)
    return request


def request_turn(directory: Path) -> dict:
    """Choose one useful next speaker and retain its complete-context request."""
    with locked(directory):
        run = load(directory)
        _source_guard(run)
        pending = pending_request(run)
        if pending:
            require(pending["payload"]["purpose"] == "conversation", "Pending request is an evaluation")
            return pending
        _inject_updates(run)
        actor, reason = select_speaker(run)
        if actor is None:
            append(run, "stopped", phase(run), "system", {"reason": reason, "complete": False})
            _save(directory, run)
            raise ValueError(reason)
        prompt = conversation_prompt(run, actor, reason)
        try:
            return retain_request(directory, run, actor, "conversation", prompt, MESSAGE_SCHEMA, {"reason": reason})
        except ValueError as error:
            if str(error).startswith("context_limit"):
                append(run, "stopped", phase(run), "system", {"reason": str(error), "complete": False})
                _save(directory, run)
            raise


def _retain_response(directory: Path, request: dict, response: dict, provenance: dict) -> None:
    folder = directory / "calls" / f"{request['payload']['ordinal']:04d}"
    target = folder / "submitted-response.json"
    require(not target.exists(), "This request already has a retained submission")
    atomic_json(target, {"response": response, "provenance": provenance})


def validate_origin(run: dict, provenance: dict) -> None:
    """Keep live, manually supplied, and scripted fixture contributions visibly distinct."""
    expected = {"live": "live_model", "manual": "manual", "fixture": "fixture"}[run["mode"]]
    require(provenance.get("evidence_kind") == expected, "Response origin differs from the run's declared mode")


def _write_artifact(directory: Path, run: dict, message: dict) -> None:
    response = message["payload"]["response"]
    if response["artifact"] is None:
        return
    previous = current_artifact(run)
    version = previous["version"] + 1 if previous else 1
    path = Path("artifacts") / f"v{version:03d}.html"
    (directory / path).parent.mkdir(exist_ok=True)
    with (directory / path).open("x", encoding="utf-8") as handle:
        handle.write(response["artifact"]["html"])
    append(run, "artifact", phase(run), message["actor"], {"version": version, "parent_version": response["artifact"]["parent_version"],
           "sha256": text_hash(response["artifact"]["html"]), "file": path.as_posix(),
           "change_summary": response["artifact"]["change_summary"], "message_id": message["payload"]["message_id"]})


def accept_turn(directory: Path, response: dict, provenance: dict | None = None) -> dict:
    """Validate and journal one supplied response, retaining invalid attempts as failures."""
    with locked(directory):
        run = load(directory)
        _source_guard(run)
        request = pending_request(run)
        require(request is not None and request["payload"]["purpose"] == "conversation", "No pending conversation request")
        origin = provenance or {"provider": "manual", "evidence_kind": "fixture" if run["mode"] == "fixture" else "manual"}
        _retain_response(directory, request, response, origin)
        try:
            validate_origin(run, origin)
            validate_message(run, request["actor"], response)
            canonical(response)
        except (ValueError, TypeError, KeyError) as error:
            append(run, "turn_failed", request["phase"], request["actor"], {"request_seq": request["seq"], "reason": str(error)})
            _save(directory, run)
            raise
        seq = len(run["events"]) + 1
        event = append(run, "message", request["phase"], request["actor"], {"message_id": f"m{seq:05d}",
                       "request_seq": request["seq"], "response": response, "provenance": origin})
        _write_artifact(directory, run, event)
        _save(directory, run)
        return event


def fail_request(directory: Path, reason: str, provenance: dict | None = None) -> dict:
    """Record an execution failure while preserving its already-consumed call slot."""
    with locked(directory):
        run = load(directory)
        request = pending_request(run)
        require(request is not None, "No pending request to fail")
        event = append(run, "turn_failed", request["phase"], request["actor"],
                       {"request_seq": request["seq"], "reason": text(reason, "failure reason"), "provenance": provenance or {}})
        _save(directory, run)
        return event


def freeze(directory: Path, accepted_risks: list[str] | None = None, reason: str = "") -> dict:
    """Freeze exact implemented bytes, requiring real user acceptance for unresolved issues."""
    with locked(directory):
        run = load(directory)
        _source_guard(run)
        require(pending_request(run) is None, "Cannot freeze during an unanswered call")
        apply_boundary_updates(directory, run)
        artifact = current_artifact(run)
        require(artifact is not None, "There is no executable artifact to freeze")
        require(artifact["version"] not in frozen_artifacts(run), "This artifact version is already frozen")
        risks = set(accepted_risks or [])
        questions, objections = outstanding(run)
        unresolved = {item["id"] for item in questions + objections}
        require(risks == unresolved, "Explicitly accept every unresolved question/objection, or resolve it before freezing")
        if risks:
            text(reason, "user risk acceptance reason")
        export = _frozen_export(run, artifact, sorted(risks), reason)
        folder = directory / "frozen"
        folder.mkdir(exist_ok=True)
        target = folder / f"v{artifact['version']:03d}.json"
        require(not target.exists(), "Frozen export already exists")
        atomic_json(target, export)
        event = append(run, "frozen", phase(run), "user", {**export, "file": f"frozen/{target.name}", "export_sha256": digest(export)})
        _save(directory, run)
        return event


def _frozen_export(run: dict, artifact: dict, risks: list[str], reason: str) -> dict:
    return {"schema_version": "dynamic-flower-frozen-1", "run_id": run["id"], "config_sha256": run["config_sha256"],
            "evidence_kind": "fixture" if run["mode"] == "fixture" else "candidate_artifact", "execution_mode": run["mode"],
            "artifact_version": artifact["version"], "artifact_sha256": artifact["sha256"], "artifact_file": artifact["file"],
            "case": effective_case(run), "scenarios": run["config"]["scenarios"],
            "scenario_hashes": {s["id"]: digest(s) for s in run["config"]["scenarios"]},
            "review_status": review_status(run, artifact["version"]), "accepted_risks": risks,
            "risk_acceptance_reason": reason, "frozen_event_seq": len(run["events"]) + 1}


def observe(directory: Path, evidence: dict) -> dict:
    """Attach actual external test observations without mutating the tested candidate."""
    with locked(directory):
        run = load(directory)
        _source_guard(run)
        require(pending_request(run) is None, "Complete the pending turn before importing test evidence")
        validate_observation(run, evidence)
        event = append(run, "observation", "deploy_test", "browser", {"evidence": evidence, "evidence_sha256": digest(evidence)})
        _save(directory, run)
        return event
