"""Check dynamic event semantics during replay so valid hashes cannot hide invalid transitions."""
from __future__ import annotations

from dynamic_contract import digest, require, text_hash
from dynamic_state import current_artifact, frozen_artifacts, pending_request, phase, select_speaker, turns

EVENT_KINDS = {"created", "request", "message", "turn_failed", "user_update", "artifact", "frozen", "observation", "evaluation", "stopped"}


def validate_event(prefix: dict, event: dict) -> None:
    """Validate a single event against only its earlier accepted journal prefix."""
    require(event["kind"] in EVENT_KINDS, "Unknown dynamic event kind")
    require(event["phase"] == phase(prefix), "Event belongs to an inactive phase")
    kind, value = event["kind"], event["payload"]
    if kind == "request":
        _request(prefix, event)
    elif kind == "frozen":
        _frozen(prefix, event)
    elif kind == "observation":
        from dynamic_observations import validate_observation
        require(event["actor"] == "browser", "Only external browser records supply observations")
        validate_observation(prefix, value["evidence"])
        require(value["evidence_sha256"] == digest(value["evidence"]), "Observation digest mismatch")
    elif kind == "evaluation":
        _evaluation(prefix, event)
    elif kind == "user_update":
        _update(prefix, event)
    elif kind == "message":
        from dynamic_runtime import validate_origin
        validate_origin(prefix, value["provenance"])
        require(pending_request(prefix)["payload"]["purpose"] == "conversation", "Expert request cannot accept a conversation message")


def _request(prefix: dict, event: dict) -> None:
    from dynamic_evaluator import EVALUATION_SCHEMA, evaluation_packet, evaluation_prompt
    from dynamic_messages import MESSAGE_SCHEMA
    from dynamic_prompts import bounded_prompt, conversation_prompt
    value = event["payload"]
    require(pending_request(prefix) is None, "A second request cannot precede the first response")
    require(turns(prefix, phase(prefix)) < prefix["config"]["budgets"][phase(prefix)], "Request exceeds call budget")
    ordinal = sum(e["kind"] == "request" for e in prefix["events"]) + 1
    require(value["ordinal"] == ordinal and value["prompt_file"] == f"calls/{ordinal:04d}/prompt.txt", "Request ordinal/path mismatch")
    if value["purpose"] == "conversation":
        actor, reason = select_speaker(prefix)
        require(event["actor"] == actor and value["reason"] == reason, "Speaker differs from addressed scheduler")
        prompt, schema = conversation_prompt(prefix, actor, reason), MESSAGE_SCHEMA
    else:
        require(value["purpose"] == "evaluation" and event["actor"] == prefix["config"]["evaluator_id"], "Invalid expert request")
        packet = evaluation_packet(prefix, value["scenario_id"])
        require(value["packet_sha256"] == digest(packet), "Evaluation packet does not match complete evidence")
        prompt, schema = evaluation_prompt(prefix, packet), EVALUATION_SCHEMA
    bounded_prompt(prefix, prompt)
    require(value["prompt_sha256"] == text_hash(prompt) and value["schema_sha256"] == digest(schema), "Request does not contain the exact authorized full context")


def _frozen(prefix: dict, event: dict) -> None:
    from dynamic_runtime import _frozen_export
    from dynamic_state import outstanding
    value = event["payload"]
    artifact = current_artifact(prefix)
    require(event["actor"] == "user" and pending_request(prefix) is None, "Freeze requires an explicit user boundary")
    require(artifact is not None and artifact["version"] not in frozen_artifacts(prefix), "Invalid repeated artifact freeze")
    questions, objections = outstanding(prefix)
    require(set(value["accepted_risks"]) == {item["id"] for item in questions + objections}, "Unresolved risk disposition mismatch")
    require(not value["accepted_risks"] or bool(value["risk_acceptance_reason"].strip()), "Risk acceptance needs an actual reason")
    export = _frozen_export(prefix, artifact, value["accepted_risks"], value["risk_acceptance_reason"])
    require(value == {**export, "file": f"frozen/v{artifact['version']:03d}.json", "export_sha256": digest(export)}, "Frozen record differs from exact boundary state")


def _evaluation(prefix: dict, event: dict) -> None:
    from dynamic_evaluator import EVALUATION_SCHEMA, evaluation_packet, validate_evaluation
    from dynamic_runtime import validate_origin
    request = pending_request(prefix)
    require(request is not None and request["payload"]["purpose"] == "evaluation", "Evaluation lacks its expert request")
    earlier = {**prefix, "events": prefix["events"][:request["seq"] - 1]}
    packet = evaluation_packet(earlier, request["payload"]["scenario_id"])
    require(event["payload"]["packet_sha256"] == digest(packet), "Accepted expert packet identity mismatch")
    validate_evaluation(packet, {key: event["payload"][key] for key in EVALUATION_SCHEMA["required"]})
    validate_origin(prefix, event["payload"]["provenance"])


def _update(prefix: dict, event: dict) -> None:
    from dynamic_prompts import effective_case
    value = event["payload"]
    source = next((u for u in prefix["config"]["updates"] if u["id"] == value["id"]), None)
    require(source is not None and event["actor"] == "user", "Unknown scheduled user change")
    require(not any(e["kind"] == "user_update" and e["payload"]["id"] == value["id"] for e in prefix["events"]), "User change applied twice")
    require(source["phase"] == phase(prefix) and source["after_turn"] <= turns(prefix, phase(prefix)), "Premature user change")
    prior = effective_case(prefix)
    require(value == {**source, "case_version": prior["case_version"] + 1, "prior_case_sha256": digest(prior)}, "User change version mismatch")
