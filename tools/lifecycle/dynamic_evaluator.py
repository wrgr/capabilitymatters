"""Build evidence-bound expert reviews with separate process and scenario-result criteria."""
from __future__ import annotations

from pathlib import Path

from dynamic_contract import canonical, digest, indexed, require, string_list, text
from dynamic_journal import append, atomic_json, load, locked
from dynamic_observations import observations
from dynamic_prompts import BOUNDARIES, bounded_prompt, effective_case, public_conversation
from dynamic_runtime import _retain_response, _source_guard, apply_boundary_updates, retain_request, validate_origin
from dynamic_state import current_artifact, frozen_artifacts, pending_request

REF_SCHEMA = {"type": "object", "additionalProperties": False, "properties": {
    "source": {"type": "string", "enum": ["event", "html", "rendered"]},
    "id": {"type": "string"}, "quote": {"type": "string"}}, "required": ["source", "id", "quote"]}
SCORE_SCHEMA = {"type": "object", "additionalProperties": False, "properties": {
    "dimension_id": {"type": "string"}, "score": {"type": ["integer", "null"]},
    "rationale": {"type": "string"}, "evidence_refs": {"type": "array", "items": REF_SCHEMA}},
    "required": ["dimension_id", "score", "rationale", "evidence_refs"]}
EVALUATION_SCHEMA = {"type": "object", "additionalProperties": False, "properties": {
    "scope": {"type": "string", "enum": ["process", "result"]}, "artifact_version": {"type": "integer"},
    "scenario_id": {"type": ["string", "null"]}, "scores": {"type": "array", "items": SCORE_SCHEMA},
    "limitations": {"type": "array", "items": {"type": "string"}}},
    "required": ["scope", "artifact_version", "scenario_id", "scores", "limitations"]}


def _source_registry(packet: dict, message_id: str) -> list[dict]:
    sources = []
    for index, event in enumerate(packet["complete_public_conversation"]):
        base = ["complete_public_conversation", index, "payload"]
        if event["kind"] == "message":
            sources.append({"source": "event", "id": f"event/{event['seq']}", "path": base + ["response", "content"]})
            if event["payload"]["message_id"] == message_id:
                sources.append({"source": "html", "id": f"artifact/{packet['artifact_version']}", "path": base + ["response", "artifact", "html"]})
        elif event["kind"] == "user_update":
            sources.append({"source": "event", "id": f"event/{event['seq']}", "path": base + ["message"]})
    for index, observation in enumerate(packet["observations"]):
        for ordinal, action in enumerate(observation["actions"]):
            rendered = action["observation"]
            rendered = rendered.get("rendered_text") if isinstance(rendered, dict) else rendered
            if isinstance(rendered, str) and rendered and action["status"] == "observed":
                path = ["observations", index, "actions", ordinal, "observation"]
                if isinstance(action["observation"], dict):
                    path += ["rendered_text"]
                sources.append({"source": "rendered", "id": f"scenario/{observation['scenario_id']}/action/{action['id']}", "path": path})
        for ordinal, check in enumerate(observation["checks"]):
            if isinstance(check["observed"], str) and check["status"] != "unavailable":
                sources.append({"source": "rendered", "id": f"scenario/{observation['scenario_id']}/check/{check['id']}",
                                "path": ["observations", index, "checks", ordinal, "observed"]})
    return sources


def reference_text(packet: dict, source: dict) -> str:
    """Read an exact named representation already present in the packet without duplicating it."""
    value = packet
    for part in source["path"]:
        value = value[part]
    require(isinstance(value, str), "Evidence source path does not identify exact text")
    return value


