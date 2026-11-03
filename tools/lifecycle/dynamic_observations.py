"""Bind external browser observations to exact frozen artifact and scenario versions."""
from __future__ import annotations

import re

from dynamic_contract import digest, indexed, require
from dynamic_state import frozen_artifacts


def validate_observation(run: dict, evidence: dict) -> dict:
    """Reject unbound or incomplete test records without turning proposed checks into outcomes."""
    require(evidence.get("schema_version") == "dynamic-flower-observation-1", "Unsupported observation contract")
    require(evidence.get("run_id") == run["id"], "Observation belongs to another run")
    version = evidence.get("artifact_version")
    frozen = frozen_artifacts(run).get(version)
    require(frozen is not None, "Observation requires an explicitly frozen artifact")
    require(evidence.get("artifact_sha256") == frozen["artifact_sha256"], "Observed artifact hash mismatch")
    scenarios = indexed(run["config"]["scenarios"], "scenarios")
    scenario = scenarios.get(evidence.get("scenario_id"))
    require(scenario is not None and digest(scenario) == evidence.get("scenario_sha256"), "Observed scenario hash mismatch")
    require(evidence.get("status") in {"observed", "failed", "unavailable"}, "Invalid observation status")
    require(evidence.get("evidence_kind") in {"browser_observation", "fixture"}, "Evidence must declare its origin")
    require(run["mode"] == "fixture" or evidence["evidence_kind"] != "fixture", "Fixture evidence cannot enter a non-fixture run")
    _validate_items(evidence, scenario)
    for field in ("runtime_errors", "network_requests", "limitations"):
        require(isinstance(evidence.get(field), list), f"Missing observation {field}")
    sources = evidence.get("source_hashes")
    require(isinstance(sources, dict) and bool(sources), "Browser evidence needs retained source hashes")
    require(all(isinstance(v, str) and re.fullmatch(r"[a-f0-9]{64}", v) for v in sources.values()), "Invalid evidence source hash")
    prior = [e for e in run["events"] if e["kind"] == "observation"
             and e["payload"]["evidence"]["artifact_version"] == version
             and e["payload"]["evidence"]["scenario_id"] == scenario["id"]]
    require(not prior, "This version/scenario already has a retained observation; preserve it")
    return evidence


def _validate_items(evidence: dict, scenario: dict) -> None:
    actions = indexed(evidence.get("actions"), "observed actions")
    checks = indexed(evidence.get("checks"), "observed checks")
    expected_actions = indexed(scenario["actions"], "scenario actions")
    expected_checks = indexed(scenario["checks"], "scenario checks")
    require(set(actions) == set(expected_actions), "Record every declared action, including unavailable ones")
    require(set(checks) == set(expected_checks), "Record every declared check, including unavailable ones")
    for action in actions.values():
        require(action.get("status") in {"observed", "failed", "unavailable"}, "Invalid action status")
        require("observation" in action, "Action needs an actual observation or explicit absence")
    for key, check in checks.items():
        require(check.get("status") in {"pass", "fail", "unavailable"}, "Invalid check status")
        require("observed" in check and "expected" in check, "Check must retain its observation and expectation")
        require(check.get("after_action") == expected_checks[key]["after_action"], "Check timing differs from declared scenario")
        if "expected" in expected_checks[key]:
            require(check["expected"] == expected_checks[key]["expected"], "Observed check changed its expectation")
        action = actions[check["after_action"]]
        require(action["status"] == "observed" or check["status"] == "unavailable", "Unexecuted action cannot have a passed or failed check")


def observations(run: dict, version: int) -> list[dict]:
    """Return retained test evidence for exactly one frozen version."""
    return [e["payload"]["evidence"] for e in run["events"] if e["kind"] == "observation"
            and e["payload"]["evidence"]["artifact_version"] == version]