def evaluation_packet(run: dict, scenario_id: str | None = None) -> dict:
    """Provide a separate expert with the full conversation and bound observed evidence."""
    artifact = current_artifact(run)
    require(artifact is not None and artifact["version"] in frozen_artifacts(run), "Freeze the current artifact before evaluation")
    version = artifact["version"]
    evidence = observations(run, version)
    require(bool(evidence), "Evaluation requires actual retained browser observations")
    scope = "result" if scenario_id else "process"
    scenarios = indexed(run["config"]["scenarios"], "scenarios")
    if scenario_id:
        require(scenario_id in scenarios and any(e["scenario_id"] == scenario_id for e in evidence), "Requested scenario has no observations")
        evidence = [e for e in evidence if e["scenario_id"] == scenario_id]
    else:
        require({e["scenario_id"] for e in evidence} == set(scenarios), "Process review waits for all selected test records, including unavailable outcomes")
    existing = [e for e in run["events"] if e["kind"] == "evaluation" and e["payload"]["artifact_version"] == version
                and e["payload"]["scope"] == scope and e["payload"]["scenario_id"] == scenario_id]
    require(not existing, "This version and review scope already have an accepted evaluation")
    frozen = frozen_artifacts(run)[version]
    packet = {"schema_version": "dynamic-flower-evaluation-packet-1", "run_id": run["id"],
            "config_sha256": run["config_sha256"], "evidence_mode": run["mode"], "scope": scope,
            "artifact_version": version, "artifact_sha256": artifact["sha256"], "scenario_id": scenario_id,
            "case": frozen_artifacts(run)[version]["case"], "current_case": effective_case(run),
            "condition_id": run["config"]["condition_id"], "agents": run["config"]["agents"],
            "complete_public_conversation": [e for e in public_conversation(run) if e["kind"] not in {"evaluation", "observation"}],
            "scenarios": run["config"]["scenarios"], "observations": evidence,
            "frozen_artifact": {key: value for key, value in frozen.items() if key not in {"case", "scenarios"}},
            "rubric": run["catalog"]["rubric"], "journal_head": run["events"][-1]["hash"]}
    packet["sources"] = _source_registry(packet, artifact["message_id"])
    return packet


def evaluation_prompt(run: dict, packet: dict) -> str:
    """Instruct a fresh expert to judge process and observed results without authoring a repair."""
    evaluator = indexed(run["config"]["agents"], "agents")[run["config"]["evaluator_id"]]
    instructions = """You are the separate expert evaluator, with learning-sciences and systems-engineering expertise.
You see actual assignments and the full public conversation; this is not a blinded or statistically
independent human review. Do not join the authoring team or repair the solution. Rate only the requested
scope: process once per frozen version, or result for exactly one observed scenario/version. Return
all declared rubric criterion IDs, each with integer score or null for insufficient evidence. Keep the
three axes separate; do not compute a total or ranking. Passing a selector or a nonempty feedback check
does not establish pedagogical quality. Examine actual input, output, scenario facts and reasoning.
Unobserved human learning, workplace transfer and lived experience remain unknown. Distinguish missing
expert signoff from observed product failure. Use evidence_refs with exact quotations from the supplied
named sources: event means public message text; html means raw source; rendered means observed browser
text. Do not silently unescape another representation. A missing observation needs an explicit unknown,
not a manufactured zero. Your substantive judgment can credit simple or compensating solutions.
Each sources entry gives a path array into this packet to its exact text; follow those keys and array
indices when choosing a quote. These references avoid duplicating HTML or observed text in context.
Judge the pinned frozen case and version. Later case changes, repairs or plans do not retroactively
change that artifact or the observations made from it; distinguish those changes in your rationale.
"""
    return bounded_prompt(run, BOUNDARIES + instructions + "\nEXPERT PROFILE\n" + canonical(evaluator)
                          + "\nCOMPLETE EVALUATION PACKET\n" + canonical(packet))


def request_evaluation(directory: Path, scenario_id: str | None = None) -> dict:
    """Retain a complete expert packet before the separate provider invocation."""
    with locked(directory):
        run = load(directory)
        _source_guard(run)
        require(pending_request(run) is None, "Complete the pending request first")
        apply_boundary_updates(directory, run)
        packet = evaluation_packet(run, scenario_id)
        request = retain_request(directory, run, run["config"]["evaluator_id"], "evaluation",
                                 evaluation_prompt(run, packet), EVALUATION_SCHEMA,
                                 {"scope": packet["scope"], "scenario_id": scenario_id, "artifact_version": packet["artifact_version"],
                                  "packet_sha256": digest(packet)})
        folder = directory / "calls" / f"{request['payload']['ordinal']:04d}"
        atomic_json(folder / "evaluation-packet.json", packet)
        return request


def validate_evaluation(packet: dict, response: dict) -> dict:
    """Check scope, criterion completeness, and exact named evidence without changing ratings."""
    require(isinstance(response, dict) and set(response) == set(EVALUATION_SCHEMA["required"]), "Invalid expert response contract")
    require(all(response[key] == packet[key] for key in ("scope", "artifact_version", "scenario_id")), "Expert reviewed a different scope")
    rubric = packet["rubric"]
    criteria = {c["id"] for c in rubric[packet["scope"]]}
    require(isinstance(response["scores"], list), "Scores must be an array")
    ids = [score.get("dimension_id") for score in response["scores"]]
    require(len(ids) == len(set(ids)) and set(ids) == criteria, "Expert must report every declared criterion exactly once")
    sources = {(source["source"], source["id"]): reference_text(packet, source) for source in packet["sources"]}
    unavailable = packet["scope"] == "result" and all(e["status"] == "unavailable" for e in packet["observations"])
    for score in response["scores"]:
        require(set(score) == set(SCORE_SCHEMA["required"]), "Invalid criterion response")
        value = score["score"]
        require(value is None or (type(value) is int and rubric["score_min"] <= value <= rubric["score_max"]), "Criterion score outside scale")
        require(not unavailable or value is None, "Unavailable scenario evidence cannot receive a numeric result score")
        text(score["rationale"], "rating rationale", 8000)
        refs = score["evidence_refs"]
        require(isinstance(refs, list) and (value is None or bool(refs)), "Numeric ratings require named evidence")
        for ref in refs:
            require(isinstance(ref, dict) and set(ref) == set(REF_SCHEMA["required"]), "Invalid evidence reference")
            source = sources.get((ref["source"], ref["id"]))
            require(source is not None and text(ref["quote"], "evidence quote", 4000) in source, "Exact quote absent from named representation")
    string_list(response["limitations"], "review limitations")
    canonical(response)
    return response


def accept_evaluation(directory: Path, response: dict, provenance: dict | None = None) -> dict:
    """Retain a valid expert review or an explicit failed attempt, never an inferred rating."""
    import json
    with locked(directory):
        run = load(directory)
        _source_guard(run)
        request = pending_request(run)
        require(request is not None and request["payload"]["purpose"] == "evaluation", "No pending expert request")
        folder = directory / "calls" / f"{request['payload']['ordinal']:04d}"
        packet = json.loads((folder / "evaluation-packet.json").read_text(encoding="utf-8"))
        require(digest(packet) == request["payload"]["packet_sha256"], "Expert packet changed after request")
        origin = provenance or {"provider": "manual", "evidence_kind": "fixture" if run["mode"] == "fixture" else "manual"}
        _retain_response(directory, request, response, origin)
        try:
            validate_origin(run, origin)
            validate_evaluation(packet, response)
        except (ValueError, KeyError, TypeError) as error:
            append(run, "turn_failed", "deploy_test", request["actor"], {"request_seq": request["seq"], "reason": str(error)})
            atomic_json(directory / "run.json", run)
            raise
        event = append(run, "evaluation", "deploy_test", request["actor"], {**response, "request_seq": request["seq"],
                       "packet_sha256": digest(packet), "provenance": origin})
        atomic_json(directory / "run.json", run)
        return event
